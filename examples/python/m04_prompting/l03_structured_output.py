"""
Lesson 4.3 - Structured output

Never parse prose. Ask for a shape, have the API constrain the output to that shape, and
then validate the VALUES in code - because a schema guarantees types, not truth. This is the
single most important pattern for putting a model inside a system.

Run:  python3 m04_prompting/l03_structured_output.py
"""

from __future__ import annotations

import json
from datetime import date

from learnai import section, title
from learnai.llm import complete

# region: schema
# The shape we want. `additionalProperties: false` and `required` make it strict; the enum
# pins the vocabulary; `not_found` gives the model a first-class way to say "no".
TICKET_SCHEMA = {
    "type": "object",
    "properties": {
        "status": {"type": "string", "enum": ["found", "not_found"]},
        "category": {"type": "string", "enum": ["bug", "how-to", "billing", "feature-request", "other"]},
        "urgency": {"type": "string", "enum": ["low", "medium", "high"]},
        "product_area": {"type": "string"},
        "requested_by_date": {"type": ["string", "null"], "description": "ISO date if the customer named a deadline, else null"},
        "summary": {"type": "string", "description": "one sentence, internal"},
    },
    "required": ["status", "category", "urgency", "product_area", "requested_by_date", "summary"],
    "additionalProperties": False,
}
# endregion

EMAILS = [
    "Subject: Reports tab crash\n\nSince yesterday's Android update the reports tab crashes on open every time. "
    "We have a board meeting on 2026-09-02 and need the reports before then.",
    "Subject: Seats\n\nYou billed us for two seats this month but we only have one user. Please correct the invoice.",
    "Subject: (no subject)\n\nhello?? anyone there",
]


# region: extract
def extract(email: str) -> dict:
    """Ask for JSON that matches the schema. The API enforces the shape, so json.loads
    cannot fail and every key is present with the right type."""
    result = complete(
        f"Extract the ticket fields from this customer email. If the email contains no actionable "
        f"request, set status to not_found and fill the other fields with your best neutral guess.\n\n"
        f"<email>\n{email}\n</email>",
        system="You extract support-ticket fields. Use only what is in the email; never invent details.",
        json_schema=TICKET_SCHEMA,
        max_tokens=300,
    )
    return json.loads(result.text)
# endregion


# region: validate
def validate(ticket: dict, today: date) -> list[str]:
    """The schema checked types and enums. Code checks the VALUES: is the date a real date,
    is it in the future, is the summary usable? A schema-valid answer can still be wrong."""
    problems: list[str] = []
    d = ticket["requested_by_date"]
    if d is not None:
        try:
            when = date.fromisoformat(d)
            if when < today:
                problems.append(f"requested_by_date {d} is in the past")
        except ValueError:
            problems.append(f"requested_by_date {d} is not an ISO date")
    if len(ticket["summary"].split()) < 3:
        problems.append("summary too short to be useful")
    if ticket["status"] == "not_found" and ticket["urgency"] == "high":
        problems.append("not_found tickets should not be high urgency")
    return problems
# endregion


def main() -> None:
    today = date(2026, 8, 18)   # fixed so the recorded run is reproducible
    for i, email in enumerate(EMAILS, 1):
        section(f"email-{i}")
        title(f"Email {i}: {email.splitlines()[0]}")
        ticket = extract(email)
        for key in TICKET_SCHEMA["required"]:
            print(f"  {key:18} {json.dumps(ticket[key], ensure_ascii=False)}")
        problems = validate(ticket, today)
        if problems:
            print("  -> schema-valid but FLAGGED by value checks:", "; ".join(problems))
        if ticket["status"] == "not_found":
            print("  -> not_found: route to a human, do not create a ticket")
        elif not problems:
            print("  -> accepted: create ticket")
        else:
            print("  -> rejected: retry once with the problems fed back, then escalate")

    section("why")
    title("Why both layers")
    print("schema  : the API guarantees valid JSON, every key, right types, allowed enums - json.loads never fails")
    print("code    : checks the values mean something - real dates, sane combinations, usable text")
    print("not_found: a first-class way to say no, so the model does not invent a ticket to be helpful (Lesson 2.6)")


if __name__ == "__main__":
    main()
