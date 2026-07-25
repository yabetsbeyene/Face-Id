"""
Image quality assessment.

This module measures quality of a detected face and returns a QualityResult
with scores and any issues found.  Crucially, it is *informational only* for
the live stream -- the stream will still attempt recognition even when
quality.passed is False, after running image enhancement.

For *enrollment* (POST /enroll), quality.passed IS still enforced as a hard
gate: a blurry or tiny enrollment photo would permanently corrupt that
person's FAISS vector, so we reject it up-front.

Blur metric: Laplacian variance on the aligned 112x112 crop.
  - Higher  → sharper
  - < 80    → noticeably blurry (original threshold)
  - Webcam frames typically land in the 40-200 range depending on lighting

The stream now enhances the crop before embedding, so the raw blur score
seen here is the *before-enhancement* value -- the frontend also receives
the post-enhancement value (`quality_scores.blur_variance_enhanced`) so you
can compare the two.
"""
from dataclasses import dataclass, field

import cv2
import numpy as np

from config import settings
from core.face_detector import DetectedFace


@dataclass
class QualityResult:
    passed: bool
    issues: list[str] = field(default_factory=list)
    scores: dict = field(default_factory=dict)


def _blur_variance(aligned_crop: np.ndarray) -> float:
    """Laplacian variance on the aligned face crop -- low value means blurry."""
    gray = cv2.cvtColor(aligned_crop, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def assess_quality(face: DetectedFace) -> QualityResult:
    """
    Assess image quality for a detected face.

    Returns a QualityResult describing any quality issues found.  The caller
    decides whether to treat a failed result as a hard error (enrollment) or
    a soft warning (live stream).
    """
    issues = []

    blur_var = _blur_variance(face.aligned_crop)
    if blur_var < settings.min_blur_variance:
        issues.append(
            f"blurry frame (sharpness {blur_var:.0f}, target ≥ {settings.min_blur_variance:.0f})"
        )

    face_width = float(face.bbox[2] - face.bbox[0])
    if face_width < settings.min_face_width_px:
        issues.append(
            f"face too small ({face_width:.0f}px wide, need ≥ {settings.min_face_width_px}px — move closer)"
        )

    if face.confidence < settings.min_detection_confidence:
        issues.append(
            f"low detection confidence ({face.confidence:.2f}, need ≥ {settings.min_detection_confidence})"
        )

    return QualityResult(
        passed=len(issues) == 0,
        issues=issues,
        scores={
            "blur_variance": blur_var,
            "face_width_px": face_width,
            "detection_confidence": face.confidence,
        },
    )