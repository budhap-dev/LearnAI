"""
Lesson 4.2 - Prompt patterns that work

Three patterns that survive contact with production, each shown against its naive version:
  - few-shot: show examples of the exact output you want, instead of describing it
  - decomposition: two small asks in sequence beat one big ask
  - constrained vocabulary: make the model choose from your labels, not invent its own

Everything else in "prompt engineering" folklore is a special case of these, or noise.

Run:  python3 m04_prompting/l02_patterns.py
"""

from __future__ import annotations

from learnai import section, title
from learnai.llm import complete

# region: tickets
TICKETS = [
    "App crashes every time I open the reports tab on Android since yesterday's update.",
    "How do I export my data to CSV? Can't find the button anywhere.",
    "You charged me for two seats but I only have one user. Please fix.",
]
LABELS = ["bug", "how-to", "billing", "feature-request", "other"]
# endregion


# region: zero-shot
def zero_shot() -> str:
    """Describe the task and hope. Fine for a demo; in production the label vocabulary
    drifts ('billing issue', 'Billing', 'payment') and the format wanders."""
    prompt = "Classify each support ticket by type. Tickets:\n" + "\n".join(f"- {t}" for t in TICKETS)
    return complete(prompt, max_tokens=200).text
# endregion


# region: few-shot
def few_shot() -> str:
    """Show the exact output. Examples communicate format, granularity and edge cases far
    more reliably than adjectives do - and they pin the label vocabulary."""
    prompt = f"""Classify each support ticket with exactly one label from: {", ".join(LABELS)}.
Answer with one line per ticket in the form  <number>. <label>  and nothing else.

Examples:
Ticket: "Login button does nothing on Safari" -> 1. bug
Ticket: "Where do I change my password?" -> 2. how-to
Ticket: "It would be great to have dark mode" -> 3. feature-request

Tickets:
""" + "\n".join(f"{i + 1}. {t}" for i, t in enumerate(TICKETS))
    return complete(prompt, max_tokens=100).text
# endregion


# region: decomposition
def one_big_ask(ticket: str) -> str:
    """One prompt that asks for everything: category, urgency, a reply, and a summary. Each
    extra job dilutes the others, and any error is buried in a wall of text."""
    return complete(
        f"For this ticket, give its category, urgency (low/medium/high), a customer reply, "
        f"and a one-line internal summary:\n\n{ticket}",
        max_tokens=350,
    ).text


def two_small_asks(ticket: str) -> tuple[str, str]:
    """Decompose: first extract the facts in a fixed shape, then use them for the reply.
    Each step is small, checkable, and can use a different model or temperature."""
    facts = complete(
        f"From this ticket, answer in exactly three lines: category, urgency (low/medium/high), "
        f"and the single concrete thing the customer wants.\n\n{ticket}",
        max_tokens=80,
    ).text
    reply = complete(
        f"Write a two-sentence reply to a customer, using only these facts:\n{facts}\n\n"
        f"Do not promise outcomes; say what happens next.",
        max_tokens=120,
    ).text
    return facts, reply
# endregion


def main() -> None:
    section("zero-shot")
    title("Zero-shot: describe the task")
    print(zero_shot())

    section("few-shot")
    title("Few-shot: show the exact output, pin the labels")
    print(few_shot())

    section("one-big-ask")
    title("One big ask")
    print(one_big_ask(TICKETS[2]))

    section("two-small-asks")
    title("Decomposed: extract facts, then act on them")
    facts, reply = two_small_asks(TICKETS[2])
    print("-- step 1: facts --")
    print(facts)
    print("-- step 2: reply, using only the facts --")
    print(reply)

    section("takeaway")
    title("What to keep")
    print("few-shot beats adjectives; a fixed label list beats 'classify'; two small asks beat one big one.")
    print("Each of these makes the output easier to CHECK - which is the point (Lesson 4.3).")


if __name__ == "__main__":
    main()
