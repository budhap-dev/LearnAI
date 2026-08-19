"""
Lesson 5.3 - Tool / function calling

The model cannot look anything up, run anything, or change anything. Tool calling is how it
asks your code to: you describe functions (name, purpose, JSON schema of arguments); the
model replies "call this, with these arguments"; your code runs it and sends the result
back; the model continues. The loop lives in YOUR code - the model only ever emits text
that happens to be a structured request.

Run:  python3 m05_apis/l03_tool_calling.py
"""

from __future__ import annotations

import json
from typing import Any

from learnai import section, title
from learnai.llm import ToolCall, complete, tool_result

# region: tools
# Tool schemas: the contract the model sees. Descriptions matter - they are how the model
# decides WHEN to call. Keep arguments few, typed and enumerated where possible.
TOOLS = [
    {
        "name": "get_order",
        "description": "Look up a customer order by its id. Returns status, items and total.",
        "input_schema": {
            "type": "object",
            "properties": {"order_id": {"type": "string", "description": "e.g. ORD-1042"}},
            "required": ["order_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "calculate",
        "description": "Evaluate an arithmetic expression exactly. Use this for any maths instead of doing it yourself.",
        "input_schema": {
            "type": "object",
            "properties": {"expression": {"type": "string", "description": "e.g. (12.5 * 3) + 4.99"}},
            "required": ["expression"],
            "additionalProperties": False,
        },
    },
]

# A fake order system. In real life: your database, behind the same least-privilege rules
# as any other caller - the model's arguments are untrusted input (Lesson 7.3).
ORDERS = {
    "ORD-1042": {"status": "shipped", "items": [{"sku": "bracket", "qty": 40, "unit": 12.5}, {"sku": "jig", "qty": 2, "unit": 185}], "shipping": 45},
}
# endregion


# region: run-tool
def run_tool(call: ToolCall) -> Any:
    """Dispatch one tool call. Validate arguments; never trust them; return errors as data
    (the model can recover from 'not found' - it cannot recover from an exception in your
    process)."""
    if call.name == "get_order":
        order_id = str(call.arguments.get("order_id", ""))
        return ORDERS.get(order_id) or {"error": f"no order with id {order_id!r}"}
    if call.name == "calculate":
        expr = str(call.arguments.get("expression", ""))
        if not all(c in "0123456789.+-*/() " for c in expr):  # an allow-list, not eval()
            return {"error": "expression contains characters other than digits and + - * / ( )"}
        try:
            value = round(eval(expr, {"__builtins__": {}}), 2)  # noqa: S307 - allow-listed above
            return {"result": int(value) if float(value).is_integer() else value}
        except Exception as e:  # noqa: BLE001
            return {"error": f"could not evaluate: {e}"}
    return {"error": f"unknown tool {call.name}"}
# endregion


# region: loop
def agent_loop(question: str, max_steps: int = 5) -> tuple[str, list[str]]:
    """The tool loop. The model proposes calls; we execute them and feed results back;
    repeat until it answers in prose or we hit the step cap. The cap is not optional."""
    messages: list[dict[str, Any]] = [{"role": "user", "content": question}]
    trace: list[str] = []
    for step in range(1, max_steps + 1):
        reply = complete(
            messages, tools=TOOLS, max_tokens=400,
            system="You are an order-support assistant. Use the tools for facts and arithmetic; never guess a total.",
        )
        messages.append(reply.as_message())
        if not reply.tool_calls:
            trace.append(f"step {step}: final answer")
            return reply.text.strip(), trace
        for call in reply.tool_calls:
            result = run_tool(call)
            trace.append(f"step {step}: {call.name}({json.dumps(call.arguments)}) -> {json.dumps(result)[:70]}")
            messages.append(tool_result(call, result))
    trace.append(f"step {max_steps}: step cap reached")
    return "(no final answer - step cap reached)", trace
# endregion


def main() -> None:
    section("happy-path")
    title("Look up, calculate, answer")
    answer, trace = agent_loop("What is the total for order ORD-1042 including shipping?")
    for line in trace:
        print(" ", line)
    print("answer:", answer)

    section("tool-error")
    title("A tool error is data the model can recover from")
    answer, trace = agent_loop("What is the status of order ORD-9999?")
    for line in trace:
        print(" ", line)
    print("answer:", answer)

    section("contract")
    title("What the contract buys you")
    print("the model never touches the database; it asks, your code decides and executes")
    print("arguments are untrusted input: validated, allow-listed, least privilege (Lesson 7.3)")
    print("errors go back as data; exceptions stay in your process")
    print("a step cap bounds cost and loops - every tool loop needs one (Lesson 7.7)")


if __name__ == "__main__":
    main()
