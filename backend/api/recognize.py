"""
POST /recognize/image
One-shot recognition on a single uploaded image: detect the largest face,
embed it, search FAISS for the closest enrolled person,
and look up their record in Postgres if the similarity clears MATCH_THRESHOLD.
"""
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from core.face_detector import get_detector
from core.embedder import get_embedder
from core.image_decode import decode_image
from core.image_enhance import enhance_face_crop
from core.email_alerts import send_match_alert
from db import crud
from db.database import get_db
from db.models import MatchOutcome
from faiss_index.index_manager import get_index_manager
from schemas.person import PersonOut, RecognizeResponse

router = APIRouter()


def _decode_image(raw: bytes) -> np.ndarray:
    image = decode_image(raw)
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
    enhanced_crop = enhance_face_crop(best_face.aligned_crop)

    embedder = get_embedder()
    embedding = embedder.embed(enhanced_crop)

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
        await crud.log_recognition(db, outcome=MatchOutcome.NO_MATCH, similarity_score=score)
        return RecognizeResponse(
            matched=False,
            similarity=score,
            message="Matched a vector with no linked person record",
        )

    await crud.log_recognition(
        db, outcome=MatchOutcome.MATCHED, person_id=person.id, similarity_score=score
    )
    email_status = await send_match_alert(
        person_id=person.id,
        full_name=person.full_name,
        person_code=person.person_code,
        role=person.role,
        notes=person.notes,
        alert_email=person.alert_email,
        similarity=float(score),
        source="Uploaded photo",
    )
    return RecognizeResponse(
        matched=True,
        person=PersonOut.model_validate(person),
        similarity=score,
        message=f"Matched {person.full_name}",
        email_alert_status=email_status,
        email_alert_recipient=person.alert_email or settings.default_alert_email or None,
    )
