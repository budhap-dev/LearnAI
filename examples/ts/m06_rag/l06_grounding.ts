/**
 * Lesson 6.6 - Grounding and citations
 *
 * Retrieval puts the right passages in front of the model. Grounding is making sure the answer
 * comes FROM them: cite every claim to a passage id, refuse when the passages do not cover
 * the question, and - the part people skip - check the citations in code. A citation the
 * model wrote is a claim; a citation your code verified against the passage is evidence.
 *
 * Run:  node m06_rag/l06_grounding.ts
 */

import { section, title } from '../src/learnai/index.ts';
import { complete, embed } from '../src/learnai/llm.ts';
import { loadHandbook, topK, type Doc } from '../src/learnai/rag.ts';

// region: prompt
const SYSTEM =
  'You answer customer questions using ONLY the provided articles.\n' +
  'Rules:\n' +
  '1. Every sentence that states a fact ends with the id of the article it came from, in square brackets, e.g. [refunds].\n' +
  '2. If the articles do not contain the answer, reply with exactly: NOT_COVERED\n' +
  '3. Do not add facts, policies or numbers that are not in the articles.\n' +
  '4. Be brief: two or three sentences.';

async function groundedAnswer(question: string, passages: Doc[]): Promise<string> {
  const context = passages.map((p) => `[${p.id}] ${p.title}\n${p.text}`).join('\n\n');
  const r = await complete(`Articles:\n\n${context}\n\nQuestion: ${question}`, { system: SYSTEM, maxTokens: 220, temperature: 0 });
  return r.text.trim();
}
// endregion

// region: verify
const CITATION = /\[([a-z0-9-]+)\]/g;

/**
 * Code checks what the model claimed: every citation must name a passage that was actually
 * provided, and every factual sentence must carry one. Numbers in the answer should appear in
 * the cited passage - the cheapest faithfulness check there is.
 */
function verify(answer: string, passages: Doc[]) {
  const provided = new Map(passages.map((p) => [p.id, p.text]));
  const cited = [...answer.matchAll(CITATION)].map((m) => m[1]);
  const unknown = [...new Set(cited.filter((c) => !provided.has(c)))].sort();
  const sentences = answer.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const uncited = sentences.filter((s) => !/\[[a-z0-9-]+\]/.test(s) && s !== 'NOT_COVERED');
  let numbersOk = true;
  for (const s of sentences) {
    const ids = [...s.matchAll(CITATION)].map((m) => m[1]);
    for (const num of s.match(/\b\d+\b/g) ?? []) {
      if (ids.length && !ids.some((i) => (provided.get(i) ?? '').includes(num))) numbersOk = false;
    }
  }
  return { citations: cited.length, unknown_ids: unknown, uncited_sentences: uncited.length, numbers_in_sources: numbersOk };
}
// endregion

async function main(): Promise<void> {
  const { docs } = loadHandbook();
  const vectors = (await embed(docs.map((d) => `${d.title}\n${d.text}`))).vectors;

  const cases = [
    'How long do you keep our data after we cancel, and can we delete it sooner?',
    'What is the response time for a severity-1 incident on the Enterprise plan?',
    'Do you offer student discounts?',
  ];
  const qvecs = (await embed(cases)).vectors;
  for (let ci = 0; ci < cases.length; ci++) {
    const q = cases[ci];
    const passages = topK(qvecs[ci], vectors, 3).map(([i]) => docs[i]);
    const answer = await groundedAnswer(q, passages);
    const check = verify(answer, passages);
    section('q-' + q.split(' ')[0].toLowerCase());
    title(`Q: ${q}`);
    console.log('passages:', passages.map((p) => p.id).join(', '));
    console.log('answer  :', answer);
    console.log('verify  :', JSON.stringify(check));
    if (answer === 'NOT_COVERED') console.log('route   : escalate to a human - the refusal path worked');
    else if (check.unknown_ids.length || check.uncited_sentences || !check.numbers_in_sources) console.log('route   : flag for review - a claim is not traceable to a provided passage');
    else console.log('route   : serve, with the citations rendered as links to the articles');
  }

  section('why');
  title('Why citations + code checks');
  console.log('a citation the model wrote is a claim; a citation code verified against the passage is evidence');
  console.log('the refusal path (NOT_COVERED) is what stops the model being helpful with facts it does not have');
  console.log('render citations as links: users can check, and you learn which articles answer which questions');
}

await main();
