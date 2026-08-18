"""
Lesson 4.5 - Reasoning models and thinking budgets

Newer models can "think" before they answer - spend tokens working through the problem -
and expose a dial for how hard. More thinking helps on genuinely multi-step problems, costs
tokens and latency, and does nothing for tasks that were never about reasoning. The way to
find out which you have is to measure.

Run:  python3 m04_prompting/l05_reasoning.py
"""

from __future__ import annotations

from learnai import section, title
from learnai.llm import complete

# region: task
# A small scheduling puzzle with one checkable answer, and a lookup that needs no thought.
PUZZLE = """Four deploys must run in sequence in one maintenance window: API, DB, Web, Worker.
Constraints:
- DB must run before API and before Worker.
- Web must run immediately after API.
- Worker cannot be last.
List the only valid order, comma-separated, and nothing else."""
PUZZLE_ANSWER = "DB, Worker, API, Web"

LOOKUP = "What is the capital of Portugal? Answer with the city name only."
LOOKUP_ANSWER = "Lisbon"
# endregion


# region: run
def attempt(task: str, effort: str) -> tuple[str, int]:
    """Same task, different thinking effort. Output tokens include the thinking the model did."""
    result = complete(task, effort=effort, max_tokens=4000)
    return result.text.strip(), result.output_tokens
# endregion


def main() -> None:
    section("puzzle")
    title("A multi-step puzzle at low and high effort")
    for effort in ("low", "high"):
        answer, out_tokens = attempt(PUZZLE, effort)
        ok = answer.replace(" ", "").lower() == PUZZLE_ANSWER.replace(" ", "").lower()
        print(f"  effort={effort:<4}  output tokens={out_tokens:>5}  answer={answer!s:<28} {'correct' if ok else 'WRONG'}")

    section("lookup")
    title("A lookup that needs no reasoning, at the same two settings")
    for effort in ("low", "high"):
        answer, out_tokens = attempt(LOOKUP, effort)
        ok = LOOKUP_ANSWER.lower() in answer.lower()
        print(f"  effort={effort:<4}  output tokens={out_tokens:>5}  answer={answer!s:<28} {'correct' if ok else 'WRONG'}")

    section("takeaway")
    title("Measure where thinking pays")
    print("Thinking tokens are billed as output. Where the task is genuinely multi-step they buy accuracy;")
    print("where it is a lookup or a transform they buy nothing but latency and cost. Route by task,")
    print("set effort per prompt, and verify the answer in code either way - reasoning text is still text.")


if __name__ == "__main__":
    main()
