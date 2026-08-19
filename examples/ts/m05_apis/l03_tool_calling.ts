/**
 * Lesson 5.3 - Tool / function calling
 *
 * The model cannot look anything up, run anything, or change anything. Tool calling is how it
 * asks your code to: you describe functions (name, purpose, JSON schema of arguments); the
 * model replies "call this, with these arguments"; your code runs it and sends the result
 * back; the model continues. The loop lives in YOUR code - the model only ever emits text
 * that happens to be a structured request.
 *
 * Run:  node m05_apis/l03_tool_calling.ts
 */

import { section, title } from '../src/learnai/index.ts';
import { asMessage, complete, toolResult, type Message, type Tool, type ToolCall } from '../src/learnai/llm.ts';

// region: tools
// Tool schemas: the contract the model sees. Descriptions matter - they are how the model
// decides WHEN to call. Keep arguments few, typed and enumerated where possible.
const TOOLS: Tool[] = [
  {
    name: 'get_order',
    description: 'Look up a customer order by its id. Returns status, items and total.',
    input_schema: {
      type: 'object',
      properties: { order_id: { type: 'string', description: 'e.g. ORD-1042' } },
      required: ['order_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'calculate',
    description: 'Evaluate an arithmetic expression exactly. Use this for any maths instead of doing it yourself.',
    input_schema: {
      type: 'object',
      properties: { expression: { type: 'string', description: 'e.g. (12.5 * 3) + 4.99' } },
      required: ['expression'],
      additionalProperties: false,
    },
  },
];

// A fake order system. In real life: your database, behind the same least-privilege rules
// as any other caller - the model's arguments are untrusted input (Lesson 7.3).
const ORDERS: Record<string, unknown> = {
  'ORD-1042': { status: 'shipped', items: [{ sku: 'bracket', qty: 40, unit: 12.5 }, { sku: 'jig', qty: 2, unit: 185 }], shipping: 45 },
};
// endregion

// region: run-tool
/**
 * Dispatch one tool call. Validate arguments; never trust them; return errors as data (the
 * model can recover from 'not found' - it cannot recover from an exception in your process).
 */
function runTool(call: ToolCall): unknown {
  if (call.name === 'get_order') {
    const orderId = String(call.arguments.order_id ?? '');
    return ORDERS[orderId] ?? { error: `no order with id '${orderId}'` };
  }
  if (call.name === 'calculate') {
    const expr = String(call.arguments.expression ?? '');
    if (!/^[0-9.+\-*/() ]*$/.test(expr)) return { error: 'expression contains characters other than digits and + - * / ( )' }; // an allow-list, not eval()
    try {
      const value = Function(`"use strict"; return (${expr});`)() as number; // allow-listed above
      return { result: Math.round(value * 100) / 100 };
    } catch (e) {
      return { error: `could not evaluate: ${(e as Error).message}` };
    }
  }
  return { error: `unknown tool ${call.name}` };
}
// endregion

// Python-style JSON (", " and ": " separators) so both twins print the same trace.
function pyJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(pyJson).join(', ')}]`;
  if (v && typeof v === 'object') return `{${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${pyJson(x)}`).join(', ')}}`;
  return JSON.stringify(v);
}

// region: loop
/**
 * The tool loop. The model proposes calls; we execute them and feed results back; repeat
 * until it answers in prose or we hit the step cap. The cap is not optional.
 */
async function agentLoop(question: string, maxSteps = 5): Promise<[string, string[]]> {
  const messages: Message[] = [{ role: 'user', content: question }];
  const trace: string[] = [];
  for (let step = 1; step <= maxSteps; step++) {
    const reply = await complete(messages, {
      tools: TOOLS, maxTokens: 400,
      system: 'You are an order-support assistant. Use the tools for facts and arithmetic; never guess a total.',
    });
    messages.push(asMessage(reply));
    if (!reply.toolCalls.length) {
      trace.push(`step ${step}: final answer`);
      return [reply.text.trim(), trace];
    }
    for (const call of reply.toolCalls) {
      const result = runTool(call);
      trace.push(`step ${step}: ${call.name}(${pyJson(call.arguments)}) -> ${pyJson(result).slice(0, 70)}`);
      messages.push(toolResult(call, result));
    }
  }
  trace.push(`step ${maxSteps}: step cap reached`);
  return ['(no final answer - step cap reached)', trace];
}
// endregion

async function main(): Promise<void> {
  section('happy-path');
  title('Look up, calculate, answer');
  let [answer, trace] = await agentLoop('What is the total for order ORD-1042 including shipping?');
  for (const line of trace) console.log(' ', line);
  console.log('answer:', answer);

  section('tool-error');
  title('A tool error is data the model can recover from');
  [answer, trace] = await agentLoop('What is the status of order ORD-9999?');
  for (const line of trace) console.log(' ', line);
  console.log('answer:', answer);

  section('contract');
  title('What the contract buys you');
  console.log('the model never touches the database; it asks, your code decides and executes');
  console.log('arguments are untrusted input: validated, allow-listed, least privilege (Lesson 7.3)');
  console.log('errors go back as data; exceptions stay in your process');
  console.log('a step cap bounds cost and loops - every tool loop needs one (Lesson 7.7)');
}

await main();
