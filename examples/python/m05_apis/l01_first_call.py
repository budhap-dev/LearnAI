"""
Lesson 5.1 - Your first call, properly

A model call is a network call to a rate-limited, occasionally slow, sometimes failing
service. Treat it like one: a timeout, retries with backoff (only on the errors that
deserve them), an idempotency key so a retry cannot double-act, and a budget. The code that
does this is boring and the same for every vendor - which is why it lives in one wrapper.

The wrapper is exercised first against a fake transport that fails on purpose (so you can
see the retry policy work, deterministically), then against the real model through the
adapter.

Run:  python3 m05_apis/l01_first_call.py
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from typing import Any, Callable

from learnai import section, title
from learnai.llm import complete


# region: errors
class ModelError(Exception):
    """What a call can fail with. `retryable` is the only thing the wrapper cares about."""

    def __init__(self, kind: str, retryable: bool, message: str = "") -> None:
        super().__init__(message or kind)
        self.kind = kind
        self.retryable = retryable


# The classes that matter. Everything else is a bug in your request - retrying will not help.
RETRYABLE = {"rate_limited", "overloaded", "timeout", "server_error"}
NOT_RETRYABLE = {"bad_request", "auth", "content_too_large", "context_length"}
# endregion


# region: wrapper
@dataclass
class CallLog:
    attempts: int = 0
    waits: list[float] = field(default_factory=list)
    outcome: str = ""


def call_with_policy(
    send: Callable[[], Any],
    *,
    max_attempts: int = 4,
    base_delay_s: float = 0.5,
    sleep: Callable[[float], None] = lambda s: None,
    log: CallLog | None = None,
) -> Any:
    """Retry only retryable errors, with exponential backoff and a cap on attempts.

    - timeouts belong in `send` (the HTTP client), not here - this only decides what to do
      when one happens;
    - the delay doubles: 0.5s, 1s, 2s (add jitter in production so clients do not stampede);
    - a non-retryable error is raised immediately - retrying a 400 four times is four 400s.
    """
    log = log or CallLog()
    for attempt in range(1, max_attempts + 1):
        log.attempts = attempt
        try:
            result = send()
            log.outcome = "ok"
            return result
        except ModelError as e:
            if not e.retryable or attempt == max_attempts:
                log.outcome = f"failed: {e.kind}"
                raise
            delay = base_delay_s * 2 ** (attempt - 1)
            log.waits.append(delay)
            sleep(delay)
    raise AssertionError("unreachable")
# endregion


# region: idempotency
def idempotency_key(user_id: str, request: dict[str, Any]) -> str:
    """Same user + same request => same key. The downstream action (create a ticket, send an
    email, charge a card) checks the key before acting, so a retried model call - or a
    double-clicked button - cannot act twice. The model call itself is idempotent enough;
    what it TRIGGERS usually is not."""
    blob = json.dumps({"u": user_id, "r": request}, sort_keys=True).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()[:16]
# endregion


def flaky_transport(script: list[str | None]) -> Callable[[], str]:
    """A fake `send` that follows a script: each entry is an error kind, or None for success."""
    it = iter(script)

    def send() -> str:
        kind = next(it)
        if kind is None:
            return "ok"
        raise ModelError(kind, retryable=kind in RETRYABLE)

    return send


def main() -> None:
    section("retry")
    title("Retryable errors get backoff; a cap stops the bleeding")
    for name, script in [
        ("rate limited twice, then ok", ["rate_limited", "rate_limited", None]),
        ("overloaded every time", ["overloaded"] * 4),
    ]:
        log = CallLog()
        try:
            call_with_policy(flaky_transport(script), log=log)
        except ModelError:
            pass
        print(f"{name:30} attempts={log.attempts} waits={log.waits} -> {log.outcome}")

    section("no-retry")
    title("Non-retryable errors fail fast - do not retry a bad request")
    for kind in ["bad_request", "context_length", "auth"]:
        log = CallLog()
        try:
            call_with_policy(flaky_transport([kind, None]), log=log)
        except ModelError:
            pass
        print(f"{kind:16} attempts={log.attempts} -> {log.outcome}")

    section("idempotency")
    title("An idempotency key makes the side effect safe to retry")
    req = {"action": "create_ticket", "subject": "Reports tab crash"}
    k1 = idempotency_key("user-42", req)
    k2 = idempotency_key("user-42", req)
    k3 = idempotency_key("user-42", {**req, "subject": "Billing question"})
    print(f"same request twice  -> {k1} == {k2}: {k1 == k2}")
    print(f"different request   -> {k3} != {k1}: {k3 != k1}")
    print("the ticket system stores the key with the ticket; a second create with the same key is a no-op")

    section("real-call")
    title("The same wrapper around a real model call")
    log = CallLog()
    result = call_with_policy(
        lambda: complete("In one sentence: what does an HTTP 429 mean and what should a client do?", max_tokens=80),
        log=log,
    )
    print(f"attempts={log.attempts} model={result.model} tokens={result.input_tokens}+{result.output_tokens}")
    print(result.text.strip())


if __name__ == "__main__":
    main()
