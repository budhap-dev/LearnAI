"""
Lesson 6.2 - The RAG pipeline

Retrieval-augmented generation in one file: ingest documents, embed them once, embed the
question, retrieve the nearest passages, put them in the prompt with ids, and ask the model
to answer only from them with citations. Every step is a few lines; the discipline is in
keeping them separate so each can be measured and swapped (Lessons 6.3-6.7).

The corpus is a fictional support handbook (examples/shared/fixtures/handbook.json). The
embeddings and the answer are real recordings from local models.

Run:  python3 m06_rag/l02_pipeline.py
"""

from __future__ import annotations

from learnai import section, title
from learnai.llm import complete, embed
from learnai.rag import load_handbook, top_k

# region: ingest
def ingest() -> tuple[list[dict], list[list[float]]]:
    """Ingest once: load the documents, embed each one, keep the vectors next to the text.
    In production this is a job that runs on every document change and writes to a vector
    store; here the 'store' is two parallel lists."""
    handbook = load_handbook()
    docs = handbook["docs"]
    vectors = embed([f"{d['title']}\n{d['text']}" for d in docs]).vectors
    return docs, vectors
# endregion


# region: retrieve
def retrieve(question: str, docs: list[dict], vectors: list[list[float]], k: int = 3) -> list[tuple[dict, float]]:
    """Embed the question with the SAME model, score it against every stored vector, keep
    the top k. The query vector is the only per-request embedding cost."""
    qvec = embed([question]).vectors[0]
    return [(docs[i], score) for i, score in top_k(qvec, vectors, k)]
# endregion


# region: assemble
def assemble(question: str, hits: list[tuple[dict, float]]) -> tuple[str, str]:
    """Put the passages in the prompt with stable ids, and tell the model to answer only from
    them and to cite. The ids are how citations stay checkable by code."""
    context = "\n\n".join(f"[{d['id']}] {d['title']}\n{d['text']}" for d, _ in hits)
    system = ("You answer customer questions using ONLY the provided articles. Cite the article id in "
              "square brackets after each claim, like [refunds]. If the articles do not contain the answer, "
              "reply exactly NOT_COVERED.")
    user = f"Articles:\n\n{context}\n\nQuestion: {question}"
    return system, user
# endregion


# region: answer
def answer(question: str, docs: list[dict], vectors: list[list[float]]) -> tuple[str, list[tuple[dict, float]]]:
    hits = retrieve(question, docs, vectors)
    system, user = assemble(question, hits)
    reply = complete(user, system=system, max_tokens=200, temperature=0)
    return reply.text.strip(), hits
# endregion


def main() -> None:
    docs, vectors = ingest()

    section("ingest")
    title("Ingest once: documents -> vectors")
    print(f"{len(docs)} articles embedded into {len(vectors[0])}-dimensional vectors")
    print("stored: id, title, text, vector - the vector store is just this, indexed")

    for q in ["I bought an annual plan 10 days ago - can I get my money back?",
              "What happens when we go over our API rate limit?",
              "Do you offer student discounts?"]:
        section("q-" + q.split()[0].lower().strip("?,"))
        title(f"Q: {q}")
        text, hits = answer(q, docs, vectors)
        print("retrieved:", ", ".join(f"{d['id']} ({s:.3f})" for d, s in hits))
        print("answer   :", text)

    section("shape")
    title("The pipeline, as stages you can measure and swap")
    print("ingest -> chunk (6.3) -> embed -> store/index (6.4) -> retrieve -> rerank (6.5) -> assemble -> answer + cite (6.6) -> evaluate (6.7)")
    print("the model only ever sees what retrieval put in front of it - retrieval quality IS answer quality")


if __name__ == "__main__":
    main()
