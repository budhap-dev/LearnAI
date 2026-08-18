/**
 * Lesson 2.3 - Embeddings
 *
 * An embedding is a list of numbers that stands for a piece of text, built so that texts with
 * similar meaning end up close together. "Close" is measured with cosine similarity - the
 * angle between two vectors - and that one number powers search, RAG, clustering and
 * deduplication.
 *
 * Real embedding models are neural networks trained on billions of pairs. This example builds
 * the oldest kind - count the words that appear near each word - because it shows *why*
 * geometry can capture meaning: words used in similar contexts get similar vectors.
 *
 * Run:  node m02_llms/l03_embeddings.ts
 */

import { section, title } from '../src/learnai/index.ts';

// region: corpus
const CORPUS = `
the cat sat on the mat and watched the fire
the dog sat on the rug and watched the fire
the kitten chased the cat around the garden
the puppy chased the dog around the garden
the cat and the dog sleep by the fire
the server runs the code and logs every request
the browser runs the code and renders every page
the client sends a request to the server
the browser sends a request to the server
python code runs on the server and the laptop
typescript code runs in the browser and the laptop
`;
const WINDOW = 2; // how many words either side count as "context"
// Function words say nothing about meaning and would swamp every vector with "the: 3".
// Real systems solve the same problem with weighting (TF-IDF, PMI) or by learning it.
const STOP = new Set(['the', 'a', 'on', 'in', 'and', 'around', 'every', 'by', 'to']);
// endregion

type Vector = Map<string, number>;

// region: build
/**
 * One sparse vector per word: how often each other word appears within WINDOW of it.
 *
 * Words that keep the same company - cat/dog, server/browser - end up with similar rows.
 * A neural embedding model learns a dense 1,000-ish-dimensional version of exactly this
 * idea, from vastly more text; the intuition is the same.
 */
function buildEmbeddings(text: string): Map<string, Vector> {
  const vectors = new Map<string, Vector>();
  for (const line of text.trim().split('\n')) {
    const words = line.split(/\s+/).filter((w) => !STOP.has(w)); // drop function words first
    words.forEach((word, i) => {
      const row = vectors.get(word) ?? new Map<string, number>();
      vectors.set(word, row);
      for (let j = Math.max(0, i - WINDOW); j < Math.min(words.length, i + WINDOW + 1); j++) {
        if (j !== i) row.set(words[j], (row.get(words[j]) ?? 0) + 1);
      }
    });
  }
  return vectors;
}
// endregion

// region: cosine
/**
 * Cosine similarity: dot product over the product of lengths = cos(angle between them).
 *
 * 1.0 means the same direction, 0.0 means unrelated. Length is ignored on purpose - a word
 * used twice as often should not look "more similar" to everything.
 */
function cosine(a: Vector, b: Vector): number {
  let dot = 0;
  for (const [k, v] of a) if (b.has(k)) dot += v * b.get(k)!;
  const norm = (v: Vector) => Math.sqrt([...v.values()].reduce((s, x) => s + x * x, 0));
  const na = norm(a);
  const nb = norm(b);
  return na && nb ? dot / (na * nb) : 0;
}
// endregion

// region: nearest
/**
 * The core of every vector search: score the query against everything, take the top k.
 *
 * Real systems replace this linear scan with an approximate index (HNSW, IVF) once there
 * are millions of vectors - Lesson 6.4 - but the question asked is identical.
 */
function nearest(query: string, vectors: Map<string, Vector>, k = 3): [string, number][] {
  const q = vectors.get(query)!;
  const scores: [string, number][] = [];
  for (const [w, v] of vectors) if (w !== query) scores.push([w, cosine(q, v)]);
  const r6 = (x: number) => Math.round(x * 1e6) / 1e6;
  scores.sort((a, b) => r6(b[1]) - r6(a[1]) || (a[0] < b[0] ? -1 : 1));
  return scores.slice(0, k);
}
// endregion

function main(): void {
  const vectors = buildEmbeddings(CORPUS);
  const v = (w: string) => vectors.get(w)!;

  section('vectors');
  title("A word's vector is the company it keeps");
  for (const word of ['cat', 'dog', 'server']) {
    const top = [...v(word)].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 5);
    console.log(`${word.padEnd(8)} -> ${top.map(([k, n]) => `${k}:${n}`).join(', ')}`);
  }

  section('similarity');
  title('Cosine similarity: same neighbourhood, similar vector');
  for (const [a, b] of [['cat', 'dog'], ['cat', 'kitten'], ['server', 'browser'], ['cat', 'server']]) {
    console.log(`cos(${a}, ${b}) = ${cosine(v(a), v(b)).toFixed(2)}`);
  }

  section('nearest');
  title('Nearest neighbours - the primitive behind semantic search and RAG');
  for (const query of ['cat', 'server', 'python']) {
    const hits = nearest(query, vectors).map(([w, s]) => `${w} (${s.toFixed(2)})`).join(', ');
    console.log(`${query.padEnd(8)} -> ${hits}`);
  }

  section('limits');
  title('What similarity does NOT mean');
  console.log(
    `cos(cat, chased) = ${cosine(v('cat'), v('chased')).toFixed(2)}  ` +
      `vs  cos(cat, dog) = ${cosine(v('cat'), v('dog')).toFixed(2)}`,
  );
  console.log("A verb is as 'close' to cat as another animal is. Embeddings capture 'used in");
  console.log("similar contexts' - often meaning, sometimes just topic or grammar. A similarity");
  console.log('score is a ranking signal, never a fact check.');
}

main();
