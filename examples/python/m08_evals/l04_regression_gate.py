"""
Lesson 8.4 - Regression testing for prompts and models

A prompt change is a deploy. The eval that protects it is a test suite with one twist:
the system under test is non-deterministic (Lesson 2.7), so a single run is a coin flip,
not a measurement. The gate therefore runs every case several times, scores rates, compares
against the baseline with a threshold - and blocks the merge when the rate regresses.

Recording note: replayed calls are deterministic, so each attempt is recorded as a distinct
call (a run tag in the prompt). In production you resend the identical request and the
model's own sampling provides the variance; the gate logic is the same either way.

Run:  python3 m08_evals/l04_regression_gate.py
"""

from __future__ import annotations

import re

from learnai import section, title
from learnai.llm import complete

POLICY = (
    "Annual plans can be refunded in full within 14 days of purchase. Monthly plans are not "
    "refundable; cancelling stops the next charge. Refunds arrive within 5 business days. "
    "The billing date cannot be moved."
)

# region: golden
# Four cases from the 8.2 set, with checkable expectations (scorers from 8.3: a normalised
# phrase check plus a refusal check).
GOLDEN = [
    {"id": "g1", "q": "I bought an annual plan 10 days ago, can I get a refund?", "must": "14 day", "refusal": False},
    {"id": "g2", "q": "How long does a refund take to arrive?", "must": "5 business day", "refusal": False},
    {"id": "g3", "q": "Can I move my billing date to the 1st?", "must": "cannot", "refusal": False},
    {"id": "g4", "q": "Do you offer student discounts?", "must": None, "refusal": True},
]

PROMPTS = {
    "faq@1": "Answer the customer's question using this policy.\n\n<policy>\n{policy}\n</policy>\n\nQuestion: {q}",
    "faq@2": (
        "Answer the customer's question using ONLY this policy. If the policy does not cover the "
        "question, reply exactly NOT_COVERED.\n\n<policy>\n{policy}\n</policy>\n\nQuestion: {q}"
    ),
}
# endregion


# region: score
def score(answer: str, case: dict) -> bool:
    """8.3's ladder applied: refusal cases check the token; the rest use a normalised
    phrase check (hyphens, case, day/days)."""
    if case["refusal"]:
        return "NOT_COVERED" in answer
    canon = re.sub(r"[\s\-]+", " ", answer.lower())
    canon = re.sub(r"\bdays\b", "day", canon)
    return case["must"] in canon
# endregion


# region: run
ATTEMPTS = 3


def run_eval(prompt_id: str) -> dict[str, list[bool]]:
    """Every case, several times. The unit of measurement is the pass RATE per case, never
    a single pass - one run of a sampled system measures luck (Lesson 2.7)."""
    results: dict[str, list[bool]] = {}
    for case in GOLDEN:
        passes = []
        for attempt in range(1, ATTEMPTS + 1):
            prompt = PROMPTS[prompt_id].format(policy=POLICY, q=case["q"])
            reply = complete(f"{prompt}\n\n[eval run {attempt}]", temperature=0.7, max_tokens=150)
            passes.append(score(reply.text, case))
        results[case["id"]] = passes
    return results
# endregion


# region: gate
THRESHOLDS = {"overall_min": 0.75, "max_drop": 0.10, "refusal_min": 1.0}


def gate(baseline: dict[str, list[bool]], candidate: dict[str, list[bool]]) -> tuple[bool, list[str]]:
    """The CI decision, written down before anyone needs it (write thresholds in peacetime):
    overall rate above a floor, no big drop vs baseline, and safety-critical slices held to
    their own bar. Every number that fails is a named reason in the CI log."""
    reasons: list[str] = []
    rate = lambda r: sum(sum(v) for v in r.values()) / sum(len(v) for v in r.values())  # noqa: E731
    base_rate, cand_rate = rate(baseline), rate(candidate)
    if cand_rate < THRESHOLDS["overall_min"]:
        reasons.append(f"overall {cand_rate:.0%} below floor {THRESHOLDS['overall_min']:.0%}")
    if cand_rate < base_rate - THRESHOLDS["max_drop"]:
        reasons.append(f"dropped {base_rate - cand_rate:.0%} vs baseline (max {THRESHOLDS['max_drop']:.0%})")
    refusal_rate = sum(candidate["g4"]) / len(candidate["g4"])
    if refusal_rate < THRESHOLDS["refusal_min"]:
        reasons.append(f"refusal slice {refusal_rate:.0%} below required {THRESHOLDS['refusal_min']:.0%}")
    return (not reasons), reasons


def per_case_regressions(baseline: dict[str, list[bool]], candidate: dict[str, list[bool]]) -> list[str]:
    """The rule the aggregate gate is missing: any case that collapses (was mostly passing,
    now fails every attempt) blocks - even when the totals balance out."""
    found = []
    for cid, base in baseline.items():
        cand = candidate[cid]
        if sum(base) >= len(base) - 1 and sum(cand) == 0:
            found.append(f"{cid} regressed {sum(base)}/{len(base)} -> 0/{len(cand)}")
    return found
# endregion


def show(name: str, results: dict[str, list[bool]]) -> None:
    for cid, passes in results.items():
        marks = "".join("+" if p else "-" for p in passes)
        print(f"  {cid}  [{marks}]  {sum(passes)}/{len(passes)}")
    total = sum(sum(v) for v in results.values())
    n = sum(len(v) for v in results.values())
    print(f"  {name}: {total}/{n} = {total / n:.0%}")


def main() -> None:
    section("baseline")
    title(f"faq@1, every case x{ATTEMPTS} attempts")
    baseline = run_eval("faq@1")
    show("faq@1", baseline)

    section("candidate")
    title(f"faq@2 (adds the refusal rule), every case x{ATTEMPTS}")
    candidate = run_eval("faq@2")
    show("faq@2", candidate)

    section("verdict")
    title("The aggregate gate applies its written-down thresholds")
    ok, reasons = gate(baseline, candidate)
    for k, v in THRESHOLDS.items():
        print(f"  threshold {k:12} = {v:.0%}")
    print("  PASS - all three aggregate thresholds hold" if ok else "\n".join(f"  FAIL - {r}" for r in reasons))

    section("caught")
    title("...and yet the change broke a behaviour the aggregates cannot see")
    print("faq@2 fixed g4 (it now refuses the uncovered question) but broke g3: told to answer")
    print("ONLY from the policy, the model now over-refuses a question the policy does cover")
    print("('the billing date cannot be moved'). One failure was swapped for another; the")
    print("totals balanced at 9/12 = 9/12, and the aggregate gate waved it through.")
    per_case = per_case_regressions(baseline, candidate)
    for r in per_case:
        print(f"  BLOCK - {r}")
    print("  the per-case rule catches what totals hide: a collapsed case blocks, whatever the average")

    section("flakiness")
    title("Reading per-case marks")
    print("[+-+] FLAKY: at the edge of the distribution (2.7) - tighten the prompt for that case")
    print("      or accept the rate knowingly; never rerun-until-green.")
    print("[+++] -> [---] REGRESSION: the change broke this behaviour (g3 above).")
    print("[---] -> [+++] the fix you intended (g4 above). the gate exists so you get the second")
    print("without silently paying the first - store marks, not just rates.")

    section("when")
    title("When the gate runs")
    print("on every change to: prompt text, model or version, retrieval index, scorer, golden set")
    print("model-version bumps from the vendor run the SAME gate before adoption (9.8)")
    print("the golden set version is pinned in the report (8.2) - numbers cite the set they measured")


if __name__ == "__main__":
    main()
