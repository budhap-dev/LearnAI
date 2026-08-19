/**
 * Lesson 4.5 - Reasoning models and thinking budgets
 *
 * Newer models can "think" before they answer - spend tokens working through the problem -
 * and expose a dial for how hard. More thinking helps on genuinely multi-step problems, costs
 * tokens and latency, and does nothing for tasks that were never about reasoning. The way to
 * find out which you have is to measure.
 *
 * Run:  node m04_prompting/l05_reasoning.ts
 */

import { section, title } from '../src/learnai/index.ts';
import { complete } from '../src/learnai/llm.ts';

// region: task
// A small scheduling puzzle with one checkable answer, and a lookup that needs no thought.
const PUZZLE = `Four deploys must run in sequence in one maintenance window: API, DB, Web, Worker.
Constraints:
- DB must run before API and before Worker.
- Web must run immediately after API.
- Worker cannot be last.
List the only valid order, comma-separated, and nothing else.`;
const PUZZLE_ANSWER = 'DB, Worker, API, Web';

const LOOKUP = 'What is the capital of Portugal? Answer with the city name only.';
const LOOKUP_ANSWER = 'Lisbon';
// endregion

// region: run
/** Same task, different thinking effort. Output tokens include the thinking the model did. */
async function attempt(task: string, effort: 'low' | 'high'): Promise<[string, number]> {
  const result = await complete(task, { effort, maxTokens: 4000 });
  return [result.text.trim(), result.outputTokens];
}
// endregion

async function main(): Promise<void> {
  section('puzzle');
  title('A multi-step puzzle at low and high effort');
  for (const effort of ['low', 'high'] as const) {
    const [answer, outTokens] = await attempt(PUZZLE, effort);
    const ok = answer.replace(/ /g, '').toLowerCase() === PUZZLE_ANSWER.replace(/ /g, '').toLowerCase();
    console.log(`  effort=${effort.padEnd(4)}  output tokens=${String(outTokens).padStart(5)}  answer=${answer.padEnd(28)} ${ok ? 'correct' : 'WRONG'}`);
  }

  section('lookup');
  title('A lookup that needs no reasoning, at the same two settings');
  for (const effort of ['low', 'high'] as const) {
    const [answer, outTokens] = await attempt(LOOKUP, effort);
    const ok = answer.toLowerCase().includes(LOOKUP_ANSWER.toLowerCase());
    console.log(`  effort=${effort.padEnd(4)}  output tokens=${String(outTokens).padStart(5)}  answer=${answer.padEnd(28)} ${ok ? 'correct' : 'WRONG'}`);
  }

  section('takeaway');
  title('Measure where thinking pays');
  console.log('Thinking tokens are billed as output. Where the task is genuinely multi-step they buy accuracy;');
  console.log('where it is a lookup or a transform they buy nothing but latency and cost. Route by task,');
  console.log('set effort per prompt, and verify the answer in code either way - reasoning text is still text.');
}

await main();
