/**
 * Lesson 2.7 - Sampling
 *
 * The model outputs a probability for every token. Something has to turn that into *one*
 * token, and that something is the sampler. Temperature, top-p and top-k are all knobs on
 * the sampler - they never change what the model "knows", only how a token is picked from
 * the distribution it produced.
 *
 * This example takes one fixed next-token distribution and shows exactly what each knob
 * does to it. The random numbers come from a tiny seeded generator implemented identically
 * in the Python and TypeScript versions, so both print the same "random" choices - which is
 * also the lesson about seeds: reproducible does not mean deterministic in production.
 *
 * Run:  node m02_llms/l07_sampling.ts
 */

import { section, title } from '../src/learnai/index.ts';

type Dist = Map<string, number>;

// region: distribution
// The model's raw output for one step: a score ("logit") per candidate token. Higher = more
// likely. These are the last-layer numbers *before* they become probabilities.
const LOGITS: Dist = new Map([
  [' the', 3.2],
  [' a', 2.6],
  [' an', 1.1],
  [' this', 0.9],
  [' every', 0.2],
  [' purple', -1.5],
]);
// endregion

/** Highest probability first; ties broken alphabetically, matching the Python twin. */
const byProb = (d: Dist) => [...d].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));

// region: softmax
/**
 * Turn scores into probabilities that sum to 1. Temperature divides the scores first:
 *
 *   < 1  sharpens the distribution (the favourite gets even more likely)
 *   = 1  the model's own distribution
 *   > 1  flattens it (rare tokens get a real chance)
 *   -> 0 becomes greedy: the top token gets probability 1
 */
function softmax(logits: Dist, temperature = 1.0): Dist {
  if (temperature <= 0) {
    const [top] = byProb(logits)[0];
    return new Map([...logits.keys()].map((t) => [t, t === top ? 1 : 0]));
  }
  const scaled = new Map([...logits].map(([t, v]) => [t, Math.exp(v / temperature)]));
  const total = [...scaled.values()].reduce((a, b) => a + b, 0);
  return new Map([...scaled].map(([t, v]) => [t, v / total]));
}
// endregion

// region: truncate
/** Keep only the k most likely tokens, then renormalise. */
function topK(probs: Dist, k: number): Dist {
  const kept = byProb(probs).slice(0, k);
  const total = kept.reduce((s, [, p]) => s + p, 0);
  return new Map(kept.map(([t, p]) => [t, p / total]));
}

/**
 * Nucleus sampling: keep the smallest set of tokens whose probability adds up to >= p.
 *
 * Unlike top-k this adapts: a confident step keeps one or two tokens, an open-ended step
 * keeps many. It is the truncation most APIs expose alongside temperature.
 */
function topP(probs: Dist, p: number): Dist {
  const kept: [string, number][] = [];
  let running = 0;
  for (const [t, prob] of byProb(probs)) {
    kept.push([t, prob]);
    running += prob;
    if (running >= p) break;
  }
  const total = kept.reduce((s, [, v]) => s + v, 0);
  return new Map(kept.map(([t, v]) => [t, v / total]));
}
// endregion

// region: sample
/**
 * A tiny linear congruential generator - the same in Python and TypeScript, so both
 * examples make identical picks. Never use this for anything but a demo.
 */
class Rng {
  state: number;
  constructor(seed: number) {
    this.state = seed % 2_147_483_647;
  }
  next(): number {
    this.state = (this.state * 48_271) % 2_147_483_647;
    return this.state / 2_147_483_647;
  }
}

/** Pick one token: draw a number in [0, 1) and walk the cumulative distribution. */
function sample(probs: Dist, rng: Rng): string {
  const r = rng.next();
  let running = 0;
  let last = '';
  for (const [t, p] of byProb(probs)) {
    running += p;
    last = t;
    if (r < running) return t;
  }
  return last; // floating-point slack: fall through to the last token
}
// endregion

function show(probs: Dist): void {
  for (const [t, p] of byProb(probs)) {
    console.log(`  ${`'${t}'`.padEnd(10)} ${p.toFixed(3).padStart(6)}  ${'#'.repeat(Math.floor(p * 40 + 0.5))}`);
  }
}

function main(): void {
  section('temperature');
  title('Temperature reshapes the distribution; it does not add knowledge');
  for (const temperature of [0.0, 0.5, 1.0, 2.0]) {
    console.log(`temperature = ${temperature.toFixed(1)}`);
    show(softmax(LOGITS, temperature));
  }

  section('truncation');
  title('Top-k and top-p cut the tail before sampling');
  const base = softmax(LOGITS);
  console.log('top-k, k = 3');
  show(topK(base, 3));
  console.log('top-p, p = 0.8');
  show(topP(base, 0.8));

  section('samples');
  title('The same prompt, sampled 20 times');
  const runs: [string, Dist][] = [
    ['temperature 0.0 (greedy)', softmax(LOGITS, 0.0)],
    ['temperature 0.7        ', softmax(LOGITS, 0.7)],
    ['temperature 1.5        ', softmax(LOGITS, 1.5)],
  ];
  for (const [label, probs] of runs) {
    const rng = new Rng(42);
    const picks = Array.from({ length: 20 }, () => sample(probs, rng).trim());
    console.log(`${label}: ${picks.join(' ')}`);
  }

  section('seed');
  title('A seed makes the sampler repeatable - it does not make the system deterministic');
  for (const run of [1, 2]) {
    const rng = new Rng(7);
    const picks = Array.from({ length: 8 }, () => sample(softmax(LOGITS, 1.0), rng).trim());
    console.log(`seed 7, run ${run}: ${picks.join(' ')}`);
  }
  console.log('Same seed, same picks - here. In production the model, its version, batching and');
  console.log('hardware all change the numbers upstream of the sampler. Treat outputs as samples.');
}

main();
