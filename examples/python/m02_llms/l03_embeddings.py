"""
Lesson 2.3 - Embeddings

An embedding is a list of numbers that stands for a piece of text, built so that texts with
similar meaning end up close together. "Close" is measured with cosine similarity - the angle
between two vectors - and that one number powers search, RAG, clustering and deduplication.

Real embedding models are neural networks trained on billions of pairs. This example builds
the oldest kind - count the words that appear near each word - because it shows *why*
geometry can capture meaning: words used in similar contexts get similar vectors.

Run:  python3 m02_llms/l03_embeddings.py
"""

from __future__ import annotations

import math
from collections import Counter

from learnai import section, title

# region: corpus
CORPUS = """
the cat sat on the mat and watched the fire
the dog sat on the rug and watched the fire
the kitten chased the cat around the garden
the puppy chased the dog around the garden
the cat and the dog sleep by the fire
the server runs the code and logs every request
the browser runs the code and renders every page
the client sends a request to the server
the browser sends a request to the server
python code runs on the server and the laptop
typescript code runs in the browser and the laptop
"""
WINDOW = 2  # how many words either side count as "context"
# Function words say nothing about meaning and would swamp every vector with "the: 3".
# Real systems solve the same problem with weighting (TF-IDF, PMI) or by learning it.
STOP = {"the", "a", "on", "in", "and", "around", "every", "by", "to"}
# endregion


# region: build
def build_embeddings(text: str) -> dict[str, dict[str, float]]:
    """One sparse vector per word: how often each other word appears within WINDOW of it.

    Words that keep the same company - cat/dog, server/browser - end up with similar rows.
    A neural embedding model learns a dense 1,000-ish-dimensional version of exactly this
    idea, from vastly more text; the intuition is the same.
    """
    vectors: dict[str, Counter[str]] = {}
    for line in text.strip().splitlines():
        words = [w for w in line.split() if w not in STOP]  # drop function words first
        for i, word in enumerate(words):
            row = vectors.setdefault(word, Counter())
            for j in range(max(0, i - WINDOW), min(len(words), i + WINDOW + 1)):
                if j != i:
                    row[words[j]] += 1
    return {w: dict(v) for w, v in vectors.items()}
# endregion


# region: cosine
def cosine(a: dict[str, float], b: dict[str, float]) -> float:
    """Cosine similarity: dot product over the product of lengths = cos(angle between them).

    1.0 means the same direction, 0.0 means unrelated. Length is ignored on purpose - a
    word used twice as often should not look "more similar" to everything.
    """
    dot = sum(a[k] * b[k] for k in a.keys() & b.keys())
    norm_a = math.sqrt(sum(v * v for v in a.values()))
    norm_b = math.sqrt(sum(v * v for v in b.values()))
    return dot / (norm_a * norm_b) if norm_a and norm_b else 0.0
# endregion


# region: nearest
def nearest(query: str, vectors: dict[str, dict[str, float]], k: int = 3) -> list[tuple[str, float]]:
    """The core of every vector search: score the query against everything, take the top k.

    Real systems replace this linear scan with an approximate index (HNSW, IVF) once there
    are millions of vectors - Lesson 6.4 - but the question asked is identical.
    """
    scores = [(w, cosine(vectors[query], v)) for w, v in vectors.items() if w != query]
    scores.sort(key=lambda s: (-round(s[1], 6), s[0]))
    return scores[:k]
# endregion


def main() -> None:
    vectors = build_embeddings(CORPUS)

    section("vectors")
    title("A word's vector is the company it keeps")
    for word in ["cat", "dog", "server"]:
        row = vectors[word]
        top = sorted(row.items(), key=lambda kv: (-kv[1], kv[0]))[:5]
        print(f"{word:8} -> {', '.join(f'{k}:{v}' for k, v in top)}")

    section("similarity")
    title("Cosine similarity: same neighbourhood, similar vector")
    for a, b in [("cat", "dog"), ("cat", "kitten"), ("server", "browser"), ("cat", "server")]:
        print(f"cos({a}, {b}) = {cosine(vectors[a], vectors[b]):.2f}")

    section("nearest")
    title("Nearest neighbours - the primitive behind semantic search and RAG")
    for query in ["cat", "server", "python"]:
        hits = ", ".join(f"{w} ({s:.2f})" for w, s in nearest(query, vectors))
        print(f"{query:8} -> {hits}")

    section("limits")
    title("What similarity does NOT mean")
    print(f"cos(cat, chased) = {cosine(vectors['cat'], vectors['chased']):.2f}  "
          f"vs  cos(cat, dog) = {cosine(vectors['cat'], vectors['dog']):.2f}")
    print("A verb is as 'close' to cat as another animal is. Embeddings capture 'used in")
    print("similar contexts' - often meaning, sometimes just topic or grammar. A similarity")
    print("score is a ranking signal, never a fact check.")


if __name__ == "__main__":
    main()
