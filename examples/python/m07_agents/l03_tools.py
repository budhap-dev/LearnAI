"""
Lesson 7.3 - Tools done well

A tool is an API whose caller is a model. That changes nothing about good API design and
raises the stakes on all of it: the arguments are untrusted input assembled by a text
predictor, possibly influenced by text an attacker wrote (Lesson 4.6). This example builds
one dangerous tool badly, attacks it, then rebuilds it well - narrow contract, validation,
least privilege, idempotency, and an audit line per call.

No model is called: the attacker here is a script standing in for "whatever the model might
emit". That is the right paranoia level - you validate as if the arguments came from the
internet, because indirectly they did.

Run:  python3 m07_agents/l03_tools.py
"""

from __future__ import annotations

from dataclasses import dataclass, field

from learnai import section, title

# region: bad
class BadRefundTool:
    """'Refund a customer' with every classic mistake: free-text amount, no cap, no
    allow-list, acts immediately, no audit trail. Fine in a demo; a headline in production."""

    def __init__(self) -> None:
        self.paid_out = 0.0

    def refund(self, order_id: str, amount: str, reason: str) -> str:
        value = float(eval(amount, {"__builtins__": {}}))  # noqa: S307 - the mistake, on purpose
        self.paid_out += value
        return f"refunded {value:.2f} on {order_id}: {reason}"
# endregion


# region: attacks
ATTACKS = [
    ("plausible over-refund", {"order_id": "ORD-1042", "amount": "915.00", "reason": "customer unhappy"}),
    ("arithmetic smuggling", {"order_id": "ORD-1042", "amount": "915.00 * 10", "reason": "loyalty bonus"}),
    ("unknown order", {"order_id": "ORD-9999; DROP TABLE orders", "amount": "50", "reason": "test"}),
    ("negative amount", {"order_id": "ORD-1042", "amount": "-500", "reason": "adjustment"}),
]
# endregion


# region: good
ORDERS = {"ORD-1042": {"total": 915.00, "already_refunded": 0.0}}
REFUND_CAP_WITHOUT_APPROVAL = 50.00


@dataclass
class Proposal:
    order_id: str
    amount: float
    reason: str
    needs_approval: bool


@dataclass
class GoodRefundTool:
    """The same capability, engineered:
    - narrow types: amount is a number, validated against the order, never evaluated
    - least privilege: the tool PROPOSES; a separate, human-gated step executes (7.6)
    - caps: anything above the threshold requires approval - policy in code, not prompt
    - idempotent: one refund per order per reason; retries are no-ops
    - audited: every call logged with its verdict, for the trace (5.7)
    """

    audit: list[str] = field(default_factory=list)
    proposed: dict[str, Proposal] = field(default_factory=dict)

    def refund(self, order_id: str, amount: float, reason: str) -> dict:
        verdict = self._validate(order_id, amount, reason)
        self.audit.append(f"refund({order_id}, {amount!r}) -> {verdict}")
        if verdict != "ok":
            return {"error": verdict}
        key = f"{order_id}:{reason}"
        if key in self.proposed:
            return {"status": "already_proposed", "key": key}  # idempotent retry
        needs_approval = amount > REFUND_CAP_WITHOUT_APPROVAL
        self.proposed[key] = Proposal(order_id, amount, reason, needs_approval)
        return {"status": "proposed", "needs_approval": needs_approval, "key": key}

    def _validate(self, order_id: str, amount: object, reason: str) -> str:
        if not isinstance(amount, (int, float)):
            return f"amount must be a number, got {type(amount).__name__}"
        order = ORDERS.get(order_id)
        if order is None:
            return f"unknown order {order_id!r}"
        if amount <= 0:
            return "amount must be positive"
        refundable = order["total"] - order["already_refunded"]
        if amount > refundable:
            return f"amount {amount:.2f} exceeds refundable {refundable:.2f}"
        if not reason.strip():
            return "reason is required"
        return "ok"
# endregion


def main() -> None:
    section("bad")
    title("The naive tool, attacked with plausible arguments")
    bad = BadRefundTool()
    for name, args in ATTACKS:
        try:
            result = bad.refund(**args)  # type: ignore[arg-type]
        except Exception as e:  # noqa: BLE001
            result = f"crashed: {e}"
        print(f"  {name:22} -> {result}")
    print(f"  total paid out by a tool that 'worked': {bad.paid_out:,.2f}")

    section("good")
    title("The same attacks against the engineered tool")
    good = GoodRefundTool()
    for name, args in ATTACKS:
        amount: object = args["amount"]
        try:
            amount = float(amount)  # the schema layer would have done this (Lesson 4.3)
        except ValueError:
            pass
        result = good.refund(str(args["order_id"]), amount, str(args["reason"]))  # type: ignore[arg-type]
        print(f"  {name:22} -> {result}")
    print("  retry of the first attack:", good.refund("ORD-1042", 915.0, "customer unhappy"))

    section("audit")
    title("Every call left a line for the trace")
    for line in good.audit:
        print("  " + line)

    section("rules")
    title("The contract checklist")
    print("narrow, typed, enumerated arguments - the schema is the first validator, never the last")
    print("validate against reality (the order), not just the type (a float)")
    print("least privilege: read tools read, write tools propose; execution is a separate, gated step")
    print("caps and policy live in code; the prompt cannot lower them")
    print("idempotent by key, so the loop's retries cannot double-act (Lesson 5.1)")
    print("every call audited - the agent's actions must be reconstructable from the trace")


if __name__ == "__main__":
    main()
