/**
 * Lesson 4.1 - Anatomy of a prompt
 *
 * A prompt is not a sentence you type; it is a small structured document with parts that do
 * different jobs: the system prompt (who the model is and what the rules are), the user turn
 * (the task and its inputs), and the shape of answer you want. This example sends the same
 * task three ways and shows what each part changes.
 *
 * The model responses below were recorded once through the llm adapter and are replayed on
 * every build (see examples/shared/cassettes/README.md).
 *
 * Run:  node m04_prompting/l01_anatomy.ts
 */

import { section, title } from '../src/learnai/index.ts';
import { complete } from '../src/learnai/llm.ts';

// region: task
// The same underlying task each time: a support message that needs a reply.
const CUSTOMER_MESSAGE =
  'Hi, I was charged twice for my Pro plan this month (invoices #4471 and #4472). ' +
  'Can you sort this out? Also is there any way to move my billing date to the 1st?';
// endregion

// region: bare
/**
 * No system prompt, no shape: just the message. The model has to guess who it is, who it
 * is talking to, and what a good answer looks like.
 */
async function bare(): Promise<string> {
  return (await complete(CUSTOMER_MESSAGE, { maxTokens: 300 })).text;
}
// endregion

// region: system
const SYSTEM = `You are the billing support assistant for Acme, a SaaS company.
Rules:
- Be concise: at most 120 words.
- Never promise a refund; say the billing team will confirm within one business day.
- If the customer asks for something you cannot do, say so plainly and offer the nearest thing.
- Do not invent invoice numbers, dates or policies that are not in the message.`;

/**
 * The system prompt sets identity, rules and constraints - the part of the prompt that
 * stays the same across thousands of requests, and the part you version and test.
 */
async function withSystem(): Promise<string> {
  return (await complete(CUSTOMER_MESSAGE, { system: SYSTEM, maxTokens: 300 })).text;
}
// endregion

// region: shaped
/**
 * The user turn carries the task and its inputs, clearly labelled, plus the shape of the
 * answer. Labelling the customer text as data (not instructions) is the first line of
 * defence against prompt injection (Lesson 4.6).
 */
async function withShape(): Promise<string> {
  const user = `Draft a reply to the customer message below.

<customer_message>
${CUSTOMER_MESSAGE}
</customer_message>

Reply with exactly three short paragraphs:
1. acknowledge the specific problem, quoting the invoice numbers
2. what happens next and when
3. answer the billing-date question`;
  return (await complete(user, { system: SYSTEM, maxTokens: 300 })).text;
}
// endregion

async function main(): Promise<void> {
  section('bare');
  title('1. Just the message');
  console.log(await bare());

  section('system');
  title('2. Plus a system prompt: identity, rules, constraints');
  console.log(await withSystem());

  section('shaped');
  title('3. Plus a labelled task and an answer shape');
  console.log(await withShape());

  section('parts');
  title('What each part is for');
  console.log('system  - who the model is, the rules, the constraints; stable; versioned and tested');
  console.log('user    - the task, its inputs (labelled as data), and the shape of the answer');
  console.log('shape   - format, length, structure; the cheapest lever for consistency (Lesson 4.3)');
  console.log('Each part changed the answer above. None of them changed what the model knows.');
}

await main();
