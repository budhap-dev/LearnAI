"""
Lesson 4.4 - Prompts as code

A prompt that matters lives in a string somewhere, edited by whoever, with no version, no
test and no owner - until it breaks in production. Treat it like code: a template with a
version, rendered from data, with a golden test that runs on every change.

Run:  python3 m04_prompting/l04_prompts_as_code.py
"""

from __future__ import annotations

import hashlib
import json

from learnai import section, title
from learnai.llm import complete

# region: registry
# Prompts are versioned artefacts. Two versions of the same prompt: v2 fixes a real
# defect in v1 (it never told the model what to do with out-of-scope questions).
PROMPTS = {
    "faq-answer@1": {
        "system": "You answer questions about Acme's refund policy using the policy text provided.",
        "user": "Policy:\n{policy}\n\nQuestion: {question}",
    },
    "faq-answer@2": {
        "system": (
            "You answer questions about Acme's refund policy using ONLY the policy text provided. "
            "If the policy does not cover the question, reply exactly: NOT_COVERED. Keep answers under 60 words."
        ),
        "user": "<policy>\n{policy}\n</policy>\n\nQuestion: {question}",
    },
}
# endregion


# region: render
def render(prompt_id: str, **values: str) -> tuple[str, str, str]:
    """Render a versioned template. The hash of the rendered prompt is what you log with the
    request - it lets you group traces by exact prompt, and spot 'someone edited the string'."""
    spec = PROMPTS[prompt_id]
    system, user = spec["system"], spec["user"].format(**values)
    digest = hashlib.sha256((system + "\n" + user).encode("utf-8")).hexdigest()[:10]
    return system, user, digest
# endregion


POLICY = (
    "Refunds are available within 14 days of purchase for annual plans, and within 48 hours "
    "for monthly plans. Refunds are issued to the original payment method within 5 business days."
)

# region: golden
# A golden set: real questions with a checkable expectation. Not "the exact answer" (that
# varies) - a property code can check. This is a prompt's unit test.
GOLDEN = [
    {"question": "I bought an annual plan 10 days ago, can I get a refund?", "expect_contains": "14 days", "expect_not_covered": False},
    {"question": "How long does the refund take to arrive?", "expect_contains": "5 business days", "expect_not_covered": False},
    {"question": "Do you offer student discounts?", "expect_contains": None, "expect_not_covered": True},
]


def check(answer: str, case: dict) -> bool:
    if case["expect_not_covered"]:
        return "NOT_COVERED" in answer
    return case["expect_contains"].lower() in answer.lower()
# endregion


# region: run
def run_prompt(prompt_id: str) -> int:
    """Run the golden set against one prompt version and count passes."""
    passed = 0
    for case in GOLDEN:
        system, user, digest = render(prompt_id, policy=POLICY, question=case["question"])
        answer = complete(user, system=system, max_tokens=120).text
        ok = check(answer, case)
        passed += ok
        print(f"  [{'PASS' if ok else 'FAIL'}] {prompt_id} {digest}  Q: {case['question']}")
        print(f"         A: {answer.strip().splitlines()[0][:110]}")
    return passed
# endregion


def main() -> None:
    section("registry")
    title("Prompts as versioned artefacts")
    for pid, spec in PROMPTS.items():
        print(f"{pid}: system={len(spec['system'])} chars, user template={json.dumps(spec['user'])[:60]}...")

    section("v1")
    title("Golden set against faq-answer@1")
    p1 = run_prompt("faq-answer@1")
    print(f"  {p1}/{len(GOLDEN)} passed")

    section("v2")
    title("Golden set against faq-answer@2")
    p2 = run_prompt("faq-answer@2")
    print(f"  {p2}/{len(GOLDEN)} passed")

    section("verdict")
    title("The change is measured, not eyeballed")
    print(f"faq-answer@1: {p1}/{len(GOLDEN)}   faq-answer@2: {p2}/{len(GOLDEN)}")
    print("Ship the version that passes; keep both in the registry; log the prompt id + hash with")
    print("every request so an incident can be traced to the exact prompt - and rolled back like code.")


if __name__ == "__main__":
    main()
