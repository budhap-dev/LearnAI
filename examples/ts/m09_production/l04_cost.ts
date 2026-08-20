/**
 * Lesson 9.4 - Cost engineering
 *
 * Cost is not a bill you receive; it is a number you engineer. Four levers, each independent
 * and each a percentage off the top: route cheap work to a cheap model, cache the stable
 * prompt prefix, batch anything nobody is waiting for, and distil a fine-tuned small model for
 * a high-volume task. This example runs one workload through all four and shows the running
 * total - and then shows the showback report that makes cost a team habit, not a surprise.
 *
 * Deterministic arithmetic; prices are parameters (see the model reference).
 *
 * Run:  node m09_production/l04_cost.ts
 */

import { section, title } from '../src/learnai/index.ts';

// region: prices
// USD per million tokens - illustrative tiers, look them up in the model reference.
const PRICES: Record<string, { in: number; in_cached: number; out: number }> = {
  large: { in: 5.0, in_cached: 0.5, out: 25.0 },
  small: { in: 1.0, in_cached: 0.1, out: 5.0 },
  distilled: { in: 0.3, in_cached: 0.03, out: 1.5 }, // your fine-tuned small model
};
const BATCH_DISCOUNT = 0.5;
// endregion

// region: workload
interface Segment {
  name: string;
  requests: number;
  stableIn: number; // cacheable prefix tokens (system, examples)
  variableIn: number; // per-request tokens (question, retrieved)
  out: number;
  kind: string; // classify | extract | answer | reason
  waiting: boolean; // is a human waiting on it?
}

const WORKLOAD: Segment[] = [
  { name: 'triage', requests: 200_000, stableIn: 800, variableIn: 400, out: 30, kind: 'classify', waiting: false },
  { name: 'extract', requests: 60_000, stableIn: 1200, variableIn: 2000, out: 200, kind: 'extract', waiting: false },
  { name: 'chat', requests: 120_000, stableIn: 1500, variableIn: 1500, out: 400, kind: 'answer', waiting: true },
  { name: 'analysis', requests: 8_000, stableIn: 2000, variableIn: 6000, out: 900, kind: 'reason', waiting: true },
];
// endregion

// region: cost
function cost(seg: Segment, model: string, cacheHitRate: number, batched: boolean): number {
  const p = PRICES[model];
  const cached = seg.stableIn * cacheHitRate;
  const freshIn = seg.stableIn * (1 - cacheHitRate) + seg.variableIn;
  let perReq = (cached * p.in_cached + freshIn * p.in + seg.out * p.out) / 1_000_000;
  if (batched) perReq *= BATCH_DISCOUNT;
  return perReq * seg.requests;
}

function route(seg: Segment): string {
  return seg.kind === 'classify' || seg.kind === 'extract' ? 'small' : 'large';
}
// endregion

const money = (n: number, w: number) => n.toFixed(2).padStart(w);

function main(): void {
  section('baseline');
  title('Everything on the large model, no caching, all online');
  const base = WORKLOAD.reduce((s, seg) => s + cost(seg, 'large', 0.0, false), 0);
  for (const s of WORKLOAD) console.log(`  ${s.name.padEnd(9)} $${money(cost(s, 'large', 0.0, false), 8)}/day`);
  console.log(`  TOTAL     $${money(base, 8)}/day   ($${(base * 30).toLocaleString('en-US', { maximumFractionDigits: 0 })}/month)`);

  section('levers');
  title('Apply the four levers, one at a time - each a cut off the running total');
  let running = base;
  const steps: [string, number][] = [];

  steps.push(['route cheap work to a small model', WORKLOAD.reduce((s, seg) => s + cost(seg, route(seg), 0.0, false), 0)]);
  steps.push(['+ cache the stable prompt prefix (90% hit)', WORKLOAD.reduce((s, seg) => s + cost(seg, route(seg), 0.9, false), 0)]);
  steps.push(['+ batch what nobody is waiting for', WORKLOAD.reduce((s, seg) => s + cost(seg, route(seg), 0.9, !seg.waiting), 0)]);

  const withDistill = (s: Segment) => cost(s, s.kind === 'classify' || s.kind === 'extract' ? 'distilled' : route(s), 0.9, !s.waiting);
  steps.push(['+ distil the high-volume tasks onto a fine-tuned small model', WORKLOAD.reduce((s, seg) => s + withDistill(seg), 0)]);

  for (const [label, total] of steps) {
    const pct = (1 - total / base) * 100;
    console.log(`  ${label.padEnd(56)} $${money(total, 8)}/day  (${pct.toFixed(0).padStart(2)}% off)`);
    running = total;
  }
  console.log(`  final: $${running.toFixed(2)}/day vs $${base.toFixed(2)}/day - ${((1 - running / base) * 100).toFixed(0)}% cheaper, same product`);

  section('showback');
  title('Showback: cost per segment, so teams own their spend');
  for (const s of WORKLOAD) {
    const c = withDistill(s);
    const per1k = (c / s.requests) * 1000;
    console.log(`  ${s.name.padEnd(9)} $${money(c, 7)}/day  $${per1k.toFixed(4)}/1k requests  (${s.requests.toLocaleString('en-US')} req)`);
  }
  console.log('  attribute cost to the team/feature that spends it; a number nobody owns only grows');

  section('rules');
  title('The cost engineering habits');
  console.log('route first: the cheapest call is on the cheapest model that passes the eval (5.6, 8.4)');
  console.log('cache the prefix: stable-first prompt layout turns 90% of input into cached input (5.5)');
  console.log('batch the unwatched: nightly, backfills, evals -> the async endpoint at a discount');
  console.log('distil at volume: a fine-tuned small model repays its training cost fast on hot paths (10.3)');
  console.log('measure per feature and alert on cost/request, not just the total - a regression is a bug');
}

main();
