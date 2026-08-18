/**
 * Lesson 4.4 - Prompts as code
 *
 * A prompt that matters lives in a string somewhere, edited by whoever, with no version, no
 * test and no owner - until it breaks in production. Treat it like code: a template with a
 * version, rendered from data, with a golden test that runs on every change.
 *
 * Run:  node m04_prompting/l04_prompts_as_code.ts
 */

import { createHash } from 'node:crypto';
import { section, title } from '../src/learnai/index.ts';
import { complete } from '../src/learnai/llm.ts';

// region: registry
// Prompts are versioned artefacts. Two versions of the same prompt: v2 fixes a real
// defect in v1 (it never told the model what to do with out-of-scope questions).
const PROMPTS: Record<string, { system: string; user: string }> = {
  'faq-answer@1': {
    system: "You answer questions about Acme's refund policy using the policy text provided.",
    user: 'Policy:\n{policy}\n\nQuestion: {question}',
  },
  'faq-answer@2': {
    system:
      "You answer questions about Acme's refund policy using ONLY the policy text provided. " +
      'If the policy does not cover the question, reply exactly: NOT_COVERED. Keep answers under 60 words.',
    user: '<policy>\n{policy}\n</policy>\n\nQuestion: {question}',
  },
};
// endregion

// region: render
/**
 * Render a versioned template. The hash of the rendered prompt is what you log with the
 * request - it lets you group traces by exact prompt, and spot 'someone edited the string'.
 */
function render(promptId: string, values: Record<string, string>): [string, string, string] {
  const spec = PROMPTS[promptId];
  const user = spec.user.replace(/\{(\w+)\}/g, (_, k: string) => values[k]);
  const digest = createHash('sha256').update(spec.system + '\n' + user, 'utf8').digest('hex').slice(0, 10);
  return [spec.system, user, digest];
}
// endregion

const POLICY =
  'Refunds are available within 14 days of purchase for annual plans, and within 48 hours ' +
  'for monthly plans. Refunds are issued to the original payment method within 5 business days.';

// region: golden
// A golden set: real questions with a checkable expectation. Not "the exact answer" (that
// varies) - a property code can check. This is a prompt's unit test.
interface Case { question: string; expect_contains: string | null; expect_not_covered: boolean }
const GOLDEN: Case[] = [
  { question: 'I bought an annual plan 10 days ago, can I get a refund?', expect_contains: '14 days', expect_not_covered: false },
  { question: 'How long does the refund take to arrive?', expect_contains: '5 business days', expect_not_covered: false },
  { question: 'Do you offer student discounts?', expect_contains: null, expect_not_covered: true },
];

function check(answer: string, c: Case): boolean {
  if (c.expect_not_covered) return answer.includes('NOT_COVERED');
  return answer.toLowerCase().includes((c.expect_contains ?? '').toLowerCase());
}
// endregion

// region: run
/** Run the golden set against one prompt version and count passes. */
async function runPrompt(promptId: string): Promise<number> {
  let passed = 0;
  for (const c of GOLDEN) {
    const [system, user, digest] = render(promptId, { policy: POLICY, question: c.question });
    const answer = (await complete(user, { system, maxTokens: 120 })).text;
    const ok = check(answer, c);
    if (ok) passed++;
    console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${promptId} ${digest}  Q: ${c.question}`);
    console.log(`         A: ${answer.trim().split('\n')[0].slice(0, 110)}`);
  }
  return passed;
}
// endregion

async function main(): Promise<void> {
  section('registry');
  title('Prompts as versioned artefacts');
  for (const [pid, spec] of Object.entries(PROMPTS)) {
    console.log(`${pid}: system=${spec.system.length} chars, user template=${JSON.stringify(spec.user).slice(0, 60)}...`);
  }

  section('v1');
  title('Golden set against faq-answer@1');
  const p1 = await runPrompt('faq-answer@1');
  console.log(`  ${p1}/${GOLDEN.length} passed`);

  section('v2');
  title('Golden set against faq-answer@2');
  const p2 = await runPrompt('faq-answer@2');
  console.log(`  ${p2}/${GOLDEN.length} passed`);

  section('verdict');
  title('The change is measured, not eyeballed');
  console.log(`faq-answer@1: ${p1}/${GOLDEN.length}   faq-answer@2: ${p2}/${GOLDEN.length}`);
  console.log('Ship the version that passes; keep both in the registry; log the prompt id + hash with');
  console.log('every request so an incident can be traced to the exact prompt - and rolled back like code.');
}

await main();
