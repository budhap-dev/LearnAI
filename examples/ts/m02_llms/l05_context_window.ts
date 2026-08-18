/**
 * Lesson 2.5 - Context windows
 *
 * The context window is one fixed token budget. The system prompt, the conversation so far,
 * anything you retrieve, and the answer the model writes all come out of the same number.
 * When they do not fit, something is dropped - and if you did not decide what, the API or
 * your own code decided for you, silently.
 *
 * This example makes the budget explicit: measure each part, reserve room for the answer,
 * and apply a deliberate truncation policy when the total is too big.
 *
 * Token counts here use the ~4 characters per token rule of thumb from Lesson 2.2 so the
 * example runs anywhere; in production, count with the model's real tokeniser.
 *
 * Run:  node m02_llms/l05_context_window.ts
 */

import { section, title } from '../src/learnai/index.ts';

// region: estimate
/** Rule of thumb for English prose. Replace with the model's tokeniser in real code. */
function estimateTokens(text: string): number {
  return Math.max(1, Math.floor(text.length / 4 + 0.5));
}
// endregion

// region: budget
/** Everything that has to fit in the window, and the arithmetic that says whether it does. */
class ContextBudget {
  window: number; // the model's context limit, in tokens
  system: string;
  history: string[]; // oldest first
  retrieved: string[]; // most relevant first
  reserveForAnswer: number; // never let the input squeeze the output to nothing

  constructor(window: number, system: string, history: string[] = [], retrieved: string[] = [], reserve = 500) {
    this.window = window;
    this.system = system;
    this.history = history;
    this.retrieved = retrieved;
    this.reserveForAnswer = reserve;
  }

  used(): Record<string, number> {
    const sum = (xs: string[]) => xs.reduce((n, x) => n + estimateTokens(x), 0);
    return {
      system: estimateTokens(this.system),
      history: sum(this.history),
      retrieved: sum(this.retrieved),
      answer: this.reserveForAnswer,
    };
  }

  total(): number {
    return Object.values(this.used()).reduce((a, b) => a + b, 0);
  }

  fits(): boolean {
    return this.total() <= this.window;
  }
}
// endregion

// region: fit
/**
 * Trim until it fits, in a deliberate order, and say what was dropped.
 *
 * Policy here, for a support assistant that must answer from documents: drop the oldest
 * conversation turns first (keeping the last two), then the least-relevant documents.
 * The system prompt and the answer reserve are never touched. A different product would
 * choose differently - the point is to *choose*, and to log it.
 */
function fit(budget: ContextBudget): string[] {
  const dropped: string[] = [];
  while (!budget.fits() && budget.history.length > 2) {
    dropped.push(`history turn ${dropped.length + 1}`);
    budget.history.shift(); // oldest first
  }
  while (!budget.fits() && budget.retrieved.length) {
    dropped.push(`retrieved doc #${budget.retrieved.length}`);
    budget.retrieved.pop(); // least relevant is last
  }
  return dropped;
}
// endregion

function show(budget: ContextBudget): void {
  const used = budget.used();
  const width = 40;
  const scale = width / Math.max(budget.window, budget.total()); // shrink the bar if it overflows
  const bar = Object.entries(used)
    .filter(([, n]) => n)
    .map(([part, n]) => part[0].toUpperCase().repeat(Math.max(1, Math.floor(n * scale + 0.5))))
    .join('');
  const limit = Math.floor(budget.window * scale + 0.5);
  console.log(`window ${String(budget.window).padStart(6)} tokens  |${bar.slice(0, limit).padEnd(limit)}|${bar.slice(limit)}`);
  for (const [part, n] of Object.entries(used)) {
    const pct = `${((n / budget.window) * 100).toFixed(1)}%`;
    console.log(`  ${part.padEnd(9)} ${String(n).padStart(6)}  ${pct.padStart(6)}`);
  }
  console.log(`  ${'total'.padEnd(9)} ${String(budget.total()).padStart(6)}  ${budget.fits() ? 'fits' : 'does not fit'}`);
}

function main(): void {
  const system = 'You are a support assistant for Acme. Answer only from the provided documents. '.repeat(3);
  const history = Array.from({ length: 12 }, (_, i) =>
    `turn ${i + 1}: ` + "an earlier question and the assistant's full answer. ".repeat(20),
  );
  const docs = Array.from({ length: 8 }, (_, i) =>
    `doc ${i + 1}: ` + 'retrieved policy text relevant to the question. '.repeat(40),
  );

  section('measure');
  title('Measure every part before you send anything');
  const small = new ContextBudget(4000, system, history.slice(-2), docs.slice(0, 2));
  show(small);

  section('overflow');
  title('The same request with more history and more retrieval no longer fits');
  const big = new ContextBudget(4000, system, [...history], [...docs]);
  show(big);

  section('fit');
  title('Apply a policy you chose - and log what was dropped');
  const dropped = fit(big);
  show(big);
  console.log('dropped:', dropped.join(', '));

  section('bigger-window');
  title('A bigger window is not free: cost and latency scale with tokens sent');
  for (const window of [4_000, 32_000, 200_000]) {
    const filled = Math.floor(window * 0.9 + 0.5);
    console.log(
      `${String(window).padStart(7)}-token window filled to 90% = ${String(filled).padStart(7)} input tokens per request, ` +
        `x${(filled / 3_600).toFixed(0).padStart(4)} the cost of the 4k case`,
    );
  }
  console.log('Long context lets you send more. It does not make sending more a good idea:');
  console.log('every token is paid for, adds latency, and dilutes the ones that matter.');
}

main();
