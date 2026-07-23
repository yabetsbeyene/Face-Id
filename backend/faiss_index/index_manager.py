"""
FAISS index manager.

Stores 512-d face embeddings and does nearest-neighbor search. We use
IndexFlatIP (inner product) on L2-normalized vectors, which is mathematically
equivalent to cosine similarity search -- exact (no approximation), which is
fine at hackathon/demo scale (hundreds to low-thousands of enrolled people).
If you outgrow that, swap in IndexIVFFlat without changing the interface below.

The index only stores vectors, not names -- Postgres owns identity via the
`faiss_position` column on Person (see db/models.py). "position" here means
the row index inside this FAISS index (0, 1, 2, ...), which is what
Person.faiss_position points back to.
"""
import json
import os
import threading

import faiss
import numpy as np

from config import settings


class FaissIndexManager:
    def __init__(self, dim: int = settings.embedding_dim, path: str = settings.faiss_index_path):
        self.dim = dim
        self.path = path
        self._lock = threading.Lock()  # FAISS isn't thread-safe for concurrent writes

        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)

        if os.path.exists(path):
            self.index = faiss.read_index(path)
        else:
            self.index = faiss.IndexFlatIP(dim)

    def add(self, embedding: np.ndarray) -> int:
        """
        Adds one embedding, returns its position in the index (store this as
        Person.faiss_position in Postgres). Embedding must already be
        L2-normalized (FaceEmbedder.embed() does this).
        """
        with self._lock:
            vec = embedding.astype("float32").reshape(1, -1)
            position = self.index.ntotal
            self.index.add(vec)
            self._save()
            return position

    def search(self, embedding: np.ndarray, k: int = 5) -> tuple[list[int], list[float]]:
        """
        Returns (positions, similarity_scores) for the top-k nearest matches,
        best match first. Similarity scores are cosine similarity in [-1, 1].
        """
        if self.index.ntotal == 0:
            return [], []
        vec = embedding.astype("float32").reshape(1, -1)
        k = min(k, self.index.ntotal)
        scores, indices = self.index.search(vec, k)
        return indices[0].tolist(), scores[0].tolist()

    def best_match(self, embedding: np.ndarray) -> tuple[int | None, float]:
        """Convenience wrapper: returns (position, score) for the single best match, or (None, 0.0)."""
        positions, scores = self.search(embedding, k=1)
        if not positions:
            return None, 0.0
        return positions[0], scores[0]

    def _save(self):
        faiss.write_index(self.index, self.path)

    @property
    def total(self) -> int:
        return self.index.ntotal


_manager: FaissIndexManager | None = None


def get_index_manager() -> FaissIndexManager:
    """Lazy singleton so the index is loaded from disk once and shared across requests."""
    global _manager
    if _manager is None:
        _manager = FaissIndexManager()
    return _manager