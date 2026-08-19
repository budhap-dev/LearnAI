/**
 * Lesson 4.2 - Prompt patterns that work
 *
 * Three patterns that survive contact with production, each shown against its naive version:
 *   - few-shot: show examples of the exact output you want, instead of describing it
 *   - decomposition: two small asks in sequence beat one big ask
 *   - constrained vocabulary: make the model choose from your labels, not invent its own
 *
 * Everything else in "prompt engineering" folklore is a special case of these, or noise.
 *
 * Run:  node m04_prompting/l02_patterns.ts
 */

import { section, title } from '../src/learnai/index.ts';
import { complete } from '../src/learnai/llm.ts';

// region: tickets
const TICKETS = [
  "App crashes every time I open the reports tab on Android since yesterday's update.",
  "How do I export my data to CSV? Can't find the button anywhere.",
  'You charged me for two seats but I only have one user. Please fix.',
];
const LABELS = ['bug', 'how-to', 'billing', 'feature-request', 'other'];
// endregion

// region: zero-shot
/**
 * Describe the task and hope. Fine for a demo; in production the label vocabulary drifts
 * ('billing issue', 'Billing', 'payment') and the format wanders.
 */
async function zeroShot(): Promise<string> {
  const prompt = 'Classify each support ticket by type. Tickets:\n' + TICKETS.map((t) => `- ${t}`).join('\n');
  return (await complete(prompt, { maxTokens: 200 })).text;
}
// endregion

// region: few-shot
/**
 * Show the exact output. Examples communicate format, granularity and edge cases far more
 * reliably than adjectives do - and they pin the label vocabulary.
 */
async function fewShot(): Promise<string> {
  const prompt =
    `Classify each support ticket with exactly one label from: ${LABELS.join(', ')}.
Answer with one line per ticket in the form  <number>. <label>  and nothing else.

Examples:
Ticket: "Login button does nothing on Safari" -> 1. bug
Ticket: "Where do I change my password?" -> 2. how-to
Ticket: "It would be great to have dark mode" -> 3. feature-request

Tickets:
` + TICKETS.map((t, i) => `${i + 1}. ${t}`).join('\n');
  return (await complete(prompt, { maxTokens: 100 })).text;
}
// endregion

// region: decomposition
/**
 * One prompt that asks for everything: category, urgency, a reply, and a summary. Each
 * extra job dilutes the others, and any error is buried in a wall of text.
 */
async function oneBigAsk(ticket: string): Promise<string> {
  return (
    await complete(
      `For this ticket, give its category, urgency (low/medium/high), a customer reply, ` +
        `and a one-line internal summary:\n\n${ticket}`,
      { maxTokens: 350 },
    )
  ).text;
}

/**
 * Decompose: first extract the facts in a fixed shape, then use them for the reply.
 * Each step is small, checkable, and can use a different model or temperature.
 */
async function twoSmallAsks(ticket: string): Promise<[string, string]> {
  const facts = (
    await complete(
      `From this ticket, answer in exactly three lines: category, urgency (low/medium/high), ` +
        `and the single concrete thing the customer wants.\n\n${ticket}`,
      { maxTokens: 80 },
    )
  ).text;
  const reply = (
    await complete(
      `Write a two-sentence reply to a customer, using only these facts:\n${facts}\n\n` +
        `Do not promise outcomes; say what happens next.`,
      { maxTokens: 120 },
    )
  ).text;
  return [facts, reply];
}
// endregion

async function main(): Promise<void> {
  section('zero-shot');
  title('Zero-shot: describe the task');
  console.log(await zeroShot());

  section('few-shot');
  title('Few-shot: show the exact output, pin the labels');
  console.log(await fewShot());

  section('one-big-ask');
  title('One big ask');
  console.log(await oneBigAsk(TICKETS[2]));

  section('two-small-asks');
  title('Decomposed: extract facts, then act on them');
  const [facts, reply] = await twoSmallAsks(TICKETS[2]);
  console.log('-- step 1: facts --');
  console.log(facts);
  console.log('-- step 2: reply, using only the facts --');
  console.log(reply);

  section('takeaway');
  title('What to keep');
  console.log("few-shot beats adjectives; a fixed label list beats 'classify'; two small asks beat one big one.");
  console.log('Each of these makes the output easier to CHECK - which is the point (Lesson 4.3).');
}

await main();
