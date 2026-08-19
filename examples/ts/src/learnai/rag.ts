/**
 * Small RAG helpers shared by the Module 6 examples: the fixture corpus, cosine similarity and
 * a brute-force top-k. Each lesson defines the thing it *teaches* in its own file (chunkers in
 * 6.3, BM25 and rank fusion in 6.4, the judge in 6.7); these are the pieces every lesson needs.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURES = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..', 'shared', 'fixtures');

export interface Doc { id: string; title: string; text: string }
export interface Golden { id: string; question: string; relevant: string[]; expect: string }
export interface Handbook { about: string; docs: Doc[]; golden: Golden[] }

/** The fictional support handbook: 12 short articles + 10 golden questions. */
export function loadHandbook(): Handbook {
  return JSON.parse(readFileSync(join(FIXTURES, 'handbook.json'), 'utf8')) as Handbook;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

/**
 * Brute-force nearest neighbours: [index, score] for the k most similar vectors. Fine to
 * thousands of vectors; an ANN index (Lesson 6.4) replaces this at scale.
 */
export function topK(queryVec: number[], vectors: number[][], k: number): [number, number][] {
  const r6 = (x: number) => Math.round(x * 1e6) / 1e6;
  const scored: [number, number][] = vectors.map((v, i) => [i, cosine(queryVec, v)]);
  scored.sort((a, b) => r6(b[1]) - r6(a[1]) || a[0] - b[0]);
  return scored.slice(0, k);
}
