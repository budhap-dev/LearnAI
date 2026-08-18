"""
Lesson 4.1 - Anatomy of a prompt

A prompt is not a sentence you type; it is a small structured document with parts that do
different jobs: the system prompt (who the model is and what the rules are), the user turn
(the task and its inputs), and the shape of answer you want. This example sends the same
task three ways and shows what each part changes.

The model responses below were recorded once through the llm adapter and are replayed on
every build (see examples/shared/cassettes/README.md).

Run:  python3 m04_prompting/l01_anatomy.py
"""

from __future__ import annotations

from learnai import section, title
from learnai.llm import complete

# region: task
# The same underlying task each time: a support message that needs a reply.
CUSTOMER_MESSAGE = (
    "Hi, I was charged twice for my Pro plan this month (invoices #4471 and #4472). "
    "Can you sort this out? Also is there any way to move my billing date to the 1st?"
)
# endregion


# region: bare
def bare() -> str:
    """No system prompt, no shape: just the message. The model has to guess who it is,
    who it is talking to, and what a good answer looks like."""
    return complete(CUSTOMER_MESSAGE, max_tokens=300).text
# endregion


# region: system
SYSTEM = """You are the billing support assistant for Acme, a SaaS company.
Rules:
- Be concise: at most 120 words.
- Never promise a refund; say the billing team will confirm within one business day.
- If the customer asks for something you cannot do, say so plainly and offer the nearest thing.
- Do not invent invoice numbers, dates or policies that are not in the message."""


def with_system() -> str:
    """The system prompt sets identity, rules and constraints - the part of the prompt that
    stays the same across thousands of requests, and the part you version and test."""
    return complete(CUSTOMER_MESSAGE, system=SYSTEM, max_tokens=300).text
# endregion


# region: shaped
def with_shape() -> str:
    """The user turn carries the task and its inputs, clearly labelled, plus the shape of the
    answer. Labelling the customer text as data (not instructions) is the first line of
    defence against prompt injection (Lesson 4.6)."""
    user = f"""Draft a reply to the customer message below.

<customer_message>
{CUSTOMER_MESSAGE}
</customer_message>

Reply with exactly three short paragraphs:
1. acknowledge the specific problem, quoting the invoice numbers
2. what happens next and when
3. answer the billing-date question"""
    return complete(user, system=SYSTEM, max_tokens=300).text
# endregion


def main() -> None:
    section("bare")
    title("1. Just the message")
    print(bare())

    section("system")
    title("2. Plus a system prompt: identity, rules, constraints")
    print(with_system())

    section("shaped")
    title("3. Plus a labelled task and an answer shape")
    print(with_shape())

    section("parts")
    title("What each part is for")
    print("system  - who the model is, the rules, the constraints; stable; versioned and tested")
    print("user    - the task, its inputs (labelled as data), and the shape of the answer")
    print("shape   - format, length, structure; the cheapest lever for consistency (Lesson 4.3)")
    print("Each part changed the answer above. None of them changed what the model knows.")


if __name__ == "__main__":
    main()
