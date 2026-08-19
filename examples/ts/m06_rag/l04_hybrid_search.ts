/**
 * Lesson 6.4 - Vector stores and hybrid search
 *
 * Embeddings capture the gist; keyword search captures exact terms. Real questions need both:
 * "what does 429 mean" wants the token 429; "can I get my money back" wants the meaning of
 * "refund". This example scores the handbook three ways - BM25 (keywords), cosine over
 * embeddings (meaning), and the two fused with reciprocal rank fusion - and shows where each
 * wins. The vector search here is a brute-force scan; the lesson explains when an ANN index
 * replaces it.
 *
 * Run:  node m06_rag/l04_hybrid_search.ts
 */

import { section, title } from '../src/learnai/index.ts';
import { embed } from '../src/learnai/llm.ts';
import { cosine, loadHandbook } from '../src/learnai/rag.ts';

// region: tokenise
const STOP = new Set('a an the of for to in on at by with and or is are be do does what how i we you your our it its this that can my'.split(' '));

/**
 * Lower-case word tokens minus stop words. Without the stop list, 'what does a ... mean'
 * outscores the one rare token that matters; real engines also stem (refund/refunds).
 */
function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => !STOP.has(t));
}
// endregion

// region: bm25
/**
 * The classic keyword ranking function (what Lucene/Elasticsearch/OpenSearch use by default).
 * Score = for each query term: idf(term) x saturated term frequency, normalised for document
 * length. Rare terms count more; repeating a term helps less and less.
 */
class BM25 {
  docs: string[][];
  k1: number;
  b: number;
  avgLen: number;
  idf = new Map<string, number>();
  tf: Map<string, number>[];

  constructor(docs: string[][], k1 = 1.5, b = 0.75) {
    this.docs = docs;
    this.k1 = k1;
    this.b = b;
    this.avgLen = docs.reduce((s, d) => s + d.length, 0) / docs.length;
    const df = new Map<string, number>();
    for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1);
    const n = docs.length;
    for (const [t, f] of df) this.idf.set(t, Math.log(1 + (n - f + 0.5) / (f + 0.5)));
    this.tf = docs.map((d) => {
      const m = new Map<string, number>();
      for (const t of d) m.set(t, (m.get(t) ?? 0) + 1);
      return m;
    });
  }

  score(query: string[], i: number): number {
    const dLen = this.docs[i].length;
    let s = 0;
    for (const t of query) {
      const f = this.tf[i].get(t);
      if (!f) continue;
      s += this.idf.get(t)! * (f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + (this.b * dLen) / this.avgLen));
    }
    return s;
  }

  rank(query: string): [number, number][] {
    const q = tokens(query);
    const r6 = (x: number) => Math.round(x * 1e6) / 1e6;
    const scored: [number, number][] = this.docs.map((_, i) => [i, this.score(q, i)]);
    scored.sort((a, b) => r6(b[1]) - r6(a[1]) || a[0] - b[0]);
    return scored;
  }
}
// endregion

// region: rrf
/**
 * Fuse ranked lists without comparing their scores (BM25 and cosine live on different scales):
 * each document gets 1/(k + rank) from every list it appears in. Robust, tunable with one
 * constant, and what most hybrid-search setups actually do.
 */
function reciprocalRankFusion(rankings: number[][], k = 60): [number, number][] {
  const fused = new Map<number, number>();
  for (const ranking of rankings) ranking.forEach((doc, idx) => fused.set(doc, (fused.get(doc) ?? 0) + 1 / (k + idx + 1)));
  const r9 = (x: number) => Math.round(x * 1e9) / 1e9;
  return [...fused].sort((a, b) => r9(b[1]) - r9(a[1]) || a[0] - b[0]);
}
// endregion

async function main(): Promise<void> {
  const { docs } = loadHandbook();
  const ids = docs.map((d) => d.id);
  const bm25 = new BM25(docs.map((d) => tokens(`${d.title} ${d.text}`)));
  const vectors = (await embed(docs.map((d) => `${d.title}\n${d.text}`))).vectors;

  const queries: [string, string][] = [
    ['exact term', 'what does HTTP 429 mean'],
    ['paraphrase', 'how do I get my money back for the yearly subscription'],
    ['jargon', 'does SCIM work for deprovisioning leavers'],
    ['mixed', 'reverse-charge VAT invoice for our EU entity'],
  ];
  const qvecs = (await embed(queries.map(([, q]) => q))).vectors;

  section('ranks');
  title('Top-3 by keywords (BM25), by meaning (vectors), and fused (RRF)');
  queries.forEach(([kind, q], qi) => {
    const qv = qvecs[qi];
    const kw = bm25.rank(q).map(([i]) => i);
    const r6 = (x: number) => Math.round(x * 1e6) / 1e6;
    const vec = docs.map((_, i) => i).sort((a, b) => r6(cosine(qv, vectors[b])) - r6(cosine(qv, vectors[a])) || a - b);
    const fused = reciprocalRankFusion([kw.slice(0, 10), vec.slice(0, 10)]).map(([i]) => i);
    console.log(`${kind.padEnd(10)} '${q}'`);
    console.log(`  bm25   : ${kw.slice(0, 3).map((i) => ids[i]).join(', ')}`);
    console.log(`  vector : ${vec.slice(0, 3).map((i) => ids[i]).join(', ')}`);
    console.log(`  hybrid : ${fused.slice(0, 3).map((i) => ids[i]).join(', ')}`);
  });

  section('why');
  title('Why both');
  console.log('keywords win on exact tokens (error codes, product names, ids) and lose on paraphrase');
  console.log('vectors win on paraphrase and lose on rare exact terms the embedding model barely saw');
  console.log('fusion keeps the best of each without comparing incomparable scores; add metadata filters on top');

  section('scale');
  title('From a brute-force scan to an index');
  console.log(`this corpus: ${docs.length} vectors x ${vectors[0].length} dims - a linear scan is instant`);
  console.log('to ~1M vectors: pgvector (HNSW/IVF) inside the Postgres you already run');
  console.log('beyond, or when vectors are the product: a dedicated vector database; search engines do hybrid natively');
  console.log('whatever the store: same embedding model both sides, store the model version, filter by metadata first');
}

await main();
