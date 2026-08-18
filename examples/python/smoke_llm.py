"""Adapter smoke test: replays a fixture cassette. Run: python3 smoke_llm.py"""
from learnai.llm import complete

c = complete(
    "Reply with exactly: adapter smoke test ok",
    system="You are a test double. Reply with the exact text requested and nothing else.",
    max_tokens=32,
)
print(f"text={c.text!r} model={c.model} tokens={c.input_tokens}+{c.output_tokens} replayed={str(c.replayed).lower()} recorded={c.recorded_at}")
