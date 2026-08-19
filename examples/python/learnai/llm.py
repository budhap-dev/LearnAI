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
  record  call the real model and write the cassette
  live    call the real model, do not write cassettes (for poking around)

Providers (examples/shared/llm-config.json, overridable with LEARNAI_LLM_PROVIDER / _MODEL):
  anthropic  the official SDK; needs `pip install anthropic` and an API key (examples/.env)
  ollama     a local open-weight model via Ollama's HTTP API; needs no key and no install

The cassette key is a hash of the canonical request (provider, model, system, messages,
max_tokens, temperature, json_schema, effort) - identical in Python and TypeScript, so
either language can record and both replay. Replay needs nothing installed.
"""

from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SHARED = Path(__file__).resolve().parents[2] / "shared"
CASSETTES = SHARED / "cassettes"

# The provider and model the course records with - committed, so replay resolves the same
# cassette keys as recording did. Lessons pass a different model only to make a point.
_CONFIG = json.loads((SHARED / "llm-config.json").read_text(encoding="utf-8"))
PROVIDER = os.environ.get("LEARNAI_LLM_PROVIDER", _CONFIG["provider"])
DEFAULT_MODEL = os.environ.get("LEARNAI_LLM_MODEL", _CONFIG["model"])
OLLAMA_URL = os.environ.get("OLLAMA_URL", _CONFIG.get("ollama_url", "http://localhost:11434"))


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


def _load_dotenv() -> None:
    """Record/live only: read examples/.env (gitignored) so a key never has to be exported.
    Real environment variables win."""
    env_file = Path(__file__).resolve().parents[2] / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def complete(
    messages: list[dict[str, Any]] | str,
    *,
    system: str | None = None,
    model: str = DEFAULT_MODEL,
    max_tokens: int = 1024,
    temperature: float | None = None,
    json_schema: dict[str, Any] | None = None,
    effort: str | None = None,
) -> Completion:
    """One model call. `messages` may be a plain string for the common single-turn case.

    json_schema: constrain the output to valid JSON matching the schema (structured output).
    effort: "low" | "medium" | "high" | "xhigh" | "max" - how hard the model thinks (Lesson 4.5).
    """
    if isinstance(messages, str):
        messages = [{"role": "user", "content": messages}]

    request: dict[str, Any] = {"provider": PROVIDER, "model": model, "messages": messages, "max_tokens": max_tokens}
    if system is not None:
        request["system"] = system
    if temperature is not None:
        request["temperature"] = temperature
    if json_schema is not None:
        request["json_schema"] = json_schema
    if effort is not None:
        request["effort"] = effort

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

    # record / live: call the configured provider.
    if PROVIDER == "anthropic":
        result = _call_anthropic(model, messages, system, max_tokens, temperature, json_schema, effort)
    elif PROVIDER == "ollama":
        result = _call_ollama(model, messages, system, max_tokens, temperature, json_schema, effort)
    else:
        raise ValueError(f"unknown provider {PROVIDER!r} (anthropic | ollama)")

    recorded_at = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cassette = {
        "request": request,
        "response": result,
        "recorded_at": recorded_at,
        "recorded_by": "python",
    }
    if mode == "record":
        CASSETTES.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(cassette, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    _log_use(cassette)
    return Completion(
        text=result["text"], model=result["model"], stop_reason=result["stop_reason"],
        input_tokens=result["usage"]["input_tokens"], output_tokens=result["usage"]["output_tokens"],
        recorded_at=recorded_at, replayed=False, raw=cassette,
    )


def _call_anthropic(model, messages, system, max_tokens, temperature, json_schema, effort) -> dict[str, Any]:
    """The official SDK, imported only here so replay needs nothing installed."""
    _load_dotenv()
    import anthropic  # noqa: PLC0415  (pip install anthropic)

    client = anthropic.Anthropic()
    kwargs: dict[str, Any] = {"model": model, "max_tokens": max_tokens, "messages": messages}
    if system is not None:
        kwargs["system"] = system
    if temperature is not None:
        kwargs["temperature"] = temperature
    output_config: dict[str, Any] = {}
    if json_schema is not None:
        output_config["format"] = {"type": "json_schema", "schema": json_schema}
    if effort is not None:
        output_config["effort"] = effort
    if output_config:
        kwargs["output_config"] = output_config
    response = client.messages.create(**kwargs)
    text = "".join(block.text for block in response.content if block.type == "text")
    return {
        "text": text,
        "model": response.model,
        "stop_reason": response.stop_reason or "end_turn",
        "usage": {"input_tokens": response.usage.input_tokens, "output_tokens": response.usage.output_tokens},
    }


def _call_ollama(model, messages, system, max_tokens, temperature, json_schema, effort) -> dict[str, Any]:
    """Ollama's local HTTP API (ollama.com). A free, open-weight model on your own machine:
    no key, nothing leaves the laptop. Same request shape as the hosted path, mapped:
      json_schema -> format (Ollama enforces the schema);  effort -> think on/off
      (low = off; medium and above = on, for models that support it, e.g. qwen3)."""
    import urllib.error  # noqa: PLC0415
    import urllib.request  # noqa: PLC0415

    chat = ([{"role": "system", "content": system}] if system else []) + list(messages)
    body: dict[str, Any] = {
        "model": model,
        "messages": chat,
        "stream": False,
        "options": {"num_predict": max_tokens, **({"temperature": temperature} if temperature is not None else {})},
        "think": effort not in (None, "low"),
    }
    if json_schema is not None:
        body["format"] = json_schema
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/chat", data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=600) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as e:
        raise RuntimeError(
            f"Could not reach Ollama at {OLLAMA_URL} ({e.reason}). Install it from https://ollama.com, "
            f"start it, and `ollama pull {model}`."
        ) from e
    return {
        "text": data["message"]["content"],
        "model": data.get("model", model),
        "stop_reason": "end_turn" if data.get("done_reason", "stop") == "stop" else "max_tokens",
        "usage": {"input_tokens": data.get("prompt_eval_count", 0), "output_tokens": data.get("eval_count", 0)},
    }
