"""
Lesson 11.4 - Frameworks and the ecosystem

A framework (LangChain, LlamaIndex, Semantic Kernel, DSPy, ...) is a composition layer: it
packages the plumbing you would otherwise write - prompt templating, retry-and-parse, tool
orchestration, memory, tracing - behind named abstractions. That is genuinely useful, and it
is also thin: everything it does, you can do with the primitives from Modules 4-9. This example
builds a tiny "framework" (a Chain of steps), runs a task through it, then does the SAME task
with raw primitives to identical output - so you can see exactly what the abstraction buys, and
that you can always drop below it or leave it.

Deterministic: the "model" is a stub, so the framework mechanics are the whole show.

Run:  python3 m11_lifecycle/l04_frameworks.py
"""

from __future__ import annotations

import json
from collections.abc import Callable

from learnai import section, title


def show(x: object) -> str:
    """Render a value for output identically in Python and TypeScript: strings raw, objects as
    compact key-sorted JSON. Keeps the twin examples byte-identical."""
    return x if isinstance(x, str) else json.dumps(x, sort_keys=True, separators=(",", ":"))

# region: model
# A stub stand-in for a real model call (Module 5). It answers the classify task, but - like a
# real model - it wraps the JSON in a markdown fence and some chatter, so SOMETHING has to parse
# it. That parsing is one of the things a framework abstracts.
def fake_model(prompt: str) -> str:
    if "URGENT" in prompt:
        return "Sure! Here you go:\n```json\n{\"category\": \"billing\", \"priority\": \"high\"}\n```\nHope that helps!"
    return "```json\n{\"category\": \"general\", \"priority\": \"low\"}\n```"
# endregion


# region: primitives
# The primitives you already have from Modules 4-9: a prompt template, a model call, a JSON
# extractor, a schema check. Nothing framework-specific.
def render(template: str, **vars: str) -> str:
    return template.format(**vars)


def extract_json(text: str) -> dict:
    """Pull the JSON out of a fenced/chatty response - the un-glamorous glue a framework hides."""
    start, end = text.find("{"), text.rfind("}")
    return json.loads(text[start : end + 1])


def validate(obj: dict, required: list[str]) -> dict:
    missing = [k for k in required if k not in obj]
    if missing:
        raise ValueError(f"missing keys: {missing}")
    return obj
# endregion


# region: framework
# A minimal "framework": a Chain is just an ordered list of named steps, each a function of the
# previous result. This is the essence of what the big libraries generalise - composition, plus
# a place to hang cross-cutting concerns like tracing.
class Chain:
    def __init__(self, trace: bool = False) -> None:
        self.steps: list[tuple[str, Callable[[object], object]]] = []
        self.trace = trace

    def step(self, name: str, fn: Callable[[object], object]) -> "Chain":
        self.steps.append((name, fn))
        return self

    def run(self, x: object) -> object:
        for name, fn in self.steps:
            x = fn(x)
            if self.trace:
                print(f"    [trace] {name} -> {show(x)}")
        return x
# endregion


def classify_with_framework(note: str) -> dict:
    """The task expressed declaratively: four named steps, composed. Concise, and you get tracing
    for free - but the steps are the SAME primitives, just wrapped."""
    template = "Classify this note as JSON with category and priority.\nNote: {note}"
    return (
        Chain(trace=True)
        .step("render", lambda n: render(template, note=n))
        .step("call", fake_model)
        .step("parse", extract_json)
        .step("validate", lambda o: validate(o, ["category", "priority"]))
        .run(note)
    )


def classify_raw(note: str) -> dict:
    """The identical task with no framework: the four steps inline. More lines, zero indirection,
    nothing to learn or upgrade. This is what the Chain compiles down to."""
    template = "Classify this note as JSON with category and priority.\nNote: {note}"
    prompt = render(template, note=note)
    reply = fake_model(prompt)
    obj = extract_json(reply)
    return validate(obj, ["category", "priority"])


def main() -> None:
    note = "URGENT: charged twice for my subscription this month"

    section("framework")
    title("The task through a tiny framework (a Chain of named steps)")
    result_fw = classify_with_framework(note)
    print(f"  result: {show(result_fw)}")

    section("raw")
    title("The identical task with raw primitives - no framework")
    result_raw = classify_raw(note)
    print(f"  result: {show(result_raw)}")
    print(f"  same output as the framework: {result_fw == result_raw}")

    section("abstracts")
    title("What a framework actually abstracts")
    print("prompt templating      - render(template, **vars)         (Module 4)")
    print("call + retry + parse   - the glue around one model call   (Module 5)")
    print("tool orchestration     - the observe/act loop             (Module 7)")
    print("memory & retrieval     - history and RAG wiring           (Modules 6, 7)")
    print("tracing & callbacks    - the cross-cutting hooks           (Module 5.7)")
    print("...each is a few lines of the primitives you already have; the framework packages them")

    section("choose")
    title("When a framework helps - and when it gets in the way")
    print("HELPS:  a fast start, standard patterns, integrations you'd otherwise write and maintain")
    print("HURTS:  a leaky abstraction over a thing you must debug; version churn; hidden prompts")
    print("        and hidden costs; a ceiling when your case is not the one it was designed for")
    print("the test: can you see and control the exact prompt, the exact tokens, and the exact")
    print("          control flow? if the framework hides those, you will fight it in production")

    section("leave")
    title("How to leave one (so you always can)")
    print("keep DOMAIN logic framework-free - the framework calls your code, not the reverse")
    print("wrap model access behind YOUR adapter seam (the llm module) - swap providers or libs there")
    print("depend on interfaces you own, not the framework's types, at your module boundaries")
    print("the framework should be a dependency you can delete in a day, not the shape of your system")


if __name__ == "__main__":
    main()
