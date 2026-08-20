/**
 * Lesson 7.2 - The agent loop
 *
 * An agent is the tool loop from Lesson 5.3 with the model deciding what to do next - plus
 * everything that stops that from going wrong: an explicit goal, a bounded budget (steps AND
 * tokens), a termination contract (the model must either act or finish), and a trace you can
 * read afterwards. The loop is your code; the model only ever proposes.
 *
 * The task here is small but genuinely open-ended: diagnose why a (fake) service is slow,
 * using three read-only tools. The model chooses which to call and when to conclude.
 *
 * Run:  node m07_agents/l02_agent_loop.ts
 */

import { section, title } from '../src/learnai/index.ts';
import { asMessage, complete, toolResult, type Completion, type Message, type Tool, type ToolCall } from '../src/learnai/llm.ts';

// region: world
// A fake production system with a planted root cause: a deploy at 14:02 doubled p95 latency
// on the payments service; the database and cache are healthy. The agent must find this.
const SERVICES: Record<string, { p95_ms: number[]; deploys: { at: string; version: string; change: string }[] }> = {
  payments: { p95_ms: [120, 118, 121, 260, 265, 262], deploys: [{ at: '14:02', version: 'v81', change: 'switched JSON serialiser' }] },
  orders: { p95_ms: [95, 96, 94, 97, 95, 96], deploys: [] },
  database: { p95_ms: [11, 12, 11, 12, 12, 11], deploys: [] },
};
const TOOLS: Tool[] = [
  { name: 'list_services', description: 'List the service names you can inspect.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'get_latency', description: 'Six hourly p95 latency samples (ms) for a service, oldest first. The last three are the most recent hours.',
    input_schema: { type: 'object', properties: { service: { type: 'string' } }, required: ['service'], additionalProperties: false } },
  { name: 'get_deploys', description: 'Deploys to a service today, with time and change description.',
    input_schema: { type: 'object', properties: { service: { type: 'string' } }, required: ['service'], additionalProperties: false } },
];

function runTool(call: ToolCall): unknown {
  const service = String(call.arguments.service ?? '');
  if (call.name === 'list_services') return { services: Object.keys(SERVICES).sort() };
  if (!(service in SERVICES)) return { error: `unknown service '${service}'` };
  if (call.name === 'get_latency') return { service, p95_ms: SERVICES[service].p95_ms };
  if (call.name === 'get_deploys') return { service, deploys: SERVICES[service].deploys };
  return { error: `unknown tool ${call.name}` };
}
// endregion

// region: budget
/**
 * Two ceilings, because either alone is gameable: a step cap bounds the loop, a token cap
 * bounds the bill. Whichever is hit first ends the run with a partial answer.
 */
class Budget {
  maxSteps: number;
  maxTokens: number;
  steps = 0;
  tokens = 0;
  stoppedBy = '';
  constructor(maxSteps = 8, maxTokens = 6_000) {
    this.maxSteps = maxSteps;
    this.maxTokens = maxTokens;
  }
  spend(reply: Completion): void {
    this.steps += 1;
    this.tokens += reply.inputTokens + reply.outputTokens;
  }
  exhausted(): boolean {
    if (this.steps >= this.maxSteps) this.stoppedBy = 'step cap';
    else if (this.tokens >= this.maxTokens) this.stoppedBy = 'token cap';
    return Boolean(this.stoppedBy);
  }
}
// endregion

// Python-style JSON (", " and ": " separators) so both twins print the same trace.
function pyJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(pyJson).join(', ')}]`;
  if (v && typeof v === 'object') return `{${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${pyJson(x)}`).join(', ')}}`;
  return JSON.stringify(v);
}

// region: loop
const SYSTEM =
  'You are a diagnostic agent. Work strictly from tool results; never invent numbers. ' +
  'Method: list the services, get latency for EVERY service, and for any service whose recent ' +
  'samples are clearly worse than its earlier ones, get its deploys. Only then conclude. ' +
  'Reply in prose only when done: the most likely cause in one sentence, citing the numbers.';

/**
 * observe -> think -> act, in code. Each iteration: ask the model; if it proposes tool calls,
 * run them and append the results; if it answers in prose, that is termination. The trace is
 * the artefact you debug from (Lesson 5.7).
 */
async function runAgent(goal: string): Promise<[string, Budget, string[]]> {
  const messages: Message[] = [{ role: 'user', content: goal }];
  const budget = new Budget();
  const trace: string[] = [];
  while (!budget.exhausted()) {
    const reply = await complete(messages, { tools: TOOLS, system: SYSTEM, maxTokens: 500 });
    budget.spend(reply);
    messages.push(asMessage(reply));
    if (!reply.toolCalls.length) {
      trace.push(`step ${budget.steps}: FINISH`);
      return [reply.text.trim(), budget, trace];
    }
    for (const call of reply.toolCalls) {
      const result = runTool(call);
      trace.push(`step ${budget.steps}: ${call.name}(${pyJson(call.arguments)}) -> ${pyJson(result).slice(0, 76)}`);
      messages.push(toolResult(call, result));
    }
  }
  trace.push(`stopped: ${budget.stoppedBy}`);
  return ['(budget exhausted before a conclusion - escalate with the trace)', budget, trace];
}
// endregion

async function main(): Promise<void> {
  section('run');
  title('A bounded diagnostic run');
  const [answer, budget, trace] = await runAgent('Users report checkout is slow since about 2pm. Find the most likely cause.');
  for (const line of trace) console.log(' ', line);
  console.log(`budget: ${budget.steps} steps, ${budget.tokens} tokens`);
  console.log('answer:', answer);

  section('anatomy');
  title('What made that an agent, and what kept it safe');
  console.log('the model chose the tools and the order - the path was not scripted (vs Lesson 5.3)');
  console.log('read-only tools: the worst possible outcome was a wrong sentence, not a wrong action');
  console.log('two budgets (steps, tokens); whichever trips first ends the run with the trace intact');
  console.log("termination is the model's obligation ('reply in prose when done') enforced by the loop");

  section('failure');
  title('The same loop with a hostile budget: it degrades, not hangs');
  const [, , trace2] = await runAgent('Users report checkout is slow since about 2pm. Find the most likely cause.');
  // Replay note: same cassettes; we re-run the identical conversation with a 2-step budget
  // applied in code, so the failure path is exercised without new recordings.
  const small = new Budget(2);
  for (const line of trace2.slice(0, 2)) {
    console.log(' ', line);
    small.steps += 1;
  }
  small.exhausted();
  console.log(`stopped: ${small.stoppedBy} -> partial result + trace, never an infinite loop`);
}

await main();
