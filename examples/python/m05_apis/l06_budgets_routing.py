"""
Lesson 5.6 - Token budgeting and cost control

Cost control is three habits: a budget per request (so one prompt cannot run away), a
budget per tenant or user per day (so one customer cannot run away), and routing (so a
cheap model handles what a cheap model can). None of this needs a model call - it is
arithmetic and policy that wraps the model call. The example runs a day of fake traffic
through all three.

Run:  python3 m05_apis/l06_budgets_routing.py
"""

from __future__ import annotations

from dataclasses import dataclass, field

from learnai import section, title

# region: prices
# USD per million tokens, illustrative tiers - see the model reference for real numbers.
TIERS = {
    "small": {"input": 1.00, "output": 5.00},
    "large": {"input": 5.00, "output": 25.00},
}
# endregion


# region: router
@dataclass
class Request:
    user: str
    kind: str          # classify | extract | answer | draft | reason
    input_tokens: int
    output_tokens: int


def route(req: Request) -> str:
    """A router is a rule, not a model: route by the task's shape. Classification, extraction
    and routing itself go to the small model; open judgement and multi-step work to the
    large one. Revisit the rule with the eval numbers (Lesson 8.4), never by feel."""
    if req.kind in {"classify", "extract"}:
        return "small"
    if req.kind == "answer" and req.input_tokens < 2_000:
        return "small"
    return "large"


def cost(req: Request, tier: str) -> float:
    p = TIERS[tier]
    return (req.input_tokens * p["input"] + req.output_tokens * p["output"]) / 1_000_000
# endregion


# region: budgets
PER_REQUEST_INPUT_CAP = 8_000      # tokens - beyond this, truncate or reject (Lesson 2.5)
PER_USER_DAILY_CAP_USD = 0.50      # beyond this, degrade: small model only, or queue


@dataclass
class Ledger:
    spent: dict[str, float] = field(default_factory=dict)
    decisions: list[str] = field(default_factory=list)

    def admit(self, req: Request) -> tuple[bool, str, str]:
        """Apply the budgets in order: request cap, then the user's daily cap (which may
        degrade rather than refuse), then route. Returns (allowed, tier, reason)."""
        if req.input_tokens > PER_REQUEST_INPUT_CAP:
            return False, "-", f"input {req.input_tokens} > per-request cap {PER_REQUEST_INPUT_CAP}"
        tier = route(req)
        so_far = self.spent.get(req.user, 0.0)
        if so_far >= PER_USER_DAILY_CAP_USD:
            if tier == "large":
                tier = "small"
                reason = "daily cap reached: degraded to small"
            else:
                reason = "daily cap reached: small only"
        else:
            reason = f"routed by kind={req.kind}"
        self.spent[req.user] = so_far + cost(req, tier)
        return True, tier, reason
# endregion


def traffic() -> list[Request]:
    """A fake day: one heavy user, two light ones, one oversized request."""
    reqs: list[Request] = []
    for i in range(40):
        reqs.append(Request("alice", ["classify", "extract", "answer", "reason"][i % 4], 1_500 + (i % 5) * 500, 200 + (i % 3) * 100))
    for i in range(6):
        reqs.append(Request("bob", "answer", 1_200, 250))
    reqs.append(Request("carol", "draft", 9_500, 800))
    reqs.append(Request("carol", "draft", 3_000, 800))
    return reqs


def main() -> None:
    section("routing")
    title("Route by the shape of the task, not by hope")
    sample = [Request("x", k, t, 300) for k, t in [("classify", 800), ("extract", 3_000), ("answer", 1_500), ("answer", 6_000), ("reason", 2_000)]]
    for r in sample:
        tier = route(r)
        print(f"  {r.kind:9} {r.input_tokens:>5} in -> {tier:5}  ${cost(r, tier):.4f}   (large would be ${cost(r, 'large'):.4f})")

    section("day")
    title("A day of traffic through request caps, user caps and routing")
    ledger = Ledger()
    tiers = {"small": 0, "large": 0}
    rejected = degraded = 0
    for req in traffic():
        ok, tier, reason = ledger.admit(req)
        if not ok:
            rejected += 1
            print(f"  REJECT {req.user:6} {reason}")
            continue
        tiers[tier] += 1
        if "degraded" in reason:
            degraded += 1
    print(f"  served: {tiers['small']} small, {tiers['large']} large; degraded {degraded}; rejected {rejected}")
    for user, usd in sorted(ledger.spent.items()):
        flag = "  (hit daily cap)" if usd >= PER_USER_DAILY_CAP_USD else ""
        print(f"  {user:6} ${usd:.4f}{flag}")

    section("naive")
    title("Versus everything-to-the-large-model, no caps")
    naive = sum(cost(r, "large") for r in traffic())
    actual = sum(ledger.spent.values())
    print(f"  naive   ${naive:.4f}/day")
    print(f"  policy  ${actual:.4f}/day  ({(1 - actual / naive) * 100:.0f}% less, and no user can run away)")

    section("rules")
    title("The three habits")
    print("per request: cap input tokens (truncate deliberately, Lesson 2.5) and max_tokens for output")
    print("per user/tenant/day: a ledger; degrade before you refuse; alert before you degrade")
    print("route: cheap model for cheap tasks; measure on the golden set before moving a task down a tier")


if __name__ == "__main__":
    main()
