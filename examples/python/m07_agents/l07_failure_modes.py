"""
Lesson 7.7 - Agent failure modes

Agents fail in ways single calls cannot: they loop, they spend, they wander off the goal,
and they compound small errors across steps. None of these is fixed by a better prompt;
each is fixed by a guardrail in the loop - which is code you own. This example implements
the four guardrails against scripted traces (deterministic on purpose: the point is the
detector, not the model).

Run:  python3 m07_agents/l07_failure_modes.py
"""

from __future__ import annotations

from collections import Counter

from learnai import section, title

# region: traces
# Four abbreviated traces of the 7.2-style diagnostic agent, as (tool, args) tuples.
TRACES = {
    "healthy": [
        ("list_services", "{}"), ("get_latency", "orders"), ("get_latency", "payments"),
        ("get_deploys", "payments"), ("FINISH", "payments deploy at 14:02"),
    ],
    "loop": [
        ("list_services", "{}"), ("get_latency", "orders"), ("get_latency", "orders"),
        ("get_latency", "orders"), ("get_latency", "orders"), ("get_latency", "orders"),
    ],
    "wander": [
        ("list_services", "{}"), ("get_latency", "payments"),
        ("search_docs", "what is p95 latency"), ("search_docs", "json serialiser comparison"),
        ("get_billing", "ORD-1042"), ("search_docs", "kubernetes tuning"),
    ],
    "runaway": [("get_latency", f"svc-{i}") for i in range(1, 40)],
}
TOKENS_PER_STEP = 600   # what each loop iteration roughly costs in this scenario
# endregion


# region: detectors
def detect_repeat(trace: list[tuple[str, str]], threshold: int = 3) -> str | None:
    """The commonest failure: the same call with the same arguments, again. A model that
    did not get what it wanted often just retries - forever. Detect exact repeats; the
    fix is to inject the observation 'you already did this' or stop."""
    counts = Counter(trace)
    worst, n = counts.most_common(1)[0]
    if n >= threshold and worst[0] != "FINISH":
        return f"{worst[0]}({worst[1]}) called {n}x"
    return None


def detect_no_progress(trace: list[tuple[str, str]], window: int = 4) -> str | None:
    """Weaker loops repeat with variations. Progress here means 'new information': a call
    whose (tool, args) has not been seen. A window with nothing new is a stall."""
    seen: set[tuple[str, str]] = set()
    fresh = []
    for step in trace:
        fresh.append(step not in seen)
        seen.add(step)
    if len(fresh) >= window and not any(fresh[-window:]):
        return f"no new information in the last {window} steps"
    return None


def detect_budget(trace: list[tuple[str, str]], max_steps: int = 10, max_tokens: int = 8_000) -> str | None:
    """The bill-shaped failure. Steps and tokens, whichever first (Lesson 7.2). The token
    cap matters because context grows every step - late steps cost the most."""
    tokens = sum(TOKENS_PER_STEP + i * 120 for i in range(len(trace)))   # growing context
    if len(trace) > max_steps:
        return f"step cap: {len(trace)} > {max_steps}"
    if tokens > max_tokens:
        return f"token cap: ~{tokens:,} > {max_tokens:,}"
    return None


def detect_drift(trace: list[tuple[str, str]], goal_tools: set[str]) -> str | None:
    """Goal drift: the agent is busy, but on the wrong thing. Cheap proxy: how much of the
    recent trace touches tools relevant to the goal. The real fix is a supervisor check
    (7.6) or an explicit re-statement of the goal in the loop."""
    recent = trace[-4:]
    relevant = sum(1 for tool, _ in recent if tool in goal_tools)
    if relevant <= len(recent) // 2:
        return f"only {relevant}/{len(recent)} recent steps touch goal-relevant tools"
    return None
# endregion


# region: envelope
def run_guardrails(name: str, trace: list[tuple[str, str]]) -> list[str]:
    """The envelope every production agent loop needs: all detectors, every step. Findings
    do not always mean 'kill' - repeat/stall usually mean 'intervene' (inject a nudge,
    re-state the goal), budget means 'stop and report', drift means 'escalate'."""
    findings = []
    for detector, args in [
        (detect_repeat, ()), (detect_no_progress, ()), (detect_budget, ()),
        (detect_drift, ({"get_latency", "get_deploys", "FINISH"},)),
    ]:
        finding = detector(trace, *args)  # type: ignore[operator]
        if finding:
            findings.append(f"{detector.__name__.removeprefix('detect_')}: {finding}")
    return findings
# endregion


def main() -> None:
    section("detectors")
    title("Four traces through four detectors")
    for name, trace in TRACES.items():
        findings = run_guardrails(name, trace)
        print(f"{name:8} {len(trace):>2} steps -> " + ("; ".join(findings) if findings else "clean"))

    section("compounding")
    title("Why multi-step errors are worse than single-call errors")
    per_step = 0.95
    print("  a 95%-reliable step, chained:")
    for steps in [1, 3, 5, 10, 20]:
        print(f"    {steps:>2} steps: {per_step ** steps:6.1%} chance every step was right")
    print("  agents multiply error rates; verification between steps (schemas, checks) resets them")

    section("responses")
    title("Match the response to the failure")
    print("repeat / stall  -> intervene: feed back 'already tried; result was X', or stop with partial answer")
    print("budget          -> stop, return the trace and best-so-far; never raise the cap mid-run")
    print("drift           -> re-state the goal in the next prompt, or escalate to a supervisor / human")
    print("tool errors     -> data, not exceptions (5.3); repeated tool errors count as no-progress")
    print("every stop path returns the TRACE - the artefact that makes agent failures debuggable at all")


if __name__ == "__main__":
    main()
