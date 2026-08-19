"""
Lesson 6.5 - Reranking and query rewriting

First-stage retrieval (BM25, vectors, hybrid) is built for recall: find anything that might
be relevant, cheaply, across millions of chunks. Precision comes from a second stage that
looks at the query and each candidate together - a reranker - which is too slow to run over
the whole corpus but fine over twenty candidates. And when the user's question is a poor
search query (vague, chatty, multi-part), rewriting it before retrieval is the cheapest fix
of all. Both steps are model calls; both are shown here with real recordings.

Run:  python3 m06_rag/l05_rerank_rewrite.py
"""

from __future__ import annotations

import json

from learnai import section, title
from learnai.llm import complete, embed
from learnai.rag import load_handbook, top_k

# region: rewrite
def rewrite_query(user_message: str) -> str:
    """Turn a chatty message into a search query: drop the story, keep the intent and the
    nouns. One cheap call, before retrieval. (HyDE is the same idea the other way round:
    ask the model for a hypothetical answer and search with that.)"""
    r = complete(
        f"Rewrite this customer message as a short search query (under 12 words) for a support knowledge base. "
        f"Keep product terms and numbers; drop greetings and story. Reply with the query only.\n\n{user_message}",
        max_tokens=30, temperature=0,
    )
    return r.text.strip().strip('"')
# endregion


# region: rerank
RERANK_SCHEMA = {
    "type": "object",
    "properties": {"scores": {"type": "array", "items": {"type": "integer", "minimum": 0, "maximum": 3}}},
    "required": ["scores"], "additionalProperties": False,
}


def rerank(query: str, candidates: list[dict]) -> list[tuple[dict, int]]:
    """Score each candidate against the query, 0-3, in one structured call. A dedicated
    cross-encoder reranker is faster and cheaper at scale; an LLM judge is the zero-setup
    version of the same idea and good enough for a handful of candidates."""
    listing = "\n\n".join(f"[{i}] {c['title']}\n{c['text']}" for i, c in enumerate(candidates))
    r = complete(
        f"Query: {query}\n\nRate how well each passage answers the query: 3 = directly answers, 2 = partly, "
        f"1 = related only, 0 = unrelated. Return scores in passage order.\n\n{listing}",
        system="You are a precise relevance judge. Output JSON only.",
        json_schema=RERANK_SCHEMA, max_tokens=120, temperature=0,
    )
    scores = json.loads(r.text)["scores"]
    scored = list(zip(candidates, scores + [0] * (len(candidates) - len(scores))))
    scored.sort(key=lambda cs: (-cs[1], candidates.index(cs[0])))
    return scored
# endregion


def main() -> None:
    hb = load_handbook()
    docs = hb["docs"]
    vectors = embed([f"{d['title']}\n{d['text']}" for d in docs]).vectors

    message = ("Hi! Hope you're well. We signed up for the yearly thing back in early August, the team has barely "
               "used it and honestly it's not for us - is there any way to get the money back, and how long does that take?")

    section("rewrite")
    title("A chatty message becomes a search query")
    query = rewrite_query(message)
    print("message:", message[:90] + "...")
    print("query  :", query)

    section("first-stage")
    title("First stage: top-5 by vector similarity (recall)")
    qvec = embed([query]).vectors[0]
    candidates = [docs[i] for i, _ in top_k(qvec, vectors, 5)]
    for i, (idx, score) in enumerate(top_k(qvec, vectors, 5)):
        print(f"  {i + 1}. {docs[idx]['id']:18} {score:.3f}")

    section("rerank")
    title("Second stage: the reranker reads query + passage together (precision)")
    for c, s in rerank(query, candidates):
        print(f"  {s}/3  {c['id']}")
    print("keep the top 2-3 after reranking; send those to the answer step (6.6)")

    section("when")
    title("When each step pays")
    print("rewrite : chatty, multi-part or ambiguous questions; queries that quote the user's words, not the docs'")
    print("rerank  : when first-stage top-k is noisy, the corpus is large, or answers depend on fine distinctions")
    print("both add a model call of latency; measure hit@k before/after (6.7) and keep them only where they move it")


if __name__ == "__main__":
    main()
