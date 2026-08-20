/**
 * Lesson 7.5 - Memory
 *
 * A model has no memory (Lesson 2.4): everything it "remembers" is text your code chose to
 * re-send. So memory is a data-management problem with three tiers - keep recent turns
 * verbatim, summarise the old ones, and promote durable facts to a store that outlives the
 * conversation. This example runs a long support conversation through that policy and shows
 * what the model actually sees at the end versus what was said.
 *
 * Two model calls are recorded: the summariser compressing old turns, and the extractor
 * promoting facts. Both are the same complete() you already know - memory is not a feature
 * of the model, it is a pipeline you own.
 *
 * Run:  node m07_agents/l05_memory.ts
 */

import { section, title } from '../src/learnai/index.ts';
import { complete } from '../src/learnai/llm.ts';

// region: conversation
// A 10-turn conversation. Early turns hold facts that must survive; the middle is chatter
// that should compress away; the last turns must stay verbatim.
const TURNS: [string, string][] = [
  ['user', "Hi - we're Acme Robotics, on the Pro plan, about 40 seats."],
  ['assistant', 'Welcome! How can I help Acme today?'],
  ['user', 'Our workspace id is WS-7731. We mainly use the API from eu-west.'],
  ['assistant', 'Noted. What do you need help with?'],
  ['user', 'Reports were slow yesterday but it fixed itself.'],
  ['assistant', 'Good to hear - likely the incident we posted about.'],
  ['user', "Also my name is Priya, I'm the platform lead."],
  ['assistant', 'Thanks Priya.'],
  ['user', 'Now the real question: we keep hitting 429s on the export endpoint since Monday.'],
  ['assistant', 'Let me look into the rate limits for exports.'],
];
const KEEP_VERBATIM = 4; // the most recent turns never get compressed
// endregion

// region: summarise
/**
 * Compress old turns into a paragraph. This is a model call your code makes - and the
 * summary is lossy by design. What it drops is gone unless the fact store caught it.
 */
async function summarise(turns: [string, string][]): Promise<string> {
  const text = turns.map(([who, what]) => `${who}: ${what}`).join('\n');
  const result = await complete(
    `Summarise this support conversation so far in 2-3 sentences for the assistant's own ` +
      `context. Keep concrete identifiers and open issues; drop pleasantries.\n\n${text}`,
    { maxTokens: 150, temperature: 0.2 },
  );
  return result.text.trim();
}
// endregion

// region: extract-facts
const FACT_SCHEMA = {
  type: 'object',
  properties: {
    facts: {
      type: 'array',
      items: {
        type: 'object',
        properties: { key: { type: 'string' }, value: { type: 'string' } },
        required: ['key', 'value'],
        additionalProperties: false,
      },
    },
  },
  required: ['facts'],
  additionalProperties: false,
};

/**
 * Promote durable facts (account details, names, preferences) to a store keyed for retrieval
 * next session. Facts persist; the conversation does not.
 */
async function extractFacts(turns: [string, string][]): Promise<Record<string, string>> {
  const text = turns.map(([who, what]) => `${who}: ${what}`).join('\n');
  const result = await complete(
    `Extract durable account facts from this conversation as key/value pairs - things that ` +
      `will still be true next month (company, plan, ids, names, regions). Not the current ` +
      `issue.\n\n${text}`,
    { jsonSchema: FACT_SCHEMA, maxTokens: 300 },
  );
  const parsed = JSON.parse(result.text) as { facts: { key: string; value: string }[] };
  return Object.fromEntries(parsed.facts.map((f) => [f.key, f.value]));
}
// endregion

// region: assemble
/**
 * What the model will actually see next turn: facts block + summary of old turns + recent
 * turns verbatim. Everything else is gone - deliberately.
 */
async function assemble(turns: [string, string][], facts: Record<string, string>): Promise<[string[], number]> {
  const old = turns.slice(0, -KEEP_VERBATIM);
  const recent = turns.slice(-KEEP_VERBATIM);
  const parts = ['[facts] ' + Object.entries(facts).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('; ')];
  parts.push('[summary] ' + (await summarise(old)));
  parts.push(...recent.map(([who, what]) => `${who}: ${what}`));
  const original = turns.reduce((n, [, what]) => n + what.split(/\s+/).length, 0);
  return [parts, original];
}
// endregion

async function main(): Promise<void> {
  section('facts');
  title('Durable facts, promoted out of the conversation');
  const facts = await extractFacts(TURNS);
  for (const [k, v] of Object.entries(facts).sort(([a], [b]) => (a < b ? -1 : 1))) {
    console.log(`  ${k.padEnd(12)} = ${v}`);
  }

  section('assembled');
  title('What the model sees next turn (vs 10 verbatim turns)');
  const [parts, originalWords] = await assemble(TURNS, facts);
  for (const p of parts) console.log('  ' + (p.length <= 100 ? p : p.slice(0, 97) + '...'));
  const compressedWords = parts.reduce((n, p) => n + p.split(/\s+/).length, 0);
  console.log(`  ~${originalWords} words of conversation -> ~${compressedWords} words of context`);

  section('tiers');
  title('The three tiers, and who owns them');
  console.log('recent turns   verbatim in the prompt   owned by the loop        gone at session end');
  console.log('older turns    summarised by a call     owned by your pipeline   lossy on purpose');
  console.log('durable facts  key/value store          owned by your database   survives sessions');
  console.log('what to forget is a product decision: summaries drop chatter; the store holds only what');
  console.log("you would be comfortable showing the user on a 'what we know about you' page");
}

await main();
