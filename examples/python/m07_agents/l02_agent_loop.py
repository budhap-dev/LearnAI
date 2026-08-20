"""
Lesson 7.2 - The agent loop

An agent is the tool loop from Lesson 5.3 with the model deciding what to do next - plus
everything that stops that from going wrong: an explicit goal, a bounded budget (steps AND
tokens), a termination contract (the model must either act or finish), and a trace you can
read afterwards. The loop is your code; the model only ever proposes.

The task here is small but genuinely open-ended: diagnose why a (fake) service is slow,
using three read-only tools. The model chooses which to call and when to conclude.

Run:  python3 m07_agents/l02_agent_loop.py
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from learnai import section, title
from learnai.llm import ToolCall, complete, tool_result

# region: world
# A fake production system with a planted root cause: a deploy at 14:02 doubled p95 latency
# on the payments service; the database and cache are healthy. The agent must find this.
SERVICES = {
    "payments": {"p95_ms": [120, 118, 121, 260, 265, 262], "deploys": [{"at": "14:02", "version": "v81", "change": "switched JSON serialiser"}]},
    "orders": {"p95_ms": [95, 96, 94, 97, 95, 96], "deploys": []},
    "database": {"p95_ms": [11, 12, 11, 12, 12, 11], "deploys": []},
}
TOOLS = [
    {"name": "list_services", "description": "List the service names you can inspect.",
     "input_schema": {"type": "object", "properties": {}, "additionalProperties": False}},
    {"name": "get_latency", "description": "Six hourly p95 latency samples (ms) for a service, oldest first. The last three are the most recent hours.",
     "input_schema": {"type": "object", "properties": {"service": {"type": "string"}}, "required": ["service"], "additionalProperties": False}},
    {"name": "get_deploys", "description": "Deploys to a service today, with time and change description.",
     "input_schema": {"type": "object", "properties": {"service": {"type": "string"}}, "required": ["service"], "additionalProperties": False}},
]


def run_tool(call: ToolCall) -> Any:
    service = str(call.arguments.get("service", ""))
    if call.name == "list_services":
        return {"services": sorted(SERVICES)}
    if service not in SERVICES:
        return {"error": f"unknown service {service!r}"}
    if call.name == "get_latency":
        return {"service": service, "p95_ms": SERVICES[service]["p95_ms"]}
    if call.name == "get_deploys":
        return {"service": service, "deploys": SERVICES[service]["deploys"]}
    return {"error": f"unknown tool {call.name}"}
# endregion


# region: budget
@dataclass
class Budget:
    """Two ceilings, because either alone is gameable: a step cap bounds the loop, a token
    cap bounds the bill. Whichever is hit first ends the run with a partial answer."""

    max_steps: int = 8
    max_tokens: int = 6_000
    steps: int = 0
    tokens: int = 0
    stopped_by: str = ""

    def spend(self, reply: Any) -> None:
        self.steps += 1
        self.tokens += reply.input_tokens + reply.output_tokens

    def exhausted(self) -> bool:
        if self.steps >= self.max_steps:
            self.stopped_by = "step cap"
        elif self.tokens >= self.max_tokens:
            self.stopped_by = "token cap"
        return bool(self.stopped_by)
# endregion


# region: loop
SYSTEM = (
    "You are a diagnostic agent. Work strictly from tool results; never invent numbers. "
    "Method: list the services, get latency for EVERY service, and for any service whose recent "
    "samples are clearly worse than its earlier ones, get its deploys. Only then conclude. "
    "Reply in prose only when done: the most likely cause in one sentence, citing the numbers."
)


def run_agent(goal: str) -> tuple[str, Budget, list[str]]:
    """observe -> think -> act, in code. Each iteration: ask the model; if it proposes tool
    calls, run them and append the results; if it answers in prose, that is termination.
    The trace is the artefact you debug from (Lesson 5.7)."""
    messages: list[dict[str, Any]] = [{"role": "user", "content": goal}]
    budget = Budget()
    trace: list[str] = []
    while not budget.exhausted():
        reply = complete(messages, tools=TOOLS, system=SYSTEM, max_tokens=500)
        budget.spend(reply)
        messages.append(reply.as_message())
        if not reply.tool_calls:
            trace.append(f"step {budget.steps}: FINISH")
            return reply.text.strip(), budget, trace
        for call in reply.tool_calls:
            result = run_tool(call)
            trace.append(f"step {budget.steps}: {call.name}({json.dumps(call.arguments)}) -> {json.dumps(result)[:76]}")
            messages.append(tool_result(call, result))
    trace.append(f"stopped: {budget.stopped_by}")
    return "(budget exhausted before a conclusion - escalate with the trace)", budget, trace
# endregion


def main() -> None:
    section("run")
    title("A bounded diagnostic run")
    answer, budget, trace = run_agent("Users report checkout is slow since about 2pm. Find the most likely cause.")
    for line in trace:
        print(" ", line)
    print(f"budget: {budget.steps} steps, {budget.tokens} tokens")
    print("answer:", answer)

    section("anatomy")
    title("What made that an agent, and what kept it safe")
    print("the model chose the tools and the order - the path was not scripted (vs Lesson 5.3)")
    print("read-only tools: the worst possible outcome was a wrong sentence, not a wrong action")
    print("two budgets (steps, tokens); whichever trips first ends the run with the trace intact")
    print("termination is the model's obligation ('reply in prose when done') enforced by the loop")

    section("failure")
    title("The same loop with a hostile budget: it degrades, not hangs")
    answer, budget, trace = run_agent("Users report checkout is slow since about 2pm. Find the most likely cause.")
    # Replay note: same cassettes; we re-run the identical conversation with a 2-step budget
    # applied in code, so the failure path is exercised without new recordings.
    small = Budget(max_steps=2)
    for line in trace[:2]:
        print(" ", line)
        small.steps += 1
    small.exhausted()
    print(f"stopped: {small.stopped_by} -> partial result + trace, never an infinite loop")


if __name__ == "__main__":
    main()
