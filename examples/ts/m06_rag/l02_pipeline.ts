/**
 * Lesson 6.2 - The RAG pipeline
 *
 * Retrieval-augmented generation in one file: ingest documents, embed them once, embed the
 * question, retrieve the nearest passages, put them in the prompt with ids, and ask the model
 * to answer only from them with citations. Every step is a few lines; the discipline is in
 * keeping them separate so each can be measured and swapped (Lessons 6.3-6.7).
 *
 * The corpus is a fictional support handbook (examples/shared/fixtures/handbook.json). The
 * embeddings and the answer are real recordings from local models.
 *
 * Run:  node m06_rag/l02_pipeline.ts
 */

import { section, title } from '../src/learnai/index.ts';
import { complete, embed } from '../src/learnai/llm.ts';
import { loadHandbook, topK, type Doc } from '../src/learnai/rag.ts';

type Hit = [Doc, number];

// region: ingest
/**
 * Ingest once: load the documents, embed each one, keep the vectors next to the text. In
 * production this is a job that runs on every document change and writes to a vector store;
 * here the 'store' is two parallel arrays.
 */
async function ingest(): Promise<[Doc[], number[][]]> {
  const { docs } = loadHandbook();
  const vectors = (await embed(docs.map((d) => `${d.title}\n${d.text}`))).vectors;
  return [docs, vectors];
}
// endregion

// region: retrieve
/**
 * Embed the question with the SAME model, score it against every stored vector, keep the
 * top k. The query vector is the only per-request embedding cost.
 */
async function retrieve(question: string, docs: Doc[], vectors: number[][], k = 3): Promise<Hit[]> {
  const qvec = (await embed([question])).vectors[0];
  return topK(qvec, vectors, k).map(([i, score]) => [docs[i], score]);
}
// endregion

// region: assemble
/**
 * Put the passages in the prompt with stable ids, and tell the model to answer only from them
 * and to cite. The ids are how citations stay checkable by code.
 */
function assemble(question: string, hits: Hit[]): [string, string] {
  const context = hits.map(([d]) => `[${d.id}] ${d.title}\n${d.text}`).join('\n\n');
  const system =
    'You answer customer questions using ONLY the provided articles. Cite the article id in ' +
    'square brackets after each claim, like [refunds]. If the articles do not contain the answer, ' +
    'reply exactly NOT_COVERED.';
  const user = `Articles:\n\n${context}\n\nQuestion: ${question}`;
  return [system, user];
}
// endregion

// region: answer
async function answer(question: string, docs: Doc[], vectors: number[][]): Promise<[string, Hit[]]> {
  const hits = await retrieve(question, docs, vectors);
  const [system, user] = assemble(question, hits);
  const reply = await complete(user, { system, maxTokens: 200, temperature: 0 });
  return [reply.text.trim(), hits];
}
// endregion

async function main(): Promise<void> {
  const [docs, vectors] = await ingest();

  section('ingest');
  title('Ingest once: documents -> vectors');
  console.log(`${docs.length} articles embedded into ${vectors[0].length}-dimensional vectors`);
  console.log('stored: id, title, text, vector - the vector store is just this, indexed');

  for (const q of [
    'I bought an annual plan 10 days ago - can I get my money back?',
    'What happens when we go over our API rate limit?',
    'Do you offer student discounts?',
  ]) {
    section('q-' + q.split(' ')[0].toLowerCase().replace(/[?,]+$/g, ''));
    title(`Q: ${q}`);
    const [text, hits] = await answer(q, docs, vectors);
    console.log('retrieved:', hits.map(([d, s]) => `${d.id} (${s.toFixed(3)})`).join(', '));
    console.log('answer   :', text);
  }

  section('shape');
  title('The pipeline, as stages you can measure and swap');
  console.log('ingest -> chunk (6.3) -> embed -> store/index (6.4) -> retrieve -> rerank (6.5) -> assemble -> answer + cite (6.6) -> evaluate (6.7)');
  console.log('the model only ever sees what retrieval put in front of it - retrieval quality IS answer quality');
}

await main();
