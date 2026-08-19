"""
Small RAG helpers shared by the Module 6 examples: the fixture corpus, cosine similarity and
a brute-force top-k. Each lesson defines the thing it *teaches* in its own file (chunkers in
6.3, BM25 and rank fusion in 6.4, the judge in 6.7); these are the pieces every lesson needs.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

FIXTURES = Path(__file__).resolve().parents[2] / "shared" / "fixtures"


def load_handbook() -> dict[str, Any]:
    """The fictional support handbook: 12 short articles + 10 golden questions."""
    return json.loads((FIXTURES / "handbook.json").read_text(encoding="utf-8"))


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


def top_k(query_vec: list[float], vectors: list[list[float]], k: int) -> list[tuple[int, float]]:
    """Brute-force nearest neighbours: (index, score) for the k most similar vectors.
    Fine to thousands of vectors; an ANN index (Lesson 6.4) replaces this at scale."""
    scored = [(i, cosine(query_vec, v)) for i, v in enumerate(vectors)]
    scored.sort(key=lambda s: (-round(s[1], 6), s[0]))
    return scored[:k]
