"""
The `llm` adapter: one thin door between the examples and a language model.

Why an adapter at all? Three reasons, and they are the same three the lessons teach:

  1. Concepts outlive vendors. Every example calls `complete(...)` / `stream(...)`; what sits
     behind them is one place to change.
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
max_tokens, temperature, json_schema, effort, tools, stream) - identical in Python and
TypeScript, so either language can record and both replay. Replay needs nothing installed.

Message shape (provider-neutral; each backend maps it):
  {"role": "user" | "assistant" | "tool", "content": str,
   "images": [base64, ...]                      # optional, user messages (Lesson 5.4)
   "tool_calls": [{"id", "name", "arguments"}]  # optional, assistant messages (Lesson 5.3)
   "tool_call_id": str, "name": str}            # tool messages: the result of one call
"""

from __future__ import annotations

import hashlib
import json
import os
from collections.abc import Iterator
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
VISION_MODEL = os.environ.get("LEARNAI_LLM_VISION_MODEL", _CONFIG.get("vision_model", DEFAULT_MODEL))
EMBED_MODEL = os.environ.get("LEARNAI_LLM_EMBED_MODEL", _CONFIG.get("embed_model", "nomic-embed-text"))
OLLAMA_URL = os.environ.get("OLLAMA_URL", _CONFIG.get("ollama_url", "http://localhost:11434"))


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict[str, Any]


@dataclass
class Completion:
    """What an example gets back. Deliberately small: text, and the accounting."""

    text: str
    model: str
    stop_reason: str          # end_turn | max_tokens | tool_use
    input_tokens: int
    output_tokens: int
    recorded_at: str          # ISO date the response was recorded
    replayed: bool            # True when it came from a cassette
    tool_calls: list[ToolCall] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict, repr=False)

    def as_message(self) -> dict[str, Any]:
        """The assistant turn to append to the conversation (keeps tool calls, Lesson 5.3)."""
        m: dict[str, Any] = {"role": "assistant", "content": self.text}
        if self.tool_calls:
            m["tool_calls"] = [{"id": t.id, "name": t.name, "arguments": t.arguments} for t in self.tool_calls]
        return m


def tool_result(call: ToolCall, content: Any) -> dict[str, Any]:
    """The message that carries a tool's result back to the model."""
    return {"role": "tool", "tool_call_id": call.id, "name": call.name,
            "content": content if isinstance(content, str) else json.dumps(content, ensure_ascii=False, separators=(",", ":"))}


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
        f.write(json.dumps({"key": request_hash(cassette["request"]), "model": cassette["response"]["model"], "recorded_at": cassette["recorded_at"]}) + "\n")


def _load_dotenv() -> None:
    """Record/live only: read examples/.env (gitignored) so a key never has to be exported.
    Real environment variables win."""
    env_file = SHARED.parent / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def _build_request(messages, system, model, max_tokens, temperature, json_schema, effort, tools, stream_):
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
    if tools is not None:
        request["tools"] = tools
    if stream_:
        request["stream"] = True
    return request


def _replay(path: Path, request: dict[str, Any]) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(
            f"No cassette for this request ({path.name}).\n"
            f"Record it once:  LEARNAI_LLM_MODE=record python3 <example>   (Ollama running, or a key in examples/.env)\n"
            f"Request was: {canonical(request)[:200]}..."
        )
    cassette = json.loads(path.read_text(encoding="utf-8"))
    _log_use(cassette)
    return cassette


def _record(path: Path, request: dict[str, Any], result: dict[str, Any], mode: str) -> dict[str, Any]:
    cassette = {
        "request": request,
        "response": result,
        "recorded_at": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "recorded_by": "python",
    }
    if mode == "record":
        CASSETTES.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(cassette, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    _log_use(cassette)
    return cassette


def _completion(cassette: dict[str, Any], replayed: bool) -> Completion:
    r = cassette["response"]
    return Completion(
        text=r["text"], model=r["model"], stop_reason=r["stop_reason"],
        input_tokens=r["usage"]["input_tokens"], output_tokens=r["usage"]["output_tokens"],
        recorded_at=cassette["recorded_at"], replayed=replayed,
        tool_calls=[ToolCall(**t) for t in r.get("tool_calls", [])], raw=cassette,
    )


def _call_provider(request: dict[str, Any], stream_: bool) -> dict[str, Any]:
    if PROVIDER == "anthropic":
        return _call_anthropic(request, stream_)
    if PROVIDER == "ollama":
        return _call_ollama(request, stream_)
    raise ValueError(f"unknown provider {PROVIDER!r} (anthropic | ollama)")


def complete(
    messages: list[dict[str, Any]] | str,
    *,
    system: str | None = None,
    model: str = DEFAULT_MODEL,
    max_tokens: int = 1024,
    temperature: float | None = None,
    json_schema: dict[str, Any] | None = None,
    effort: str | None = None,
    tools: list[dict[str, Any]] | None = None,
) -> Completion:
    """One model call. `messages` may be a plain string for the common single-turn case.

    json_schema: constrain the output to valid JSON matching the schema (structured output).
    effort: "low" | "medium" | "high" | "xhigh" | "max" - how hard the model thinks (Lesson 4.5).
    tools: [{"name", "description", "input_schema"}] the model may call (Lesson 5.3);
           the reply then carries `tool_calls` and stop_reason "tool_use".
    """
    request = _build_request(messages, system, model, max_tokens, temperature, json_schema, effort, tools, False)
    path = CASSETTES / f"{request_hash(request)}.json"
    mode = _mode()
    if mode == "replay":
        return _completion(_replay(path, request), replayed=True)
    result = _call_provider(request, stream_=False)
    return _completion(_record(path, request, result, mode), replayed=False)


class Stream:
    """Iterate for text chunks; afterwards `.result` holds the Completion with the accounting.

        s = stream("...")
        for chunk in s: print(chunk, end="")
        print(s.result.output_tokens)
    """

    def __init__(self, request: dict[str, Any]) -> None:
        self._request = request
        self.result: Completion | None = None

    def __iter__(self) -> Iterator[str]:
        path = CASSETTES / f"{request_hash(self._request)}.json"
        mode = _mode()
        if mode == "replay":
            cassette = _replay(path, self._request)
            self.result = _completion(cassette, replayed=True)
            yield from cassette["response"]["chunks"]
            return
        # Record/live: collect the whole stream (the cassette needs it), then re-yield the
        # exact chunk boundaries - replay streams the same pieces.
        result = _call_provider(self._request, stream_=True)
        cassette = _record(path, self._request, result, mode)
        self.result = _completion(cassette, replayed=False)
        yield from result["chunks"]


def stream(
    messages: list[dict[str, Any]] | str,
    *,
    system: str | None = None,
    model: str = DEFAULT_MODEL,
    max_tokens: int = 1024,
    temperature: float | None = None,
) -> Stream:
    """Like complete(), but the response arrives as text chunks (Lesson 5.2)."""
    return Stream(_build_request(messages, system, model, max_tokens, temperature, None, None, None, True))


@dataclass
class Embeddings:
    vectors: list[list[float]]
    model: str
    input_tokens: int
    recorded_at: str
    replayed: bool


def embed(texts: list[str], *, model: str = EMBED_MODEL) -> Embeddings:
    """Turn texts into vectors (Lesson 2.3 / Module 6). One request per call, cached like any
    other - the cassette holds the vectors, so replay needs no embedding model either."""
    request = {"provider": PROVIDER, "embed_model": model, "texts": list(texts)}
    path = CASSETTES / f"{request_hash(request)}.json"
    mode = _mode()
    if mode == "replay":
        cassette = _replay(path, request)
        r = cassette["response"]
        return Embeddings(r["vectors"], r["model"], r["usage"]["input_tokens"], cassette["recorded_at"], True)
    if PROVIDER == "ollama":
        result = _embed_ollama(model, list(texts))
    elif PROVIDER == "anthropic":
        raise NotImplementedError("the anthropic provider has no embeddings endpoint; set LEARNAI_LLM_PROVIDER=ollama for embeddings "
                                  "(or add an embeddings vendor to the adapter)")
    else:
        raise ValueError(f"unknown provider {PROVIDER!r}")
    cassette = _record(path, request, result, mode)
    return Embeddings(result["vectors"], result["model"], result["usage"]["input_tokens"], cassette["recorded_at"], False)


def _embed_ollama(model: str, texts: list[str]) -> dict[str, Any]:
    import urllib.error  # noqa: PLC0415
    import urllib.request  # noqa: PLC0415

    req = urllib.request.Request(f"{OLLAMA_URL}/api/embed", data=json.dumps({"model": model, "input": texts}).encode("utf-8"),
                                 headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=900) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as e:
        raise RuntimeError(f"Could not reach Ollama at {OLLAMA_URL} ({e.reason}); `ollama pull {model}`.") from e
    # Round to 6 decimals: plenty for cosine similarity, and it keeps cassettes small and
    # identical across languages.
    vectors = [[round(x, 6) for x in v] for v in data["embeddings"]]
    return {"vectors": vectors, "model": data.get("model", model), "text": "", "stop_reason": "end_turn",
            "usage": {"input_tokens": data.get("prompt_eval_count", 0), "output_tokens": 0}}


# ---- providers --------------------------------------------------------------------------

def _call_anthropic(request: dict[str, Any], stream_: bool) -> dict[str, Any]:
    """The official SDK, imported only here so replay needs nothing installed."""
    _load_dotenv()
    import anthropic  # noqa: PLC0415  (pip install anthropic)

    client = anthropic.Anthropic()
    # Map the neutral message shape to Anthropic content blocks.
    messages: list[dict[str, Any]] = []
    for m in request["messages"]:
        if m["role"] == "tool":
            messages.append({"role": "user", "content": [{"type": "tool_result", "tool_use_id": m["tool_call_id"], "content": m["content"]}]})
        elif m["role"] == "assistant" and m.get("tool_calls"):
            blocks: list[dict[str, Any]] = [{"type": "text", "text": m["content"]}] if m.get("content") else []
            blocks += [{"type": "tool_use", "id": t["id"], "name": t["name"], "input": t["arguments"]} for t in m["tool_calls"]]
            messages.append({"role": "assistant", "content": blocks})
        elif m.get("images"):
            blocks = [{"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": img}} for img in m["images"]]
            blocks.append({"type": "text", "text": m["content"]})
            messages.append({"role": "user", "content": blocks})
        else:
            messages.append({"role": m["role"], "content": m["content"]})

    kwargs: dict[str, Any] = {"model": request["model"], "max_tokens": request["max_tokens"], "messages": messages}
    if "system" in request:
        kwargs["system"] = request["system"]
    if "temperature" in request:
        kwargs["temperature"] = request["temperature"]
    if "tools" in request:
        kwargs["tools"] = [{"name": t["name"], "description": t["description"], "input_schema": t["input_schema"]} for t in request["tools"]]
    output_config: dict[str, Any] = {}
    if "json_schema" in request:
        output_config["format"] = {"type": "json_schema", "schema": request["json_schema"]}
    if "effort" in request:
        output_config["effort"] = request["effort"]
    if output_config:
        kwargs["output_config"] = output_config

    if stream_:
        chunks: list[str] = []
        with client.messages.stream(**kwargs) as s:
            for text in s.text_stream:
                chunks.append(text)
            response = s.get_final_message()
        return {"text": "".join(chunks), "chunks": chunks, "model": response.model,
                "stop_reason": response.stop_reason or "end_turn",
                "usage": {"input_tokens": response.usage.input_tokens, "output_tokens": response.usage.output_tokens}}

    response = client.messages.create(**kwargs)
    text = "".join(b.text for b in response.content if b.type == "text")
    tool_calls = [{"id": b.id, "name": b.name, "arguments": b.input} for b in response.content if b.type == "tool_use"]
    result = {"text": text, "model": response.model,
              "stop_reason": response.stop_reason or "end_turn",
              "usage": {"input_tokens": response.usage.input_tokens, "output_tokens": response.usage.output_tokens}}
    if tool_calls:
        result["tool_calls"] = tool_calls
    return result


def _call_ollama(request: dict[str, Any], stream_: bool) -> dict[str, Any]:
    """Ollama's local HTTP API (ollama.com). A free, open-weight model on your own machine:
    no key, nothing leaves the laptop. Same request shape as the hosted path, mapped:
      json_schema -> format (Ollama enforces the schema);  effort -> think on/off
      (low = off; medium and above = on, for models that support it, e.g. qwen3);
      tools -> tools;  images -> message.images."""
    import urllib.error  # noqa: PLC0415
    import urllib.request  # noqa: PLC0415

    chat: list[dict[str, Any]] = [{"role": "system", "content": request["system"]}] if "system" in request else []
    for m in request["messages"]:
        if m["role"] == "tool":
            chat.append({"role": "tool", "content": m["content"], "tool_name": m.get("name")})
        else:
            out: dict[str, Any] = {"role": m["role"], "content": m["content"]}
            if m.get("images"):
                out["images"] = m["images"]
            if m.get("tool_calls"):
                out["tool_calls"] = [{"function": {"name": t["name"], "arguments": t["arguments"]}} for t in m["tool_calls"]]
            chat.append(out)
    body: dict[str, Any] = {
        "model": request["model"],
        "messages": chat,
        "stream": stream_,
        "options": {"num_predict": request["max_tokens"], **({"temperature": request["temperature"]} if "temperature" in request else {})},
        "think": request.get("effort") not in (None, "low"),
    }
    if "json_schema" in request:
        body["format"] = request["json_schema"]
    if "tools" in request:
        body["tools"] = [{"type": "function", "function": {"name": t["name"], "description": t["description"], "parameters": t["input_schema"]}} for t in request["tools"]]
    req = urllib.request.Request(f"{OLLAMA_URL}/api/chat", data=json.dumps(body).encode("utf-8"),
                                 headers={"Content-Type": "application/json"}, method="POST")
    try:
        resp = urllib.request.urlopen(req, timeout=900)
    except urllib.error.URLError as e:
        raise RuntimeError(
            f"Could not reach Ollama at {OLLAMA_URL} ({e.reason}). Install it from https://ollama.com, "
            f"start it, and `ollama pull {request['model']}`."
        ) from e

    def finish(data: dict[str, Any]) -> dict[str, Any]:
        return {"model": data.get("model", request["model"]),
                "stop_reason": "end_turn" if data.get("done_reason", "stop") == "stop" else "max_tokens",
                "usage": {"input_tokens": data.get("prompt_eval_count", 0), "output_tokens": data.get("eval_count", 0)}}

    with resp:
        if stream_:
            chunks: list[str] = []
            last: dict[str, Any] = {}
            for line in resp:
                data = json.loads(line)
                piece = data.get("message", {}).get("content", "")
                if piece:
                    chunks.append(piece)
                if data.get("done"):
                    last = data
            return {"text": "".join(chunks), "chunks": chunks, **finish(last)}
        data = json.loads(resp.read().decode("utf-8"))
    result = {"text": data["message"]["content"], **finish(data)}
    calls = data["message"].get("tool_calls") or []
    if calls:
        result["tool_calls"] = [
            {"id": c.get("id") or f"call_{i + 1}", "name": c["function"]["name"], "arguments": c["function"].get("arguments") or {}}
            for i, c in enumerate(calls)
        ]
        result["stop_reason"] = "tool_use"
    return result
