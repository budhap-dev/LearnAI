/**
 * Lesson 6.5 - Reranking and query rewriting
 *
 * First-stage retrieval (BM25, vectors, hybrid) is built for recall: find anything that might
 * be relevant, cheaply, across millions of chunks. Precision comes from a second stage that
 * looks at the query and each candidate together - a reranker - which is too slow to run over
 * the whole corpus but fine over twenty candidates. And when the user's question is a poor
 * search query (vague, chatty, multi-part), rewriting it before retrieval is the cheapest fix
 * of all. Both steps are model calls; both are shown here with real recordings.
 *
 * Run:  node m06_rag/l05_rerank_rewrite.ts
 */

import { section, title } from '../src/learnai/index.ts';
import { complete, embed } from '../src/learnai/llm.ts';
import { loadHandbook, topK, type Doc } from '../src/learnai/rag.ts';

// region: rewrite
/**
 * Turn a chatty message into a search query: drop the story, keep the intent and the nouns.
 * One cheap call, before retrieval. (HyDE is the same idea the other way round: ask the model
 * for a hypothetical answer and search with that.)
 */
async function rewriteQuery(userMessage: string): Promise<string> {
  const r = await complete(
    `Rewrite this customer message as a short search query (under 12 words) for a support knowledge base. ` +
      `Keep product terms and numbers; drop greetings and story. Reply with the query only.\n\n${userMessage}`,
    { maxTokens: 30, temperature: 0 },
  );
  return r.text.trim().replace(/^"|"$/g, '');
}
// endregion

// region: rerank
const RERANK_SCHEMA = {
  type: 'object',
  properties: { scores: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 3 } } },
  required: ['scores'], additionalProperties: false,
};

/**
 * Score each candidate against the query, 0-3, in one structured call. A dedicated
 * cross-encoder reranker is faster and cheaper at scale; an LLM judge is the zero-setup
 * version of the same idea and good enough for a handful of candidates.
 */
async function rerank(query: string, candidates: Doc[]): Promise<[Doc, number][]> {
  const listing = candidates.map((c, i) => `[${i}] ${c.title}\n${c.text}`).join('\n\n');
  const r = await complete(
    `Query: ${query}\n\nRate how well each passage answers the query: 3 = directly answers, 2 = partly, ` +
      `1 = related only, 0 = unrelated. Return scores in passage order.\n\n${listing}`,
    { system: 'You are a precise relevance judge. Output JSON only.', jsonSchema: RERANK_SCHEMA, maxTokens: 120, temperature: 0 },
  );
  const scores = (JSON.parse(r.text) as { scores: number[] }).scores;
  const scored: [Doc, number][] = candidates.map((c, i) => [c, scores[i] ?? 0]);
  scored.sort((a, b) => b[1] - a[1] || candidates.indexOf(a[0]) - candidates.indexOf(b[0]));
  return scored;
}
// endregion

async function main(): Promise<void> {
  const { docs } = loadHandbook();
  const vectors = (await embed(docs.map((d) => `${d.title}\n${d.text}`))).vectors;

  const message =
    "Hi! Hope you're well. We signed up for the yearly thing back in early August, the team has barely " +
    "used it and honestly it's not for us - is there any way to get the money back, and how long does that take?";

  section('rewrite');
  title('A chatty message becomes a search query');
  const query = await rewriteQuery(message);
  console.log('message:', message.slice(0, 90) + '...');
  console.log('query  :', query);

  section('first-stage');
  title('First stage: top-5 by vector similarity (recall)');
  const qvec = (await embed([query])).vectors[0];
  const top = topK(qvec, vectors, 5);
  const candidates = top.map(([i]) => docs[i]);
  top.forEach(([idx, score], i) => console.log(`  ${i + 1}. ${docs[idx].id.padEnd(18)} ${score.toFixed(3)}`));

  section('rerank');
  title('Second stage: the reranker reads query + passage together (precision)');
  for (const [c, s] of await rerank(query, candidates)) console.log(`  ${s}/3  ${c.id}`);
  console.log('keep the top 2-3 after reranking; send those to the answer step (6.6)');

  section('when');
  title('When each step pays');
  console.log("rewrite : chatty, multi-part or ambiguous questions; queries that quote the user's words, not the docs'");
  console.log('rerank  : when first-stage top-k is noisy, the corpus is large, or answers depend on fine distinctions');
  console.log('both add a model call of latency; measure hit@k before/after (6.7) and keep them only where they move it');
}

await main();
