"""
Lesson 8.2 - Golden sets

A golden set is the held-out set (Lesson 3.3) for an LLM feature: real cases with
known-good outcomes, curated, versioned, and run on every change. Its value comes from
where the cases come from and how they are kept - not from its size alone. This example
builds one from (fake) production traffic and shows the three disciplines: sample to match
reality, label with rules you can audit, version like code.

Deterministic on purpose: building the set involves no model at all.

Run:  python3 m08_evals/l02_golden_sets.py
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter

from learnai import section, title

# region: traffic
# A month of support questions as (question, category, frequency-weight). The mix is the
# point: billing dominates, security is rare but high-stakes - your golden set must mirror
# the first fact and refuse to let the second disappear.
TRAFFIC = (
    [("How do I get a refund on my annual plan?", "billing", 1)] * 34
    + [("Why was I charged twice this month?", "billing", 1)] * 27
    + [("Can I move the billing date?", "billing", 1)] * 14
    + [("How do I export all our data?", "how-to", 1)] * 21
    + [("How do I add a seat?", "how-to", 1)] * 18
    + [("The reports tab crashes on open", "bug", 1)] * 12
    + [("API returns 429 constantly since Monday", "bug", 1)] * 9
    + [("Does Pro include SSO?", "product", 1)] * 8
    + [("I think my API key leaked", "security", 1)] * 2
    + [("Delete my workspace and all data now", "security", 1)] * 1
)
# endregion


# region: sample
def stratified_sample(traffic: list[tuple[str, str, int]], per_stratum_min: int, total: int) -> list[tuple[str, str]]:
    """Sample proportionally to traffic, but floor every stratum: rare-but-critical
    categories (security) get seats at the table that pure proportion would deny them.
    Deterministic: sorted, seedless, reproducible in both languages."""
    by_cat: dict[str, list[str]] = {}
    for q, cat, _ in traffic:
        by_cat.setdefault(cat, [])
        if q not in by_cat[cat]:
            by_cat[cat].append(q)
    counts = Counter(cat for _, cat, _ in traffic)
    n = sum(counts.values())
    picked: list[tuple[str, str]] = []
    for cat in sorted(by_cat):
        share = max(per_stratum_min, round(total * counts[cat] / n))
        for q in by_cat[cat][:share]:
            picked.append((q, cat))
    return picked
# endregion


# region: label
# A labelled case: the question, what a correct outcome LOOKS LIKE (checkable, not a
# transcript), and bookkeeping that makes the label auditable.
def make_case(question: str, category: str, expect: dict, source: str, labeller: str) -> dict:
    case = {
        "id": hashlib.sha256(question.encode()).hexdigest()[:8],
        "question": question,
        "category": category,
        "expect": expect,          # e.g. {"must_contain": "14 days"} or {"refusal": True}
        "source": source,          # ticket id / conversation id - provenance
        "labelled_by": labeller,   # a person or a documented rule, never "the model said so"
    }
    return case


EXPECTATIONS = {
    "billing": {"must_contain": "refund|billing|invoice", "must_cite": True},
    "how-to": {"must_contain": "settings|export|seat", "must_cite": True},
    "bug": {"escalate": True},
    "product": {"must_contain": "Pro|Enterprise", "must_cite": True},
    "security": {"escalate": True, "never_contain": "here is your key"},
}
# endregion


# region: version
def freeze(cases: list[dict], version: str, note: str) -> dict:
    """A golden set is an artefact: content-hashed, versioned, with a changelog. Numbers
    from different versions are different numbers - comparing them silently is how teams
    fool themselves after 'we just added a few cases'."""
    blob = json.dumps(cases, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return {
        "version": version,
        "content_hash": hashlib.sha256(blob.encode()).hexdigest()[:12],
        "cases": len(cases),
        "note": note,
    }
# endregion


def main() -> None:
    counts = Counter(cat for _, cat, _ in TRAFFIC)

    section("traffic")
    title("What production actually asks (146 questions, one month)")
    for cat, n in counts.most_common():
        print(f"  {cat:9} {n:>3}  {'#' * (n // 3)}")

    section("naive")
    title("Naive: the five most frequent questions")
    top5 = [q for (q, _), _ in Counter((q, c) for q, c, _ in TRAFFIC).most_common(5)]
    naive_cats = Counter(next(c for q2, c, _ in TRAFFIC if q2 == q) for q in top5)
    print("  categories covered:", ", ".join(f"{c}={n}" for c, n in sorted(naive_cats.items())))
    print("  bug, product, security: 0 cases - frequency is not risk; the highest-stakes")
    print("  category vanished, and so did every case that should escalate or refuse")

    section("stratified")
    title("Stratified with a floor: mirror the mix, protect the rare")
    sample = stratified_sample(TRAFFIC, per_stratum_min=1, total=12)
    for q, cat in sample:
        print(f"  [{cat:9}] {q}")

    section("labelled")
    title("A case is a checkable expectation with provenance")
    cases = [make_case(q, cat, EXPECTATIONS[cat], f"ticket-{i + 101}", "runbook rule R7") for i, (q, cat) in enumerate(sample)]
    print(json.dumps(cases[0], indent=2, ensure_ascii=False))
    print(f"  ... {len(cases)} cases; every label traces to a source and a rule, not to a vibe")

    section("versioned")
    title("Freeze it like code")
    v1 = freeze(cases, "support-golden@1", "initial set from 2026-07 traffic")
    cases.append(make_case("Do you offer student discounts?", "product", {"refusal": True}, "ticket-201", "runbook rule R9"))
    v2 = freeze(cases, "support-golden@2", "added uncovered-question case after incident INC-88")
    for v in (v1, v2):
        print(f"  {v['version']}: {v['cases']} cases, hash {v['content_hash']}  - {v['note']}")
    print("  numbers from different versions are different numbers; the hash makes silent drift impossible")

    section("rules")
    title("The disciplines")
    print("sample from real traffic, stratified, with floors for rare-but-critical strata")
    print("labels are checkable expectations with provenance - a person or a documented rule")
    print("include the cases that SHOULD refuse or escalate, not just the happy path")
    print("version and hash the set; grow it from every incident and every eval miss")
    print("size: start ~50, grow to hundreds; below ~30 a single flaky case moves the number by 3%")


if __name__ == "__main__":
    main()
