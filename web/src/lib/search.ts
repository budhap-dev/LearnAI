/**
 * Client-side full-text search over a build-time index (public/data/search-index.json).
 * No server, no dependency: a small weighted scorer good enough for ~70 lessons.
 */
const base = import.meta.env.BASE_URL;

export interface SearchRecord {
  id: string;
  title: string;
  module: number;
  level: string;
  summary: string;
  objectives: string[];
  tags: string[];
  text: string;
}

export interface SearchHit {
  record: SearchRecord;
  score: number;
  /** A short excerpt of the body around the first match, for context. */
  snippet: string;
}

let indexPromise: Promise<SearchRecord[]> | null = null;

export function loadIndex(): Promise<SearchRecord[]> {
  indexPromise ??= fetch(`${base}data/search-index.json`).then((r) => r.json());
  return indexPromise;
}

export function terms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
}

/** Builds a snippet of `text` around the first occurrence of any term. */
function makeSnippet(text: string, words: string[]): string {
  const lower = text.toLowerCase();
  let at = -1;
  for (const term of words) {
    const found = lower.indexOf(term);
    if (found !== -1 && (at === -1 || found < at)) at = found;
  }
  if (at === -1) return text.slice(0, 140) + (text.length > 140 ? '…' : '');
  const start = Math.max(0, at - 50);
  const end = Math.min(text.length, at + 100);
  return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
}

export function search(records: SearchRecord[], query: string): SearchHit[] {
  const words = terms(query);
  if (words.length === 0) return [];

  const hits: SearchHit[] = [];
  for (const record of records) {
    const id = record.id.toLowerCase();
    const title = record.title.toLowerCase();
    const summary = record.summary.toLowerCase();
    const objectives = record.objectives.join(' ').toLowerCase();
    const tags = record.tags.join(' ').toLowerCase();
    const body = record.text.toLowerCase();

    let score = 0;
    let matchedAll = true;
    for (const term of words) {
      let s = 0;
      // An explicit lesson id ("3.6") should jump straight to that lesson - rank it above all else.
      if (id === term) s += 40;
      else if (id.startsWith(term)) s += 20;
      // A title hit is worth far more than a body hit; tags are curated so they rank high too.
      if (title.includes(term)) s += 10;
      if (title.split(/\W+/).includes(term)) s += 6;
      if (tags.includes(term)) s += 8;
      if (summary.includes(term)) s += 5;
      if (objectives.includes(term)) s += 3;
      if (body.includes(term)) s += 1;
      if (s === 0) matchedAll = false;
      score += s;
    }
    // Every term must appear somewhere - AND semantics beat noisy OR for a small corpus.
    if (matchedAll && score > 0) hits.push({ record, score, snippet: makeSnippet(record.text, words) });
  }
  return hits.sort(
    (a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id, undefined, { numeric: true }),
  );
}
