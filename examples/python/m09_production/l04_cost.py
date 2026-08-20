"""
Lesson 9.4 - Cost engineering

Cost is not a bill you receive; it is a number you engineer. Four levers, each independent
and each a percentage off the top: route cheap work to a cheap model, cache the stable
prompt prefix, batch anything nobody is waiting for, and distil a fine-tuned small model for
a high-volume task. This example runs one workload through all four and shows the running
total - and then shows the showback report that makes cost a team habit, not a surprise.

Deterministic arithmetic; prices are parameters (see the model reference).

Run:  python3 m09_production/l04_cost.py
"""

from __future__ import annotations

from dataclasses import dataclass

from learnai import section, title

# region: prices
# USD per million tokens - illustrative tiers, look them up in the model reference.
PRICES = {
    "large": {"in": 5.00, "in_cached": 0.50, "out": 25.00},
    "small": {"in": 1.00, "in_cached": 0.10, "out": 5.00},
    "distilled": {"in": 0.30, "in_cached": 0.03, "out": 1.50},   # your fine-tuned small model
}
BATCH_DISCOUNT = 0.5
# endregion


# region: workload
@dataclass
class Segment:
    name: str
    requests: int
    stable_in: int      # cacheable prefix tokens (system, examples)
    variable_in: int    # per-request tokens (question, retrieved)
    out: int
    kind: str           # classify | extract | answer | reason
    waiting: bool       # is a human waiting on it?


WORKLOAD = [
    Segment("triage", 200_000, 800, 400, 30, "classify", waiting=False),
    Segment("extract", 60_000, 1200, 2000, 200, "extract", waiting=False),
    Segment("chat", 120_000, 1500, 1500, 400, "answer", waiting=True),
    Segment("analysis", 8_000, 2000, 6000, 900, "reason", waiting=True),
]
# endregion


# region: cost
def cost(seg: Segment, model: str, cache_hit_rate: float, batched: bool) -> float:
    p = PRICES[model]
    cached = seg.stable_in * cache_hit_rate
    fresh_in = seg.stable_in * (1 - cache_hit_rate) + seg.variable_in
    per_req = (cached * p["in_cached"] + fresh_in * p["in"] + seg.out * p["out"]) / 1_000_000
    if batched:
        per_req *= BATCH_DISCOUNT
    return per_req * seg.requests


def route(seg: Segment) -> str:
    if seg.kind in {"classify", "extract"}:
        return "small"
    return "large"
# endregion


def main() -> None:
    section("baseline")
    title("Everything on the large model, no caching, all online")
    base = sum(cost(s, "large", 0.0, batched=False) for s in WORKLOAD)
    for s in WORKLOAD:
        print(f"  {s.name:9} ${cost(s, 'large', 0.0, False):8.2f}/day")
    print(f"  TOTAL     ${base:8.2f}/day   (${base * 30:,.0f}/month)")

    section("levers")
    title("Apply the four levers, one at a time - each a cut off the running total")
    running = base
    steps = []

    routed = sum(cost(s, route(s), 0.0, False) for s in WORKLOAD)
    steps.append(("route cheap work to a small model", routed))

    cached = sum(cost(s, route(s), 0.9, False) for s in WORKLOAD)
    steps.append(("+ cache the stable prompt prefix (90% hit)", cached))

    batched = sum(cost(s, route(s), 0.9, batched=not s.waiting) for s in WORKLOAD)
    steps.append(("+ batch what nobody is waiting for", batched))

    # distil the two highest-volume classify/extract segments onto your own small model
    def with_distill(s: Segment) -> float:
        model = "distilled" if s.kind in {"classify", "extract"} else route(s)
        return cost(s, model, 0.9, batched=not s.waiting)
    distilled = sum(with_distill(s) for s in WORKLOAD)
    steps.append(("+ distil the high-volume tasks onto a fine-tuned small model", distilled))

    for label, total in steps:
        pct = (1 - total / base) * 100
        print(f"  {label:56} ${total:8.2f}/day  ({pct:2.0f}% off)")
        running = total
    print(f"  final: ${running:.2f}/day vs ${base:.2f}/day - {(1 - running / base) * 100:.0f}% cheaper, same product")

    section("showback")
    title("Showback: cost per segment, so teams own their spend")
    for s in WORKLOAD:
        c = with_distill(s)
        per_1k = c / s.requests * 1000
        print(f"  {s.name:9} ${c:7.2f}/day  ${per_1k:.4f}/1k requests  ({s.requests:,} req)")
    print("  attribute cost to the team/feature that spends it; a number nobody owns only grows")

    section("rules")
    title("The cost engineering habits")
    print("route first: the cheapest call is on the cheapest model that passes the eval (5.6, 8.4)")
    print("cache the prefix: stable-first prompt layout turns 90% of input into cached input (5.5)")
    print("batch the unwatched: nightly, backfills, evals -> the async endpoint at a discount")
    print("distil at volume: a fine-tuned small model repays its training cost fast on hot paths (10.3)")
    print("measure per feature and alert on cost/request, not just the total - a regression is a bug")


if __name__ == "__main__":
    main()
