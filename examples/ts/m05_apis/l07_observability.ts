/**
 * Lesson 5.7 - Observability from day one
 *
 * When an LLM feature misbehaves, the question is always "what did the model actually
 * receive, and what did it actually say?". If you did not record that per request, you are
 * guessing. This example wraps the adapter in a tracer that records, for every call: a trace
 * id, the prompt version and hash, the model, tokens in/out and the cost, the stop reason,
 * whether the output passed validation, and a redacted preview - then prints the trace the
 * way it would land in your logging/tracing system.
 *
 * Latency is the one field missing here: replayed calls have none. In production it is the
 * first column (Lesson 9.3).
 *
 * Run:  node m05_apis/l07_observability.ts
 */

import { createHash } from 'node:crypto';
import { section, title } from '../src/learnai/index.ts';
import { complete, type CompleteOptions, type Completion } from '../src/learnai/llm.ts';

// region: span
interface Span {
  trace_id: string;
  step: string;
  prompt_id: string;
  prompt_hash: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_micro_usd: number; // integer micro-dollars: exact, sortable, no float noise in logs
  stop_reason: string;
  validated: boolean;
  output_preview: string;
}

const PRICE_IN = 1.0, PRICE_OUT = 5.0; // USD per million tokens; a parameter, not a fact
// endregion

// region: redact
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/g;
const CARD = /\b\d(?:[ -]?\d){12,15}\b/g;

/**
 * Logs outlive requests and have wider access. Strip the obvious PII before it lands; keep
 * enough to debug. Never log the raw prompt and response into a system people cannot get
 * cleared to read.
 */
function redact(text: string): string {
  return text.replace(EMAIL, '[email]').replace(CARD, '[card]');
}
// endregion

// region: traced-call
/**
 * One model call, one span. The prompt hash ties the span to the exact text sent (and to the
 * registry entry, Lesson 4.4); `validated` says whether the output was usable - which is the
 * number you alert on, not the error rate.
 */
async function tracedComplete(
  traceId: string, step: string, promptId: string, messages: string,
  validate: (t: string) => boolean, options: CompleteOptions,
): Promise<[Completion, Span]> {
  const promptHash = createHash('sha256').update(JSON.stringify(messages), 'utf8').digest('hex').slice(0, 10);
  const reply = await complete(messages, options);
  const ok = validate(reply.text);
  const span: Span = {
    trace_id: traceId, step, prompt_id: promptId, prompt_hash: promptHash, model: reply.model,
    input_tokens: reply.inputTokens, output_tokens: reply.outputTokens,
    cost_micro_usd: Math.round(reply.inputTokens * PRICE_IN + reply.outputTokens * PRICE_OUT),
    stop_reason: reply.stopReason, validated: ok,
    output_preview: redact(reply.text.trim()).slice(0, 60),
  };
  return [reply, span];
}
// endregion

async function main(): Promise<void> {
  const traceId = 'tr-7f3a9c';
  const email = 'From: dana.k@example.com\nMy card 4111 1111 1111 1111 was charged twice for order ORD-1042. Please refund one charge.';

  section('trace');
  title('One request, two model steps, one trace');
  const spans: Span[] = [];
  const [r1, s1] = await tracedComplete(
    traceId, 'classify', 'ticket-classify@3',
    `Classify this support email as exactly one of: billing, bug, how-to, other. Reply with the label only.\n\n${email}`,
    (t) => ['billing', 'bug', 'how-to', 'other'].includes(t.trim().toLowerCase()), { maxTokens: 10 },
  );
  spans.push(s1);
  const [, s2] = await tracedComplete(
    traceId, 'draft-reply', 'ticket-reply@5',
    `Write a two-sentence reply acknowledging this ${r1.text.trim().toLowerCase()} issue and saying a human will follow up within one business day. Do not promise a refund.\n\n${email}`,
    (t) => !t.toLowerCase().includes('refund') || t.toLowerCase().includes('follow up'), { maxTokens: 120 },
  );
  spans.push(s2);
  for (const s of spans) console.log(JSON.stringify(s));

  section('aggregate');
  title('What you aggregate from spans (per prompt id, per model, per day)');
  const sum = (f: (s: Span) => number) => spans.reduce((a, s) => a + f(s), 0);
  console.log(
    `  trace ${traceId}: steps=${spans.length} tokens=${sum((s) => s.input_tokens)}+${sum((s) => s.output_tokens)} ` +
      `cost=${sum((s) => s.cost_micro_usd)} micro-USD validated=${spans.every((s) => s.validated)}`,
  );
  console.log('  dashboards: p50/p95 latency, tokens per part, cost per tenant, validation-pass rate per prompt id, cache hit rate');
  console.log('  alerts: validation-pass rate drops, cost per request jumps, a prompt hash you did not deploy appears');

  section('redaction');
  title('What the log holds versus what the model saw');
  console.log('  model saw :', email.split('\n')[1].slice(0, 60) + '...');
  console.log('  log holds :', redact(email.split('\n')[1]).slice(0, 60) + '...');
  console.log('  keep raw prompts, if at all, in a short-retention store with access control - not in the app log');
}

await main();
