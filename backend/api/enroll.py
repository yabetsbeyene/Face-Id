"""
POST /enroll
Registers a new person: detects the largest face in the uploaded image,
embeds it, adds the vector to the FAISS index, saves the photo to disk so
the dashboard can display it, and stores the person's record (+ pointer to
the vector, + photo URL) in Postgres.
"""
import os
import uuid

import cv2
import numpy as np
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.face_detector import get_detector
from core.embedder import get_embedder
from db import crud
from db.database import get_db
from faiss_index.index_manager import get_index_manager
from schemas.person import EnrollResponse, PersonOut

router = APIRouter()

PEOPLE_PHOTOS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "people")


def _decode_image(raw: bytes) -> np.ndarray:
    arr = np.frombuffer(raw, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Could not decode image file")
    return image


def _save_photo(raw: bytes, original_filename: str | None) -> str:
    """Saves the raw uploaded bytes to disk, returns the URL path to serve it from."""
    ext = os.path.splitext(original_filename or "")[1].lower() or ".jpg"
    if ext not in (".jpg", ".jpeg", ".png", ".webp"):
        ext = ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    os.makedirs(PEOPLE_PHOTOS_DIR, exist_ok=True)
    with open(os.path.join(PEOPLE_PHOTOS_DIR, filename), "wb") as f:
        f.write(raw)
    return f"/static/people/{filename}"


@router.post("", response_model=EnrollResponse)
async def enroll_person(
    file: UploadFile,
    person_code: str = Form(...),
    full_name: str = Form(...),
    role: str | None = Form(None),
    notes: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
):
    raw = await file.read()
    image = _decode_image(raw)

    detector = get_detector()
    faces = detector.detect(image)
    if not faces:
        raise HTTPException(status_code=400, detail="No face detected in the uploaded image")

    best_face = faces[0]

    embedder = get_embedder()
    embedding = embedder.embed(best_face.aligned_crop)

    index_manager = get_index_manager()
    position = index_manager.add(embedding)

    photo_url = _save_photo(raw, file.filename)

    try:
        person = await crud.create_person(
            db,
            person_code=person_code,
            full_name=full_name,
            faiss_position=position,
            role=role,
            notes=notes,
            photo_url=photo_url,
        )
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"person_code '{person_code}' is already enrolled",
        )

    return EnrollResponse(
        person=PersonOut.model_validate(person),
        faiss_position=position,
        detection_confidence=best_face.confidence,
    )