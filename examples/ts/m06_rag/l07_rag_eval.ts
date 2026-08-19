/**
 * Lesson 6.7 - Evaluating RAG
 *
 * A RAG system has two places to fail: retrieval (the right passage was not found) and
 * generation (it was found, but the answer is wrong, unsupported, or refuses when it should
 * not). So it needs two kinds of numbers, measured on a golden set of real questions:
 *
 *   retrieval : hit@k   - is a relevant passage in the top k?
 *   answer    : correctness - does the answer contain what we expected? (code check)
 *               faithfulness - is every claim supported by the retrieved passages? (model judge)
 *               refusal precision - did it say NOT_COVERED exactly when it should?
 *
 * This example runs the 6.2 pipeline over the handbook's golden set and prints the scorecard -
 * the thing you re-run on every change to chunking, retrieval, prompt or model.
 *
 * Run:  node m06_rag/l07_rag_eval.ts
 */

import { section, title } from '../src/learnai/index.ts';
import { complete, embed } from '../src/learnai/llm.ts';
import { loadHandbook, topK, type Doc, type Handbook } from '../src/learnai/rag.ts';

const SYSTEM =
  'You answer customer questions using ONLY the provided articles. Cite the article id in square brackets ' +
  'after each claim. If the articles do not contain the answer, reply exactly NOT_COVERED. Be brief.';

// region: pipeline
/**
 * The system under test: retrieve top-k, answer from them. Kept identical to 6.2 so the
 * scorecard measures the system, not a demo of it.
 */
async function runPipeline(question: string, docs: Doc[], vectors: number[][], qvec: number[], k = 3): Promise<[Doc[], string]> {
  const passages = topK(qvec, vectors, k).map(([i]) => docs[i]);
  const context = passages.map((p) => `[${p.id}] ${p.title}\n${p.text}`).join('\n\n');
  const reply = await complete(`Articles:\n\n${context}\n\nQuestion: ${question}`, { system: SYSTEM, maxTokens: 200, temperature: 0 });
  return [passages, reply.text.trim()];
}
// endregion

// region: judge
const JUDGE_SCHEMA = {
  type: 'object', properties: { supported: { type: 'boolean' }, reason: { type: 'string' } },
  required: ['supported', 'reason'], additionalProperties: false,
};

/**
 * LLM-as-judge for faithfulness: given the passages and the answer, is every factual claim
 * supported by the passages? A model grading a model - useful, and biased in ways Lesson 8.3
 * covers, so keep the rubric narrow and spot-check the judge.
 */
async function faithful(answer: string, passages: Doc[]): Promise<boolean> {
  const context = passages.map((p) => `[${p.id}] ${p.text}`).join('\n\n');
  const r = await complete(
    `Passages:\n\n${context}\n\nAnswer:\n${answer}\n\nIs every factual claim in the answer supported by the passages? ` +
      `Ignore phrasing; flag any number, policy or step that is not in the passages.`,
    { system: 'You are a strict grader. JSON only.', jsonSchema: JUDGE_SCHEMA, maxTokens: 120, temperature: 0 },
  );
  return Boolean((JSON.parse(r.text) as { supported: boolean }).supported);
}
// endregion

// region: scorecard
const pyRepr = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
const yn = (v: boolean | null) => (v === null ? '-' : String(v)).padEnd(5);

async function scorecard(hb: Handbook, k = 3): Promise<Record<string, number>> {
  const { docs, golden } = hb;
  const vectors = (await embed(docs.map((d) => `${d.title}\n${d.text}`))).vectors;
  const qvecs = (await embed(golden.map((g) => g.question))).vectors;
  const rows: { hit: boolean | null; correct: boolean; faithful: boolean | null; refused: boolean; shouldRefuse: boolean }[] = [];
  for (let gi = 0; gi < golden.length; gi++) {
    const g = golden[gi];
    const [passages, answer] = await runPipeline(g.question, docs, vectors, qvecs[gi], k);
    const retrieved = new Set(passages.map((p) => p.id));
    const shouldRefuse = g.relevant.length === 0;
    const refused = answer.trim() === 'NOT_COVERED';
    const row = {
      hit: g.relevant.length ? g.relevant.some((r) => retrieved.has(r)) : null,
      correct: shouldRefuse ? refused : answer.toLowerCase().includes(g.expect.toLowerCase()),
      faithful: refused ? null : await faithful(answer, passages),
      refused, shouldRefuse,
    };
    rows.push(row);
    console.log(`  ${g.id.padEnd(3)} hit=${yn(row.hit)} correct=${yn(row.correct)} faithful=${yn(row.faithful)} refused=${yn(refused)}  ${pyRepr(answer.slice(0, 60))}`);
  }
  const answerable = rows.filter((r) => r.hit !== null);
  const answered = rows.filter((r) => r.faithful !== null);
  const frac = (xs: unknown[], f: (x: never) => boolean) => xs.filter((x) => f(x as never)).length / xs.length;
  return {
    [`hit@${k}`]: frac(answerable, (r: { hit: boolean }) => r.hit),
    correct: frac(rows, (r: { correct: boolean }) => r.correct),
    faithful: answered.length ? frac(answered, (r: { faithful: boolean }) => r.faithful) : 1,
    refusal_ok: frac(rows, (r: { refused: boolean; shouldRefuse: boolean }) => r.refused === r.shouldRefuse),
  };
}
// endregion

async function main(): Promise<void> {
  const hb = loadHandbook();
  section('rows');
  title('Per-question: retrieval hit, correctness, faithfulness, refusal');
  const card = await scorecard(hb);

  section('scorecard');
  title('The scorecard (re-run on every change to chunking, retrieval, prompt or model)');
  for (const [k, v] of Object.entries(card)) console.log(`  ${k.padEnd(11)} ${Math.round(v * 100)}%`);

  section('reading');
  title('How to read it');
  console.log('hit@k low     -> fix retrieval first (chunking 6.3, hybrid 6.4, rerank 6.5); nothing downstream can help');
  console.log('hit ok, correct low -> the prompt or the model: grounding rules, passage formatting, a stronger model');
  console.log('faithful low  -> the model is adding facts; tighten the grounding prompt, verify citations in code (6.6)');
  console.log('refusal wrong -> it answers uncovered questions (dangerous) or refuses covered ones (useless) - tune the rule');
  console.log('ten questions is a smoke test; a real golden set is hundreds, drawn from traffic (Lesson 8.2)');
}

await main();
