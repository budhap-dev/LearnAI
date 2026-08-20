"""
Lesson 7.6 - Multi-agent and the human gate

Two patterns that keep bigger agent systems governable:

  * Supervisor / workers: one model call plans and routes; specialist calls (smaller
    prompts, narrower tools) do the pieces. "Multi-agent" is not exotic - it is function
    decomposition where some functions are model calls.
  * The approval gate: anything with a blast radius produces a PROPOSAL that a human
    approves or rejects. The gate is code between propose and execute - the model cannot
    talk its way through it.

The scenario: a customer email asks for two things - a billing correction (money: gated)
and a plan question (harmless: auto-serve). One recorded run drives both paths.

Run:  python3 m07_agents/l06_supervisor_gate.py
"""

from __future__ import annotations

import json

from learnai import section, title
from learnai.llm import complete

EMAIL = (
    "Subject: two things\n\n"
    "1) You charged us for 42 seats this month but we reduced to 40 before renewal - "
    "please correct the invoice (INV-2291, difference 50.00).\n"
    "2) Also, does the Pro plan include SSO, or do we need Enterprise?"
)

# region: supervisor
ROUTE_SCHEMA = {
    "type": "object",
    "properties": {"tasks": {"type": "array", "items": {
        "type": "object",
        "properties": {
            "kind": {"type": "string", "enum": ["billing_adjustment", "product_question", "other"]},
            "detail": {"type": "string"},
        },
        "required": ["kind", "detail"], "additionalProperties": False}}},
    "required": ["tasks"], "additionalProperties": False,
}


def supervise(email: str) -> list[dict]:
    """The supervisor does one thing: split the request into typed tasks. It has no tools
    and no authority - routing is the whole job, so its failure modes are small."""
    result = complete(
        f"Split this customer email into separate tasks and classify each.\n\n<email>\n{email}\n</email>",
        json_schema=ROUTE_SCHEMA, max_tokens=300,
        system="You are a triage supervisor. Extract every distinct request; invent nothing.",
    )
    return json.loads(result.text)["tasks"]
# endregion


# region: workers
HANDBOOK_SSO = "SSO is available on Pro and Enterprise. SCIM provisioning is Enterprise only."


def billing_worker(detail: str) -> dict:
    """Workers turn a task into either an answer or a proposal. This one may move money,
    so it can only ever PROPOSE - the schema has no 'execute' in it."""
    schema = {"type": "object", "properties": {
        "invoice": {"type": "string"}, "amount": {"type": "number"}, "summary": {"type": "string"}},
        "required": ["invoice", "amount", "summary"], "additionalProperties": False}
    result = complete(
        f"Draft a billing adjustment proposal from this request. Extract the invoice id and "
        f"amount exactly as stated; do not compute new figures.\n\n{detail}",
        json_schema=schema, max_tokens=200,
    )
    return json.loads(result.text)


def product_worker(detail: str) -> str:
    """No side effects, grounded in the handbook (Lesson 6.6) - safe to auto-serve."""
    result = complete(
        f"Answer from the policy only.\n\n<policy>\n{HANDBOOK_SSO}\n</policy>\n\nQuestion: {detail}",
        max_tokens=100, temperature=0.2,
    )
    return result.text.strip()
# endregion


# region: gate
APPROVAL_THRESHOLD = 0.0   # every billing adjustment is gated; thresholds are policy, in code


def gate(proposal: dict) -> dict:
    """The gate is dumb on purpose: it checks policy, presents the proposal, and waits.
    Nothing the model wrote can execute anything - approval is a different code path,
    driven by a human identity your auth system knows."""
    needs_human = proposal["amount"] > APPROVAL_THRESHOLD
    record = {"proposal": proposal, "state": "pending_approval" if needs_human else "auto_approved"}
    # In production: persist, notify, and continue only from the approval webhook. Here a
    # scripted reviewer stands in for the human so the flow is visible end to end.
    if needs_human:
        human_decision = "approve" if proposal["invoice"] == "INV-2291" and proposal["amount"] <= 50.00 else "reject"
        record["state"] = f"{human_decision}d by reviewer"
    return record
# endregion


def main() -> None:
    section("route")
    title("The supervisor splits one email into typed tasks")
    tasks = supervise(EMAIL)
    for t in tasks:
        print(f"  {t['kind']:18} {t['detail'][:76]}")

    section("workers")
    title("Each task goes to the narrowest worker that can handle it")
    outcomes = []
    for t in tasks:
        if t["kind"] == "billing_adjustment":
            proposal = billing_worker(t["detail"])
            outcomes.append(("proposal", proposal))
            print(f"  billing  -> proposal: {proposal['invoice']} amount {proposal['amount']:.2f} - {proposal['summary'][:56]}")
        elif t["kind"] == "product_question":
            answer = product_worker(t["detail"])
            outcomes.append(("answer", answer))
            print(f"  product  -> answer: {answer[:76]}")
        else:
            print(f"  other    -> route to a human unchanged")

    section("gate")
    title("Money waits at the gate; answers do not")
    for kind, payload in outcomes:
        if kind == "proposal":
            record = gate(payload)
            print(f"  {payload['invoice']}: {record['state']}")
        else:
            print(f"  product answer: served immediately")

    section("shape")
    title("Why this shape scales")
    print("supervisor: no tools, no authority - a wrong route wastes a call, never money")
    print("workers: narrow prompts, narrow schemas; each is testable alone (a golden set per worker)")
    print("gate: policy in code, driven by real auth - the model cannot approve its own proposal")
    print("handoffs are typed JSON, so every seam is loggable, replayable and evaluable")


if __name__ == "__main__":
    main()
