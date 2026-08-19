"""
Lesson 6.6 - Grounding and citations

Retrieval puts the right passages in front of the model. Grounding is making sure the answer
comes FROM them: cite every claim to a passage id, refuse when the passages do not cover
the question, and - the part people skip - check the citations in code. A citation the
model wrote is a claim; a citation your code verified against the passage is evidence.

Run:  python3 m06_rag/l06_grounding.py
"""

from __future__ import annotations

import json
import re

from learnai import section, title
from learnai.llm import complete, embed
from learnai.rag import load_handbook, top_k

# region: prompt
SYSTEM = (
    "You answer customer questions using ONLY the provided articles.\n"
    "Rules:\n"
    "1. Every sentence that states a fact ends with the id of the article it came from, in square brackets, e.g. [refunds].\n"
    "2. If the articles do not contain the answer, reply with exactly: NOT_COVERED\n"
    "3. Do not add facts, policies or numbers that are not in the articles.\n"
    "4. Be brief: two or three sentences."
)


def grounded_answer(question: str, passages: list[dict]) -> str:
    context = "\n\n".join(f"[{p['id']}] {p['title']}\n{p['text']}" for p in passages)
    r = complete(f"Articles:\n\n{context}\n\nQuestion: {question}", system=SYSTEM, max_tokens=220, temperature=0)
    return r.text.strip()
# endregion


# region: verify
CITATION = re.compile(r"\[([a-z0-9-]+)\]")


def verify(answer: str, passages: list[dict]) -> dict:
    """Code checks what the model claimed: every citation must name a passage that was
    actually provided, and every factual sentence must carry one. Numbers in the answer
    should appear in the cited passage - the cheapest faithfulness check there is."""
    provided = {p["id"]: p["text"] for p in passages}
    cited = CITATION.findall(answer)
    unknown = sorted({c for c in cited if c not in provided})
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", answer) if s.strip()]
    uncited = [s for s in sentences if not CITATION.search(s) and s != "NOT_COVERED"]
    numbers_ok = True
    for s in sentences:
        ids = CITATION.findall(s)
        for num in re.findall(r"\b\d+\b", s):
            if ids and not any(num in provided.get(i, "") for i in ids):
                numbers_ok = False
    return {"citations": len(cited), "unknown_ids": unknown, "uncited_sentences": len(uncited), "numbers_in_sources": numbers_ok}
# endregion


def main() -> None:
    hb = load_handbook()
    docs = hb["docs"]
    vectors = embed([f"{d['title']}\n{d['text']}" for d in docs]).vectors

    cases = [
        "How long do you keep our data after we cancel, and can we delete it sooner?",
        "What is the response time for a severity-1 incident on the Enterprise plan?",
        "Do you offer student discounts?",
    ]
    qvecs = embed(cases).vectors
    for q, qv in zip(cases, qvecs):
        passages = [docs[i] for i, _ in top_k(qv, vectors, 3)]
        answer = grounded_answer(q, passages)
        check = verify(answer, passages)
        section("q-" + q.split()[0].lower())
        title(f"Q: {q}")
        print("passages:", ", ".join(p["id"] for p in passages))
        print("answer  :", answer)
        print("verify  :", json.dumps(check, separators=(",", ":")))
        if answer == "NOT_COVERED":
            print("route   : escalate to a human - the refusal path worked")
        elif check["unknown_ids"] or check["uncited_sentences"] or not check["numbers_in_sources"]:
            print("route   : flag for review - a claim is not traceable to a provided passage")
        else:
            print("route   : serve, with the citations rendered as links to the articles")

    section("why")
    title("Why citations + code checks")
    print("a citation the model wrote is a claim; a citation code verified against the passage is evidence")
    print("the refusal path (NOT_COVERED) is what stops the model being helpful with facts it does not have")
    print("render citations as links: users can check, and you learn which articles answer which questions")


if __name__ == "__main__":
    main()
