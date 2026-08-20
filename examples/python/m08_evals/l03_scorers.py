"""
Lesson 8.3 - Scorers

A golden set (8.2) says what a good outcome looks like; a scorer decides whether an answer
matched it. There are four kinds, in rising cost and falling trustworthiness: exact,
normalised, code-based, and model-graded (LLM-as-judge). The rule: use the cheapest scorer
that can honestly measure the expectation, and calibrate every judge before believing it.

Three candidate answers to one question are scored by all four - including a deliberately
wrong-but-confident one - and then the judge is probed for its best-known bias (order) with
a real pairwise comparison run both ways.

Run:  python3 m08_evals/l03_scorers.py
"""

from __future__ import annotations

import json
import re

from learnai import section, title
from learnai.llm import complete

QUESTION = "I bought an annual plan 10 days ago, can I get a refund?"
POLICY = "Annual plans can be refunded in full within 14 days of purchase. Refunds are issued to the original payment method within 5 business days."

# region: candidates
# Three answers you might get from three prompt versions. C is wrong - and confident.
CANDIDATES = {
    "A_terse_right": "Yes - you're inside the 14-day window, so you can get a full refund. [refunds]",
    "B_verbose_right": (
        "Thank you for reaching out! I completely understand that circumstances change. The good news "
        "is that our policy allows full refunds on annual plans within 14 days of purchase, and since "
        "you purchased just 10 days ago, you are well within that window. Once processed, the refund "
        "will be issued to your original payment method within 5 business days. [refunds]"
    ),
    "C_confident_wrong": (
        "Unfortunately annual plans are non-refundable after 7 days, so you are outside the refund "
        "window. However, we would be happy to apply the remaining balance as credit. [refunds]"
    ),
}
# endregion


# region: cheap-scorers
def exact(answer: str, must_contain: str) -> bool:
    """The brittle baseline: is the phrase there, verbatim? Fails on '14-day' (Lesson 4.4)."""
    return must_contain in answer


def normalised(answer: str, must_contain: str) -> bool:
    """Same check after normalising case, hyphens and whitespace - fixes most brittleness
    for a few lines of code. Still string-shaped: it cannot tell 'within 14 days' from
    'not within 14 days'."""
    canon = re.sub(r"[\s\-]+", " ", answer.lower())
    return re.sub(r"[\s\-]+", " ", must_contain.lower()) in canon


def code_checks(answer: str) -> dict[str, bool]:
    """Deterministic checks on properties that matter: cites a source (6.6), does not
    contradict the policy's key number, stays short enough to read. Each is a line of code
    and catches a whole failure class."""
    return {
        "cites_source": "[refunds]" in answer,
        "no_wrong_deadline": not re.search(r"\b(7|30|60)[\s-]*days?\b", answer),
        "concise": len(answer.split()) <= 60,
    }
# endregion


# region: judge
RUBRIC_SCHEMA = {
    "type": "object",
    "properties": {
        "correct": {"type": "boolean", "description": "does the answer state the policy outcome correctly?"},
        "grounded": {"type": "boolean", "description": "does every claim match the policy text?"},
        "score": {"type": "integer", "minimum": 1, "maximum": 5},
        "reason": {"type": "string"},
    },
    "required": ["correct", "grounded", "score", "reason"],
    "additionalProperties": False,
}


def judge(answer: str) -> dict:
    """LLM-as-judge with the guard-rails that make it usable: a narrow rubric, the policy
    in the prompt (the judge must not rely on its own memory), a schema, low temperature.
    It is still a model - calibrate it against human labels before trusting it (8.2)."""
    result = complete(
        f"<policy>\n{POLICY}\n</policy>\n\nQuestion: {QUESTION}\n\nAnswer to grade:\n{answer}",
        system="You grade support answers strictly against the policy. Judge correctness of the "
               "outcome and grounding of every claim. Be terse.",
        json_schema=RUBRIC_SCHEMA, temperature=0, max_tokens=200,
    )
    return json.loads(result.text)
# endregion


# region: order-bias
def pairwise(first: str, second: str) -> str:
    """Ask which of two answers is better - the comparison every 'A vs B' eval secretly
    is. Running it in both orders exposes position bias; agreement across orders is the
    minimum bar for trusting a pairwise judge."""
    schema = {"type": "object", "properties": {"winner": {"type": "string", "enum": ["first", "second"]}},
              "required": ["winner"], "additionalProperties": False}
    result = complete(
        f"<policy>\n{POLICY}\n</policy>\n\nQuestion: {QUESTION}\n\n"
        f"First answer:\n{first}\n\nSecond answer:\n{second}\n\nWhich answers the customer better?",
        json_schema=schema, temperature=0, max_tokens=50,
    )
    return json.loads(result.text)["winner"]
# endregion


def main() -> None:
    section("cheap")
    title("Exact, normalised and code-based scorers on the three candidates")
    print(f"{'candidate':18} {'exact':>6} {'norm':>5}  cites  no-wrong-ddl  concise")
    for name, answer in CANDIDATES.items():
        checks = code_checks(answer)
        print(f"{name:18} {str(exact(answer, '14 days')):>6} {str(normalised(answer, '14 days')):>5}"
              f"  {str(checks['cites_source']):5}  {str(checks['no_wrong_deadline']):12}  {checks['concise']}")
    print("A is RIGHT and fails both string scorers: it says '14-day window', and the normaliser")
    print("handles hyphens but not day/days - normalisers are code with bugs (test them, 4.4).")
    print("C is WRONG and also fails them - but only because it never says '14 days'; a wrong answer")
    print("that quoted the phrase would pass. Only no_wrong_deadline catches the invented 7-day rule")
    print("for the right reason. String scorers measure phrasing; code checks measure properties.")

    section("judge")
    title("The judge, with the policy in its prompt")
    for name, answer in CANDIDATES.items():
        verdict = judge(answer)
        print(f"{name:18} correct={str(verdict['correct']).lower():5} grounded={str(verdict['grounded']).lower():5} "
              f"score={verdict['score']}  {verdict['reason'][:60]}")
    print("the booleans are all right - C is the only one flagged. the 1-5 score is noise: both")
    print("correct answers got 1/5. ask judges narrow yes/no questions; scalar scores need calibration")
    print("against human labels before they mean anything.")

    section("order-bias")
    title("The same pair, both orders")
    ab = pairwise(CANDIDATES["A_terse_right"], CANDIDATES["B_verbose_right"])
    ba = pairwise(CANDIDATES["B_verbose_right"], CANDIDATES["A_terse_right"])
    winner_ab = "A" if ab == "first" else "B"
    winner_ba = "B" if ba == "first" else "A"
    print(f"  A first: winner = {winner_ab}    B first: winner = {winner_ba}")
    if winner_ab == winner_ba:
        print(f"  consistent across orders (both say {winner_ab}) - this pair passes the minimum bar")
    else:
        print("  the verdict FLIPPED with the order - position bias in action; this judge cannot rank this pair")
    print("  run pairwise judges in both orders and count a win only when they agree; ties are ties")

    section("ladder")
    title("Choosing a scorer")
    print("exact        free   use for enums, ids, labels - things with one spelling")
    print("normalised   free   use for phrases; write the normaliser once, test it (4.4's brittle checker)")
    print("code checks  free   use for properties: citations, numbers, length, schema, policy rules")
    print("judge        $/slow use for meaning: correctness, grounding, tone - after calibrating on ~50")
    print("                    human-labelled answers, and re-calibrating when the judge model changes")


if __name__ == "__main__":
    main()
