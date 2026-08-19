"""
Lesson 5.7 - Observability from day one

When an LLM feature misbehaves, the question is always "what did the model actually
receive, and what did it actually say?". If you did not record that per request, you are
guessing. This example wraps the adapter in a tracer that records, for every call: a trace
id, the prompt version and hash, the model, tokens in/out and the cost, the stop reason,
whether the output passed validation, and a redacted preview - then prints the trace the
way it would land in your logging/tracing system.

Latency is the one field missing here: replayed calls have none. In production it is the
first column (Lesson 9.3).

Run:  python3 m05_apis/l07_observability.py
"""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import asdict, dataclass
from typing import Any

from learnai import section, title
from learnai.llm import complete

# region: span
@dataclass
class Span:
    trace_id: str
    step: str
    prompt_id: str
    prompt_hash: str
    model: str
    input_tokens: int
    output_tokens: int
    cost_micro_usd: int      # integer micro-dollars: exact, sortable, no float noise in logs
    stop_reason: str
    validated: bool
    output_preview: str


PRICE_IN, PRICE_OUT = 1.00, 5.00   # USD per million tokens; a parameter, not a fact
# endregion


# region: redact
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
CARD = re.compile(r"\b\d(?:[ -]?\d){12,15}\b")


def redact(text: str) -> str:
    """Logs outlive requests and have wider access. Strip the obvious PII before it lands;
    keep enough to debug. Never log the raw prompt and response into a system people
    cannot get cleared to read."""
    return CARD.sub("[card]", EMAIL.sub("[email]", text))
# endregion


# region: traced-call
def traced_complete(trace_id: str, step: str, prompt_id: str, messages, *, validate, **kwargs) -> tuple[Any, Span]:
    """One model call, one span. The prompt hash ties the span to the exact text sent (and
    to the registry entry, Lesson 4.4); `validated` says whether the output was usable -
    which is the number you alert on, not the error rate."""
    prompt_hash = hashlib.sha256(json.dumps(messages, sort_keys=True).encode()).hexdigest()[:10]
    reply = complete(messages, **kwargs)
    ok = validate(reply.text)
    span = Span(
        trace_id=trace_id, step=step, prompt_id=prompt_id, prompt_hash=prompt_hash, model=reply.model,
        input_tokens=reply.input_tokens, output_tokens=reply.output_tokens,
        cost_micro_usd=round(reply.input_tokens * PRICE_IN + reply.output_tokens * PRICE_OUT),
        stop_reason=reply.stop_reason, validated=ok,
        output_preview=redact(reply.text.strip())[:60],
    )
    return reply, span
# endregion


def main() -> None:
    trace_id = "tr-7f3a9c"
    email = "From: dana.k@example.com\nMy card 4111 1111 1111 1111 was charged twice for order ORD-1042. Please refund one charge."

    section("trace")
    title("One request, two model steps, one trace")
    spans: list[Span] = []
    r1, s1 = traced_complete(
        trace_id, "classify", "ticket-classify@3",
        f"Classify this support email as exactly one of: billing, bug, how-to, other. Reply with the label only.\n\n{email}",
        validate=lambda t: t.strip().lower() in {"billing", "bug", "how-to", "other"}, max_tokens=10,
    )
    spans.append(s1)
    r2, s2 = traced_complete(
        trace_id, "draft-reply", "ticket-reply@5",
        f"Write a two-sentence reply acknowledging this {r1.text.strip().lower()} issue and saying a human will follow up within one business day. Do not promise a refund.\n\n{email}",
        validate=lambda t: "refund" not in t.lower() or "follow up" in t.lower(), max_tokens=120,
    )
    spans.append(s2)
    for s in spans:
        print(json.dumps(asdict(s), ensure_ascii=False, separators=(",", ":")))

    section("aggregate")
    title("What you aggregate from spans (per prompt id, per model, per day)")
    print(f"  trace {trace_id}: steps={len(spans)} tokens={sum(s.input_tokens for s in spans)}+{sum(s.output_tokens for s in spans)} "
          f"cost={sum(s.cost_micro_usd for s in spans)} micro-USD validated={str(all(s.validated for s in spans)).lower()}")
    print("  dashboards: p50/p95 latency, tokens per part, cost per tenant, validation-pass rate per prompt id, cache hit rate")
    print("  alerts: validation-pass rate drops, cost per request jumps, a prompt hash you did not deploy appears")

    section("redaction")
    title("What the log holds versus what the model saw")
    print("  model saw :", email.splitlines()[1][:60] + "...")
    print("  log holds :", redact(email.splitlines()[1])[:60] + "...")
    print("  keep raw prompts, if at all, in a short-retention store with access control - not in the app log")


if __name__ == "__main__":
    main()
