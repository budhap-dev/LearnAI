"""
Lesson 2.5 - Context windows

The context window is one fixed token budget. The system prompt, the conversation so far,
anything you retrieve, and the answer the model writes all come out of the same number.
When they do not fit, something is dropped - and if you did not decide what, the API or
your own code decided for you, silently.

This example makes the budget explicit: measure each part, reserve room for the answer,
and apply a deliberate truncation policy when the total is too big.

Token counts here use the ~4 characters per token rule of thumb from Lesson 2.2 so the
example runs anywhere; in production, count with the model's real tokeniser.

Run:  python3 m02_llms/l05_context_window.py
"""

from __future__ import annotations

from dataclasses import dataclass, field

from learnai import section, title


# region: estimate
def estimate_tokens(text: str) -> int:
    """Rule of thumb for English prose. Replace with the model's tokeniser in real code."""
    return max(1, int(len(text) / 4 + 0.5))
# endregion


# region: budget
@dataclass
class ContextBudget:
    """Everything that has to fit in the window, and the arithmetic that says whether it does."""

    window: int                       # the model's context limit, in tokens
    system: str
    history: list[str] = field(default_factory=list)   # oldest first
    retrieved: list[str] = field(default_factory=list)  # most relevant first
    reserve_for_answer: int = 500     # never let the input squeeze the output to nothing

    def used(self) -> dict[str, int]:
        return {
            "system": estimate_tokens(self.system),
            "history": sum(estimate_tokens(m) for m in self.history),
            "retrieved": sum(estimate_tokens(d) for d in self.retrieved),
            "answer": self.reserve_for_answer,
        }

    def total(self) -> int:
        return sum(self.used().values())

    def fits(self) -> bool:
        return self.total() <= self.window
# endregion


# region: fit
def fit(budget: ContextBudget) -> list[str]:
    """Trim until it fits, in a deliberate order, and say what was dropped.

    Policy here, for a support assistant that must answer from documents: drop the oldest
    conversation turns first (keeping the last two), then the least-relevant documents.
    The system prompt and the answer reserve are never touched. A different product would
    choose differently - the point is to *choose*, and to log it.
    """
    dropped: list[str] = []
    while not budget.fits() and len(budget.history) > 2:
        dropped.append(f"history turn {len(dropped) + 1}")
        budget.history.pop(0)                     # oldest first
    while not budget.fits() and budget.retrieved:
        dropped.append(f"retrieved doc #{len(budget.retrieved)}")
        budget.retrieved.pop()                    # least relevant is last
    return dropped
# endregion


def show(budget: ContextBudget) -> None:
    used = budget.used()
    width = 40
    scale = width / max(budget.window, budget.total())     # shrink the bar if it overflows
    bar = "".join(part[0].upper() * max(1, int(n * scale + 0.5)) for part, n in used.items() if n)
    limit = int(budget.window * scale + 0.5)
    print(f"window {budget.window:>6} tokens  |{bar[:limit]:<{limit}}|{bar[limit:]}")
    for part, n in used.items():
        print(f"  {part:9} {n:>6}  {n / budget.window:6.1%}")
    print(f"  {'total':9} {budget.total():>6}  {'fits' if budget.fits() else 'does not fit'}")


def main() -> None:
    system = "You are a support assistant for Acme. Answer only from the provided documents. " * 3
    history = [f"turn {i}: " + "an earlier question and the assistant's full answer. " * 20 for i in range(1, 13)]
    docs = [f"doc {i}: " + "retrieved policy text relevant to the question. " * 40 for i in range(1, 9)]

    section("measure")
    title("Measure every part before you send anything")
    small = ContextBudget(window=4000, system=system, history=history[-2:], retrieved=docs[:2])
    show(small)

    section("overflow")
    title("The same request with more history and more retrieval no longer fits")
    big = ContextBudget(window=4000, system=system, history=list(history), retrieved=list(docs))
    show(big)

    section("fit")
    title("Apply a policy you chose - and log what was dropped")
    dropped = fit(big)
    show(big)
    print("dropped:", ", ".join(dropped))

    section("bigger-window")
    title("A bigger window is not free: cost and latency scale with tokens sent")
    for window in [4_000, 32_000, 200_000]:
        filled = int(window * 0.9 + 0.5)
        print(f"{window:>7}-token window filled to 90% = {filled:>7} input tokens per request, "
              f"x{filled / 3_600:>4.0f} the cost of the 4k case")
    print("Long context lets you send more. It does not make sending more a good idea:")
    print("every token is paid for, adds latency, and dilutes the ones that matter.")


if __name__ == "__main__":
    main()
