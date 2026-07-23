"""
Face embedding.

Takes an aligned 112x112 face crop (from face_detector.py) and produces a
512-dimensional, L2-normalized embedding using InsightFace's ArcFace
recognition model.

Note: we load the recognition ONNX model directly through `model_zoo`
instead of via `FaceAnalysis(allowed_modules=["recognition"])`. InsightFace's
FaceAnalysis always requires a "detection" module to be present internally
(it asserts on this), so requesting recognition alone throws an
AssertionError. Going through model_zoo avoids loading a second, unused
detector just to satisfy that check.
"""
import glob
import os

import numpy as np
from insightface.model_zoo import model_zoo
from insightface.utils.storage import download

MODEL_PACK = "buffalo_l"
RECOGNITION_FILENAME = "w600k_r50.onnx"


def _locate_recognition_model() -> str:
    """Ensures the buffalo_l pack is downloaded, returns the recognition .onnx path."""
    root = os.path.expanduser("~/.insightface/models")
    pack_dir = os.path.join(root, MODEL_PACK)
    if not os.path.isdir(pack_dir):
        download(MODEL_PACK, root=os.path.expanduser("~/.insightface"))
    matches = glob.glob(os.path.join(pack_dir, RECOGNITION_FILENAME))
    if not matches:
        raise FileNotFoundError(
            f"Could not find {RECOGNITION_FILENAME} in {pack_dir}. "
            f"Delete ~/.insightface and retry to force a clean re-download."
        )
    return matches[0]


class FaceEmbedder:
    def __init__(self, ctx_id: int = -1):
        model_path = _locate_recognition_model()
        self.model = model_zoo.get_model(model_path)
        self.model.prepare(ctx_id=ctx_id)

    def embed(self, aligned_crop: np.ndarray) -> np.ndarray:
        """
        aligned_crop: 112x112x3 BGR image (output of FaceDetector.detect()).
        Returns a (512,) float32 vector with L2 norm == 1, so FAISS inner
        product search on it is equivalent to cosine similarity.
        """
        feat = self.model.get_feat(aligned_crop)
        feat = np.asarray(feat, dtype="float32").reshape(-1)
        norm = np.linalg.norm(feat)
        return feat / norm if norm > 0 else feat


_embedder: FaceEmbedder | None = None


def get_embedder() -> FaceEmbedder:
    """Lazy singleton -- loading the recognition model is expensive, do it once."""
    global _embedder
    if _embedder is None:
        _embedder = FaceEmbedder()
    return _embedder