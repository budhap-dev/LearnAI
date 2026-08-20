/**
 * Lesson 9.3 - Latency and throughput
 *
 * A model call's latency is not one number. It is time-to-first-token (TTFT) plus
 * output_tokens / generation_rate. Streaming changes which part the user feels; batching and
 * parallelism change throughput. And you report percentiles, never the mean - the p95 is what
 * your SLO is about, because it is the experience of your worst-served one-in-twenty requests.
 *
 * Deterministic: a simple latency model over synthetic requests. No real calls (their timings
 * would not be reproducible - Lesson 2.7).
 *
 * Run:  node m09_production/l03_latency.ts
 */

import { section, title } from '../src/learnai/index.ts';

// region: model
/**
 * The two numbers that make up a response time:
 *   TTFT  - grows with the prompt (it must be read before the first token) plus a fixed base
 *   total - TTFT + the time to generate the output at the model's token rate
 * Returns [ttft, total] in ms.
 */
function latencyMs(promptTokens: number, outputTokens: number, ttftMs: number, tokensPerS: number): [number, number] {
  const ttft = ttftMs + promptTokens * 0.05; // ~0.05ms/token to process the prompt
  const generate = (outputTokens / tokensPerS) * 1000;
  return [ttft, ttft + generate];
}
// endregion

// region: percentiles
/** The p-th percentile by the nearest-rank method (deterministic, no interpolation). */
function percentile(values: number[], p: number): number {
  const s = [...values].sort((a, b) => a - b);
  const k = Math.max(0, Math.min(s.length - 1, Math.floor((p / 100) * s.length + 0.5) - 1));
  return s[k];
}

const f = (n: number, w: number) => n.toFixed(0).padStart(w);

function summarise(values: number[]): string {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return `mean=${f(mean, 6)}  p50=${f(percentile(values, 50), 6)}  p95=${f(percentile(values, 95), 6)}  p99=${f(percentile(values, 99), 6)}  (ms)`;
}
// endregion

// region: traffic
/**
 * A day's requests as [promptTokens, outputTokens]. Mostly small, a heavy tail of long ones -
 * which is exactly why the mean lies and the p95 matters.
 */
function traffic(): [number, number][] {
  const reqs: [number, number][] = [];
  for (let i = 0; i < 950; i++) reqs.push([400 + (i % 5) * 100, 120 + (i % 4) * 40]); // the common case
  for (let i = 0; i < 50; i++) reqs.push([6000 + (i % 5) * 1000, 900 + (i % 3) * 300]); // the heavy tail
  return reqs;
}
// endregion

function main(): void {
  const reqs = traffic();

  section('two-numbers');
  title('Latency is TTFT plus generation time');
  for (const [label, pt, ot] of [['short', 500, 150], ['long', 8000, 1200]] as [string, number, number][]) {
    const [ttft, total] = latencyMs(pt, ot, 200, 60);
    console.log(
      `  ${label.padEnd(6)} prompt=${String(pt).padStart(5)} out=${String(ot).padStart(4)}: TTFT=${f(ttft, 5)}ms  total=${f(total, 6)}ms  (generation=${f(total - ttft, 5)}ms)`,
    );
  }
  console.log('  output dominates total; prompt size dominates TTFT - they are tuned separately');

  section('percentiles');
  title('Report percentiles, not the mean - the tail is the SLO');
  const totals = reqs.map(([pt, ot]) => latencyMs(pt, ot, 200, 60)[1]);
  console.log(`  non-streaming total:  ${summarise(totals)}`);
  console.log('  the mean hides the 50 heavy requests; p95/p99 are the experience you promise against');

  section('streaming');
  title('Streaming moves the number the user feels to TTFT');
  const ttfts = reqs.map(([pt, ot]) => latencyMs(pt, ot, 200, 60)[0]);
  console.log(`  streaming (TTFT):     ${summarise(ttfts)}`);
  console.log('  same total work, but the user starts reading at p95 TTFT, not p95 total - a 10x better feel');

  section('throughput');
  title('Throughput is a separate axis from latency');
  const concurrency = 8;
  const perReqS = totals.reduce((a, b) => a + b, 0) / totals.length / 1000;
  const rps = concurrency / perReqS;
  console.log(`  avg latency ${(perReqS * 1000).toFixed(0)}ms, concurrency ${concurrency} -> ~${rps.toFixed(1)} req/s capacity`);
  console.log('  to serve more: raise concurrency (needs provider headroom), shorten outputs, or batch offline');

  section('levers');
  title('The latency levers, in order of effect');
  console.log('stream: cut perceived latency to TTFT (biggest UX win, no quality cost) - Lesson 5.2');
  console.log('shorten output: total scales with output tokens; cap max_tokens, ask for terse answers');
  console.log('shrink prompt: TTFT scales with prompt; retrieve less, cache the stable prefix (5.5)');
  console.log('route by task: a small model has lower TTFT and higher tokens/s for easy work (5.6)');
  console.log('measure p95/p99 continuously; alert on the tail, not the mean (9.8)');
}

main();
