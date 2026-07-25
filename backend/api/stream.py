"""
WebSocket /ws/recognize

Live face recognition stream.  The frontend sends raw webcam frames as
binary blobs over this socket and receives a JSON result after every frame.

Key design changes vs. the original:
--------------------------------------
1.  **Enhance before embed** – every detected face crop is run through
    automatic image enhancement (CLAHE + denoise + unsharp-mask) before
    being passed to the ArcFace embedder.  This recovers signal from blurry,
    dim, or noisy webcam frames without any user action.

2.  **Quality-adaptive recognition** – quality checks no longer block the
    pipeline.  A low-quality frame is still processed and searched in FAISS;
    the quality scores are forwarded to the frontend as metadata
    (`quality_ok`, `quality_issues`, `quality_scores`) so the UI can show a
    soft warning without stopping the screening.

3.  **Hard-stop only for unusable frames** – the only hard stop remaining is
    when *no face is detected at all* (nothing to embed) or the raw frame
    bytes are undecodable.  Everything else is a best-effort attempt.

4.  **Match-change deduplication** – a MATCHED log row is still only written
    when the matched person changes from the previous frame, preventing log
    spam during continuous video.
"""

import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from config import settings
from core.face_detector import get_detector
from core.embedder import get_embedder
from core.quality_check import assess_quality
from core.image_enhance import enhance_face_crop, blur_variance
from core.email_alerts import send_match_alert
from db import crud
from db.database import AsyncSessionLocal
from db.models import MatchOutcome
from faiss_index.index_manager import get_index_manager
from schemas.person import PersonOut

router = APIRouter()


def _decode_frame(raw: bytes) -> np.ndarray | None:
    arr = np.frombuffer(raw, dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def _no_face_response(error: str | None = None) -> dict:
    return {
        "face_detected": False,
        "quality_ok": True,
        "quality_issues": [],
        "quality_scores": {},
        "enhanced": False,
        "matched": False,
        "bbox": None,
        "similarity": 0.0,
        "person": None,
        **({"error": error} if error else {}),
    }


@router.websocket("/ws/recognize")
async def recognize_stream(websocket: WebSocket):
    await websocket.accept()

    detector      = get_detector()
    embedder      = get_embedder()
    index_manager = get_index_manager()

    last_person_id: str | None = None
    last_email_status: str | None = None
    last_email_recipient: str | None = None

    try:
        while True:
            raw   = await websocket.receive_bytes()
            image = _decode_frame(raw)

            # ── Undecodable bytes ──────────────────────────────────────────
            if image is None:
                await websocket.send_json(_no_face_response(error="undecodable frame"))
                continue

            # ── Face detection ─────────────────────────────────────────────
            faces = detector.detect(image)
            if not faces:
                last_person_id = None
                last_email_status = None
                last_email_recipient = None
                await websocket.send_json(_no_face_response())
                continue

            best_face = faces[0]
            bbox = [float(x) for x in best_face.bbox]

            # ── Quality assessment (informational only — no hard block) ────
            quality = assess_quality(best_face)

            # ── Image enhancement ──────────────────────────────────────────
            # Always enhance. If the crop was already sharp the enhancement
            # is nearly a no-op; if it was blurry/dim it meaningfully helps.
            enhanced_crop = enhance_face_crop(
                best_face.aligned_crop,
                denoise=True,
                sharpen=True,
                equalise=True,
            )

            # After enhancement, measure sharpness again so the frontend can
            # display the "after" value to the user if needed.
            post_blur = blur_variance(enhanced_crop)
            quality.scores["blur_variance_enhanced"] = post_blur

            # ── Embed → FAISS search ───────────────────────────────────────
            embedding = embedder.embed(enhanced_crop)
            position, score = index_manager.best_match(embedding)

            if position is None or score < settings.match_threshold:
                last_person_id = None
                last_email_status = None
                last_email_recipient = None
                await websocket.send_json({
                    "face_detected": True,
                    "quality_ok": quality.passed,
                    "quality_issues": quality.issues,
                    "quality_scores": quality.scores,
                    "enhanced": True,
                    "matched": False,
                    "bbox": bbox,
                    "similarity": float(score),
                    "person": None,
                })
                continue

            # ── Person lookup + dedup logging ──────────────────────────────
            async with AsyncSessionLocal() as db:
                person = await crud.get_person_by_faiss_position(db, position)
                if person is None:
                    last_person_id = None
                    await websocket.send_json({
                        "face_detected": True,
                        "quality_ok": quality.passed,
                        "quality_issues": quality.issues,
                        "quality_scores": quality.scores,
                        "enhanced": True,
                        "matched": False,
                        "bbox": bbox,
                        "similarity": float(score),
                        "person": None,
                    })
                    continue

                # Log only on person-change to avoid flooding the log table.
                if person.id != last_person_id:
                    await crud.log_recognition(
                        db,
                        outcome=MatchOutcome.MATCHED,
                        person_id=person.id,
                        similarity_score=float(score),
                    )
                    last_email_status = await send_match_alert(
                        person_id=person.id,
                        full_name=person.full_name,
                        person_code=person.person_code,
                        role=person.role,
                        notes=person.notes,
                        alert_email=person.alert_email,
                        similarity=float(score),
                        source="Live camera",
                    )
                    last_email_recipient = (
                        person.alert_email or settings.default_alert_email or None
                    )
                    last_person_id = person.id

            await websocket.send_json({
                "face_detected": True,
                "quality_ok": quality.passed,
                "quality_issues": quality.issues,
                "quality_scores": quality.scores,
                "enhanced": True,
                "matched": True,
                "bbox": bbox,
                "similarity": float(score),
                "person": PersonOut.model_validate(person).model_dump(mode="json"),
                "email_alert_status": last_email_status,
                "email_alert_recipient": last_email_recipient,
            })

    except WebSocketDisconnect:
        pass
