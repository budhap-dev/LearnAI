"""
The `llm` adapter: one thin door between the examples and a language model.

Why an adapter at all? Three reasons, and they are the same three the lessons teach:

  1. Concepts outlive vendors. Every example calls `complete(...)`; what sits behind it is
     one place to change.
  2. The site must never show output the code did not produce - but CI cannot hold an API
     key or spend money. So calls are *recorded* once into cassettes and *replayed* on every
     build. Python and TypeScript share the same cassettes byte for byte.
  3. Every call is accounted for: model, tokens, and when the response was recorded, so the
     site can say "recorded with <model> on <date>" next to any model output.

Modes (LEARNAI_LLM_MODE):
  replay  (default) read examples/shared/cassettes/<hash>.json; fail loudly if missing
  record  call the real API through the official SDK and write the cassette
  live    call the real API, do not write cassettes (for poking around)

The cassette key is a hash of the canonical request (model, system, messages, max_tokens,
temperature) - identical in Python and TypeScript, so either language can record and both
replay. Recording needs `pip install anthropic` and credentials; replay needs nothing.
"""

from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# The default model. Chosen once, here; lessons pass a different one only to make a point.
DEFAULT_MODEL = "claude-opus-5"

CASSETTES = Path(__file__).resolve().parents[2] / "shared" / "cassettes"


@dataclass
class Completion:
    """What an example gets back. Deliberately small: text, and the accounting."""

    text: str
    model: str
    stop_reason: str
    input_tokens: int
    output_tokens: int
    recorded_at: str          # ISO date the response was recorded
    replayed: bool            # True when it came from a cassette
    raw: dict[str, Any] = field(default_factory=dict, repr=False)


def canonical(request: dict[str, Any]) -> str:
    """Stable JSON: sorted keys, no whitespace, unicode kept. Must match the TypeScript twin."""
    return json.dumps(request, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def request_hash(request: dict[str, Any]) -> str:
    return hashlib.sha256(canonical(request).encode("utf-8")).hexdigest()[:16]


def _mode() -> str:
    mode = os.environ.get("LEARNAI_LLM_MODE", "replay")
    if mode not in {"replay", "record", "live"}:
        raise ValueError(f"LEARNAI_LLM_MODE must be replay|record|live, got {mode!r}")
    return mode


def _log_use(cassette: dict[str, Any]) -> None:
    """Tell the harness which recording was used, so the site can show model + date."""
    log = os.environ.get("LEARNAI_CASSETTE_LOG")
    if not log:
        return
    with open(log, "a", encoding="utf-8") as f:
        f.write(json.dumps({"model": cassette["response"]["model"], "recorded_at": cassette["recorded_at"]}) + "\n")


def complete(
    messages: list[dict[str, Any]] | str,
    *,
    system: str | None = None,
    model: str = DEFAULT_MODEL,
    max_tokens: int = 1024,
    temperature: float | None = None,
) -> Completion:
    """One model call. `messages` may be a plain string for the common single-turn case."""
    if isinstance(messages, str):
        messages = [{"role": "user", "content": messages}]

    request: dict[str, Any] = {"model": model, "messages": messages, "max_tokens": max_tokens}
    if system is not None:
        request["system"] = system
    if temperature is not None:
        request["temperature"] = temperature

    key = request_hash(request)
    path = CASSETTES / f"{key}.json"
    mode = _mode()

    if mode == "replay":
        if not path.exists():
            raise FileNotFoundError(
                f"No cassette for this request ({path.name}).\n"
                f"Record it once with credentials:  LEARNAI_LLM_MODE=record python3 <example>\n"
                f"Request was: {canonical(request)[:200]}..."
            )
        cassette = json.loads(path.read_text(encoding="utf-8"))
        _log_use(cassette)
        r = cassette["response"]
        return Completion(
            text=r["text"], model=r["model"], stop_reason=r["stop_reason"],
            input_tokens=r["usage"]["input_tokens"], output_tokens=r["usage"]["output_tokens"],
            recorded_at=cassette["recorded_at"], replayed=True, raw=cassette,
        )

    # record / live: the official SDK, imported only here so replay needs nothing installed.
    import anthropic  # noqa: PLC0415  (pip install anthropic)

    client = anthropic.Anthropic()
    kwargs: dict[str, Any] = {"model": model, "max_tokens": max_tokens, "messages": messages}
    if system is not None:
        kwargs["system"] = system
    if temperature is not None:
        kwargs["temperature"] = temperature
    response = client.messages.create(**kwargs)

    text = "".join(block.text for block in response.content if block.type == "text")
    recorded_at = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cassette = {
        "request": request,
        "response": {
            "text": text,
            "model": response.model,
            "stop_reason": response.stop_reason or "end_turn",
            "usage": {"input_tokens": response.usage.input_tokens, "output_tokens": response.usage.output_tokens},
        },
        "recorded_at": recorded_at,
        "recorded_by": "python",
    }
    if mode == "record":
        CASSETTES.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(cassette, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    _log_use(cassette)
    return Completion(
        text=text, model=response.model, stop_reason=cassette["response"]["stop_reason"],
        input_tokens=response.usage.input_tokens, output_tokens=response.usage.output_tokens,
        recorded_at=recorded_at, replayed=False, raw=cassette,
    )
