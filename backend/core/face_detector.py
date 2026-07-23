"""
Face detection + alignment.

Uses InsightFace's RetinaFace detector to find faces (bounding box + 5 landmarks),
then aligns each detected face into a normalized 112x112 crop ready for the
embedding model.
"""
from dataclasses import dataclass

import numpy as np
from insightface.app import FaceAnalysis
from insightface.utils import face_align


@dataclass
class DetectedFace:
    bbox: np.ndarray          # [x1, y1, x2, y2]
    landmarks: np.ndarray     # 5x2 keypoints (eyes, nose, mouth corners)
    confidence: float
    aligned_crop: np.ndarray  # 112x112x3 BGR, ready for the embedding model


class FaceDetector:
    def __init__(self, det_size: tuple[int, int] = (640, 640), ctx_id: int = -1):
        """
        ctx_id: -1 for CPU, 0+ for GPU device index.
        First run downloads the buffalo_l model pack (~280MB) to ~/.insightface.
        """
        self.app = FaceAnalysis(name="buffalo_l", allowed_modules=["detection"])
        self.app.prepare(ctx_id=ctx_id, det_size=det_size)

    def detect(self, image: np.ndarray) -> list[DetectedFace]:
        """
        image: BGR numpy array (as read by cv2, or decoded from a webcam frame).
        Returns one DetectedFace per face found, largest-first (largest face is
        usually the person actually facing the camera in an access-control setup).
        """
        faces = self.app.get(image)
        results = []
        for f in faces:
            aligned = face_align.norm_crop(image, landmark=f.kps, image_size=112)
            results.append(
                DetectedFace(
                    bbox=f.bbox,
                    landmarks=f.kps,
                    confidence=float(f.det_score),
                    aligned_crop=aligned,
                )
            )
        results.sort(
            key=lambda d: (d.bbox[2] - d.bbox[0]) * (d.bbox[3] - d.bbox[1]),
            reverse=True,
        )
        return results


_detector: FaceDetector | None = None


def get_detector() -> FaceDetector:
    """Lazy singleton -- the detection model is expensive to load, so do it once."""
    global _detector
    if _detector is None:
        _detector = FaceDetector()
    return _detector