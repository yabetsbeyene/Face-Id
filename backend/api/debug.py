"""
GET  /debug/score  (development only)
POST /debug/score

Uploads an image and returns the raw similarity scores for the top-5
nearest FAISS matches WITHOUT applying the threshold filter.

This is purely a diagnostic tool -- use it to:
  1. See what raw cosine similarity your webcam captures score.
  2. Tune MATCH_THRESHOLD in .env to the right value for your setup.
  3. Verify that someone IS enrolled (their score should be > 0.6 for a
     clean enrollment photo).

Safe to disable in production by removing the router from main.py.
"""
import numpy as np
from fastapi import APIRouter, HTTPException, UploadFile

from core.face_detector import get_detector
from core.embedder import get_embedder
from core.image_decode import decode_image
from core.image_enhance import enhance_face_crop, blur_variance
from core.quality_check import assess_quality
from db.database import AsyncSessionLocal
from db import crud
from faiss_index.index_manager import get_index_manager

router = APIRouter()


@router.post("/score")
async def debug_score(file: UploadFile):
    """
    Upload a photo (e.g. a webcam screenshot) and get back raw similarity
    scores for the top 5 enrolled people -- no threshold applied.
    """
    raw = await file.read()
    image = decode_image(raw)
    if image is None:
        raise HTTPException(status_code=400, detail="Cannot decode image")

    detector = get_detector()
    faces = detector.detect(image)
    if not faces:
        return {
            "face_detected": False,
            "message": "No face found in the uploaded image.",
        }

    face = faces[0]
    quality = assess_quality(face)
    enhanced = enhance_face_crop(face.aligned_crop)

    blur_before = quality.scores["blur_variance"]
    blur_after  = blur_variance(enhanced)

    embedder = get_embedder()
    embedding = embedder.embed(enhanced)

    index_manager = get_index_manager()
    positions, scores = index_manager.search(embedding, k=5)

    # Look up person names for each position
    matches = []
    async with AsyncSessionLocal() as db:
        for pos, score in zip(positions, scores):
            person = await crud.get_person_by_faiss_position(db, pos)
            matches.append({
                "faiss_position": pos,
                "similarity": round(float(score), 4),
                "similarity_pct": f"{float(score)*100:.1f}%",
                "person_name": person.full_name if person else "(no record)",
                "person_code": person.person_code if person else None,
            })

    return {
        "face_detected": True,
        "detection_confidence": round(face.confidence, 3),
        "quality_ok": quality.passed,
        "quality_issues": quality.issues,
        "blur_before_enhancement": round(blur_before, 1),
        "blur_after_enhancement":  round(blur_after,  1),
        "top_matches": matches,
        "tip": (
            "The highest similarity is what you'd need MATCH_THRESHOLD to be "
            "below in order to get a recognition hit. If your own face scores "
            "< 0.5 here, try re-enrolling with a webcam photo instead of a "
            "still image."
        ),
    }
