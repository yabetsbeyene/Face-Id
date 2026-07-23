"""
POST /recognize/image
One-shot recognition on a single uploaded image: detect the largest face,
embed it, search FAISS for the closest enrolled person, and look up their
record in Postgres if the similarity clears MATCH_THRESHOLD.

This is the non-streaming counterpart to api/stream.py's live webcam feed --
useful for testing the pipeline with curl/Postman before wiring up the
WebSocket + React dashboard.
"""
import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from core.face_detector import get_detector
from core.embedder import get_embedder
from db import crud
from db.database import get_db
from db.models import MatchOutcome
from faiss_index.index_manager import get_index_manager
from schemas.person import PersonOut, RecognizeResponse

router = APIRouter()


def _decode_image(raw: bytes) -> np.ndarray:
    arr = np.frombuffer(raw, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Could not decode image file")
    return image


@router.post("/image", response_model=RecognizeResponse)
async def recognize_image(file: UploadFile, db: AsyncSession = Depends(get_db)):
    image = _decode_image(await file.read())

    detector = get_detector()
    faces = detector.detect(image)
    if not faces:
        await crud.log_recognition(db, outcome=MatchOutcome.NO_MATCH)
        return RecognizeResponse(matched=False, similarity=0.0, message="No face detected")

    best_face = faces[0]

    embedder = get_embedder()
    embedding = embedder.embed(best_face.aligned_crop)

    index_manager = get_index_manager()
    position, score = index_manager.best_match(embedding)

    if position is None or score < settings.match_threshold:
        await crud.log_recognition(db, outcome=MatchOutcome.NO_MATCH, similarity_score=score)
        return RecognizeResponse(
            matched=False,
            similarity=score,
            message="No enrolled person matched closely enough",
        )

    person = await crud.get_person_by_faiss_position(db, position)
    if person is None:
        # FAISS and Postgres disagree -- shouldn't happen, but don't crash the request over it.
        await crud.log_recognition(db, outcome=MatchOutcome.NO_MATCH, similarity_score=score)
        return RecognizeResponse(
            matched=False,
            similarity=score,
            message="Matched a vector with no linked person record",
        )

    await crud.log_recognition(
        db, outcome=MatchOutcome.MATCHED, person_id=person.id, similarity_score=score
    )
    return RecognizeResponse(
        matched=True,
        person=PersonOut.model_validate(person),
        similarity=score,
        message=f"Matched {person.full_name}",
    )