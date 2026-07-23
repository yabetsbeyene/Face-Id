"""
WebSocket /ws/recognize

Live counterpart to POST /recognize/image: the frontend streams webcam
frames over this socket instead of uploading one image at a time, and gets
a recognition result back after each frame.

Protocol (per frame):
  Client -> server: binary WebSocket message, one JPEG/PNG-encoded frame.
  Server -> client: JSON text message:
    {
      "face_detected": bool,
      "matched": bool,
      "bbox": [x1, y1, x2, y2] | null,
      "similarity": float,
      "person": {...} | null
    }

Logging behavior: a MATCHED event is logged only when the matched person
*changes* from the previous frame (i.e. once per "arrival", not once per
frame) -- otherwise a person standing in frame for 10 seconds at 20fps
would write ~200 rows to Postgres. NO_MATCH frames are never logged; an
empty hallway produces no-match constantly and isn't worth recording.
"""
import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from config import settings
from core.face_detector import get_detector
from core.embedder import get_embedder
from db import crud
from db.database import AsyncSessionLocal
from db.models import MatchOutcome
from faiss_index.index_manager import get_index_manager
from schemas.person import PersonOut

router = APIRouter()


def _decode_frame(raw: bytes) -> np.ndarray | None:
    arr = np.frombuffer(raw, dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


@router.websocket("/ws/recognize")
async def recognize_stream(websocket: WebSocket):
    await websocket.accept()

    detector = get_detector()
    embedder = get_embedder()
    index_manager = get_index_manager()

    last_person_id: str | None = None  # de-dupes log writes across consecutive frames

    try:
        while True:
            raw = await websocket.receive_bytes()
            image = _decode_frame(raw)

            if image is None:
                await websocket.send_json({
                    "face_detected": False, "matched": False, "bbox": None,
                    "similarity": 0.0, "person": None, "error": "undecodable frame",
                })
                continue

            faces = detector.detect(image)
            if not faces:
                last_person_id = None
                await websocket.send_json({
                    "face_detected": False, "matched": False, "bbox": None,
                    "similarity": 0.0, "person": None,
                })
                continue

            best_face = faces[0]
            embedding = embedder.embed(best_face.aligned_crop)
            position, score = index_manager.best_match(embedding)
            bbox = [float(x) for x in best_face.bbox]

            if position is None or score < settings.match_threshold:
                last_person_id = None
                await websocket.send_json({
                    "face_detected": True, "matched": False, "bbox": bbox,
                    "similarity": float(score), "person": None,
                })
                continue

            async with AsyncSessionLocal() as db:
                person = await crud.get_person_by_faiss_position(db, position)
                if person is None:
                    last_person_id = None
                    await websocket.send_json({
                        "face_detected": True, "matched": False, "bbox": bbox,
                        "similarity": float(score), "person": None,
                    })
                    continue

                if person.id != last_person_id:
                    await crud.log_recognition(
                        db, outcome=MatchOutcome.MATCHED,
                        person_id=person.id, similarity_score=float(score),
                    )
                    last_person_id = person.id

            await websocket.send_json({
                "face_detected": True,
                "matched": True,
                "bbox": bbox,
                "similarity": float(score),
                "person": PersonOut.model_validate(person).model_dump(mode="json"),
            })

    except WebSocketDisconnect:
        pass