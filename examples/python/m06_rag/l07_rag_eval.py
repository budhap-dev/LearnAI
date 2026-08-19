"""
Lesson 6.7 - Evaluating RAG

A RAG system has two places to fail: retrieval (the right passage was not found) and
generation (it was found, but the answer is wrong, unsupported, or refuses when it should
not). So it needs two kinds of numbers, measured on a golden set of real questions:

  retrieval : hit@k   - is a relevant passage in the top k?
  answer    : correctness - does the answer contain what we expected? (code check)
              faithfulness - is every claim supported by the retrieved passages? (model judge)
              refusal precision - did it say NOT_COVERED exactly when it should?

This example runs the 6.2 pipeline over the handbook's golden set and prints the scorecard -
the thing you re-run on every change to chunking, retrieval, prompt or model.

Run:  python3 m06_rag/l07_rag_eval.py
"""

from __future__ import annotations

import json

from learnai import section, title
from learnai.llm import complete, embed
from learnai.rag import load_handbook, top_k

SYSTEM = ("You answer customer questions using ONLY the provided articles. Cite the article id in square brackets "
          "after each claim. If the articles do not contain the answer, reply exactly NOT_COVERED. Be brief.")


# region: pipeline
def run_pipeline(question: str, docs: list[dict], vectors: list[list[float]], qvec: list[float], k: int = 3) -> tuple[list[dict], str]:
    """The system under test: retrieve top-k, answer from them. Kept identical to 6.2 so the
    scorecard measures the system, not a demo of it."""
    passages = [docs[i] for i, _ in top_k(qvec, vectors, k)]
    context = "\n\n".join(f"[{p['id']}] {p['title']}\n{p['text']}" for p in passages)
    reply = complete(f"Articles:\n\n{context}\n\nQuestion: {question}", system=SYSTEM, max_tokens=200, temperature=0)
    return passages, reply.text.strip()
# endregion


# region: judge
JUDGE_SCHEMA = {"type": "object", "properties": {"supported": {"type": "boolean"}, "reason": {"type": "string"}},
                "required": ["supported", "reason"], "additionalProperties": False}


def faithful(answer: str, passages: list[dict]) -> bool:
    """LLM-as-judge for faithfulness: given the passages and the answer, is every factual
    claim supported by the passages? A model grading a model - useful, and biased in ways
    Lesson 8.3 covers, so keep the rubric narrow and spot-check the judge."""
    context = "\n\n".join(f"[{p['id']}] {p['text']}" for p in passages)
    r = complete(
        f"Passages:\n\n{context}\n\nAnswer:\n{answer}\n\nIs every factual claim in the answer supported by the passages? "
        f"Ignore phrasing; flag any number, policy or step that is not in the passages.",
        system="You are a strict grader. JSON only.", json_schema=JUDGE_SCHEMA, max_tokens=120, temperature=0,
    )
    return bool(json.loads(r.text)["supported"])
# endregion


# region: scorecard
def scorecard(hb: dict, k: int = 3) -> dict:
    docs, golden = hb["docs"], hb["golden"]
    vectors = embed([f"{d['title']}\n{d['text']}" for d in docs]).vectors
    qvecs = embed([g["question"] for g in golden]).vectors
    rows = []
    for g, qv in zip(golden, qvecs):
        passages, answer = run_pipeline(g["question"], docs, vectors, qv, k)
        retrieved = {p["id"] for p in passages}
        should_refuse = not g["relevant"]
        refused = answer.strip() == "NOT_COVERED"
        row = {
            "id": g["id"],
            "hit": bool(retrieved & set(g["relevant"])) if g["relevant"] else None,
            "correct": (g["expect"].lower() in answer.lower()) if not should_refuse else refused,
            "faithful": None if refused else faithful(answer, passages),
            "refused": refused, "should_refuse": should_refuse,
        }
        rows.append(row)
        print(f"  {g['id']:3} hit={'-' if row['hit'] is None else str(row['hit']).lower():5} correct={str(row['correct']).lower():5} "
              f"faithful={'-' if row['faithful'] is None else str(row['faithful']).lower():5} refused={str(refused).lower():5}  {answer[:60]!r}")
    answerable = [r for r in rows if r["hit"] is not None]
    answered = [r for r in rows if r["faithful"] is not None]
    return {
        f"hit@{k}": sum(r["hit"] for r in answerable) / len(answerable),
        "correct": sum(r["correct"] for r in rows) / len(rows),
        "faithful": sum(r["faithful"] for r in answered) / len(answered) if answered else 1.0,
        "refusal_ok": sum(r["refused"] == r["should_refuse"] for r in rows) / len(rows),
    }
# endregion


def main() -> None:
    hb = load_handbook()
    section("rows")
    title("Per-question: retrieval hit, correctness, faithfulness, refusal")
    card = scorecard(hb)

    section("scorecard")
    title("The scorecard (re-run on every change to chunking, retrieval, prompt or model)")
    for k, v in card.items():
        print(f"  {k:11} {v:.0%}")

    section("reading")
    title("How to read it")
    print("hit@k low     -> fix retrieval first (chunking 6.3, hybrid 6.4, rerank 6.5); nothing downstream can help")
    print("hit ok, correct low -> the prompt or the model: grounding rules, passage formatting, a stronger model")
    print("faithful low  -> the model is adding facts; tighten the grounding prompt, verify citations in code (6.6)")
    print("refusal wrong -> it answers uncovered questions (dangerous) or refuses covered ones (useless) - tune the rule")
    print("ten questions is a smoke test; a real golden set is hundreds, drawn from traffic (Lesson 8.2)")


if __name__ == "__main__":
    main()
