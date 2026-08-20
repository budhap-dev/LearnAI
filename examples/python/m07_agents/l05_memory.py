"""
Lesson 7.5 - Memory

A model has no memory (Lesson 2.4): everything it "remembers" is text your code chose to
re-send. So memory is a data-management problem with three tiers - keep recent turns
verbatim, summarise the old ones, and promote durable facts to a store that outlives the
conversation. This example runs a long support conversation through that policy and shows
what the model actually sees at the end versus what was said.

Two model calls are recorded: the summariser compressing old turns, and the extractor
promoting facts. Both are the same complete() you already know - memory is not a feature
of the model, it is a pipeline you own.

Run:  python3 m07_agents/l05_memory.py
"""

from __future__ import annotations

import json

from learnai import section, title
from learnai.llm import complete

# region: conversation
# A 10-turn conversation. Early turns hold facts that must survive; the middle is chatter
# that should compress away; the last turns must stay verbatim.
TURNS = [
    ("user", "Hi - we're Acme Robotics, on the Pro plan, about 40 seats."),
    ("assistant", "Welcome! How can I help Acme today?"),
    ("user", "Our workspace id is WS-7731. We mainly use the API from eu-west."),
    ("assistant", "Noted. What do you need help with?"),
    ("user", "Reports were slow yesterday but it fixed itself."),
    ("assistant", "Good to hear - likely the incident we posted about."),
    ("user", "Also my name is Priya, I'm the platform lead."),
    ("assistant", "Thanks Priya."),
    ("user", "Now the real question: we keep hitting 429s on the export endpoint since Monday."),
    ("assistant", "Let me look into the rate limits for exports."),
]
KEEP_VERBATIM = 4          # the most recent turns never get compressed
# endregion


# region: summarise
def summarise(turns: list[tuple[str, str]]) -> str:
    """Compress old turns into a paragraph. This is a model call your code makes - and the
    summary is lossy by design. What it drops is gone unless the fact store caught it."""
    text = "\n".join(f"{who}: {what}" for who, what in turns)
    result = complete(
        f"Summarise this support conversation so far in 2-3 sentences for the assistant's own "
        f"context. Keep concrete identifiers and open issues; drop pleasantries.\n\n{text}",
        max_tokens=150, temperature=0.2,
    )
    return result.text.strip()
# endregion


# region: extract-facts
FACT_SCHEMA = {
    "type": "object",
    "properties": {"facts": {"type": "array", "items": {
        "type": "object",
        "properties": {"key": {"type": "string"}, "value": {"type": "string"}},
        "required": ["key", "value"], "additionalProperties": False}}},
    "required": ["facts"], "additionalProperties": False,
}


def extract_facts(turns: list[tuple[str, str]]) -> dict[str, str]:
    """Promote durable facts (account details, names, preferences) to a store keyed for
    retrieval next session. Facts persist; the conversation does not."""
    text = "\n".join(f"{who}: {what}" for who, what in turns)
    result = complete(
        f"Extract durable account facts from this conversation as key/value pairs - things that "
        f"will still be true next month (company, plan, ids, names, regions). Not the current "
        f"issue.\n\n{text}",
        json_schema=FACT_SCHEMA, max_tokens=300,
    )
    return {f["key"]: f["value"] for f in json.loads(result.text)["facts"]}
# endregion


# region: assemble
def assemble(turns: list[tuple[str, str]], facts: dict[str, str]) -> tuple[list[str], int]:
    """What the model will actually see next turn: facts block + summary of old turns +
    recent turns verbatim. Everything else is gone - deliberately."""
    old, recent = turns[:-KEEP_VERBATIM], turns[-KEEP_VERBATIM:]
    parts = ["[facts] " + "; ".join(f"{k}={v}" for k, v in sorted(facts.items()))]
    parts.append("[summary] " + summarise(old))
    parts += [f"{who}: {what}" for who, what in recent]
    original = sum(len(what.split()) for _, what in turns)
    return parts, original
# endregion


def main() -> None:
    section("facts")
    title("Durable facts, promoted out of the conversation")
    facts = extract_facts(TURNS)
    for k, v in sorted(facts.items()):
        print(f"  {k:12} = {v}")

    section("assembled")
    title("What the model sees next turn (vs 10 verbatim turns)")
    parts, original_words = assemble(TURNS, facts)
    for p in parts:
        print("  " + (p if len(p) <= 100 else p[:97] + "..."))
    compressed_words = sum(len(p.split()) for p in parts)
    print(f"  ~{original_words} words of conversation -> ~{compressed_words} words of context")

    section("tiers")
    title("The three tiers, and who owns them")
    print("recent turns   verbatim in the prompt   owned by the loop        gone at session end")
    print("older turns    summarised by a call     owned by your pipeline   lossy on purpose")
    print("durable facts  key/value store          owned by your database   survives sessions")
    print("what to forget is a product decision: summaries drop chatter; the store holds only what")
    print("you would be comfortable showing the user on a 'what we know about you' page")


if __name__ == "__main__":
    main()
