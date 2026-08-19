"""
Lesson 6.4 - Vector stores and hybrid search

Embeddings capture the gist; keyword search captures exact terms. Real questions need both:
"what does 429 mean" wants the token 429; "can I get my money back" wants the meaning of
"refund". This example scores the handbook three ways - BM25 (keywords), cosine over
embeddings (meaning), and the two fused with reciprocal rank fusion - and shows where each
wins. The vector search here is a brute-force scan; the lesson explains when an ANN index
replaces it.

Run:  python3 m06_rag/l04_hybrid_search.py
"""

from __future__ import annotations

import math
import re
from collections import Counter

from learnai import section, title
from learnai.llm import embed
from learnai.rag import cosine, load_handbook

# region: tokenise
STOP = set("a an the of for to in on at by with and or is are be do does what how i we you your our it its this that can my".split())


def tokens(text: str) -> list[str]:
    """Lower-case word tokens minus stop words. Without the stop list, 'what does a ... mean'
    outscores the one rare token that matters; real engines also stem (refund/refunds)."""
    return [t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in STOP]
# endregion


# region: bm25
class BM25:
    """The classic keyword ranking function (what Lucene/Elasticsearch/OpenSearch use by
    default). Score = for each query term: idf(term) x saturated term frequency, normalised
    for document length. Rare terms count more; repeating a term helps less and less."""

    def __init__(self, docs: list[list[str]], k1: float = 1.5, b: float = 0.75) -> None:
        self.docs = docs
        self.k1, self.b = k1, b
        self.avg_len = sum(len(d) for d in docs) / len(docs)
        df: Counter[str] = Counter()
        for d in docs:
            df.update(set(d))
        n = len(docs)
        self.idf = {t: math.log(1 + (n - f + 0.5) / (f + 0.5)) for t, f in df.items()}
        self.tf = [Counter(d) for d in docs]

    def score(self, query: list[str], i: int) -> float:
        d_len = len(self.docs[i])
        s = 0.0
        for t in query:
            if t not in self.tf[i]:
                continue
            f = self.tf[i][t]
            s += self.idf[t] * (f * (self.k1 + 1)) / (f + self.k1 * (1 - self.b + self.b * d_len / self.avg_len))
        return s

    def rank(self, query: str) -> list[tuple[int, float]]:
        q = tokens(query)
        scored = [(i, self.score(q, i)) for i in range(len(self.docs))]
        scored.sort(key=lambda s: (-round(s[1], 6), s[0]))
        return scored
# endregion


# region: rrf
def reciprocal_rank_fusion(rankings: list[list[int]], k: int = 60) -> list[tuple[int, float]]:
    """Fuse ranked lists without comparing their scores (BM25 and cosine live on different
    scales): each document gets 1/(k + rank) from every list it appears in. Robust, tunable
    with one constant, and what most hybrid-search setups actually do."""
    fused: dict[int, float] = {}
    for ranking in rankings:
        for rank, doc in enumerate(ranking, 1):
            fused[doc] = fused.get(doc, 0.0) + 1.0 / (k + rank)
    return sorted(fused.items(), key=lambda kv: (-round(kv[1], 9), kv[0]))
# endregion


def main() -> None:
    hb = load_handbook()
    docs = hb["docs"]
    ids = [d["id"] for d in docs]
    corpus_tokens = [tokens(f"{d['title']} {d['text']}") for d in docs]
    bm25 = BM25(corpus_tokens)
    vectors = embed([f"{d['title']}\n{d['text']}" for d in docs]).vectors

    queries = [
        ("exact term", "what does HTTP 429 mean"),
        ("paraphrase", "how do I get my money back for the yearly subscription"),
        ("jargon", "does SCIM work for deprovisioning leavers"),
        ("mixed", "reverse-charge VAT invoice for our EU entity"),
    ]
    qvecs = embed([q for _, q in queries]).vectors

    section("ranks")
    title("Top-3 by keywords (BM25), by meaning (vectors), and fused (RRF)")
    for (kind, q), qv in zip(queries, qvecs):
        kw = [i for i, _ in bm25.rank(q)]
        vec = sorted(range(len(docs)), key=lambda i: (-round(cosine(qv, vectors[i]), 6), i))
        fused = [i for i, _ in reciprocal_rank_fusion([kw[:10], vec[:10]])]
        print(f"{kind:10} {q!r}")
        print(f"  bm25   : {', '.join(ids[i] for i in kw[:3])}")
        print(f"  vector : {', '.join(ids[i] for i in vec[:3])}")
        print(f"  hybrid : {', '.join(ids[i] for i in fused[:3])}")

    section("why")
    title("Why both")
    print("keywords win on exact tokens (error codes, product names, ids) and lose on paraphrase")
    print("vectors win on paraphrase and lose on rare exact terms the embedding model barely saw")
    print("fusion keeps the best of each without comparing incomparable scores; add metadata filters on top")

    section("scale")
    title("From a brute-force scan to an index")
    print(f"this corpus: {len(docs)} vectors x {len(vectors[0])} dims - a linear scan is instant")
    print("to ~1M vectors: pgvector (HNSW/IVF) inside the Postgres you already run")
    print("beyond, or when vectors are the product: a dedicated vector database; search engines do hybrid natively")
    print("whatever the store: same embedding model both sides, store the model version, filter by metadata first")


if __name__ == "__main__":
    main()
