/**
 * Lesson 6.3 - Chunking
 *
 * Documents are embedded in pieces, and the size and shape of the pieces decide what retrieval
 * can find. Too big and one vector averages many ideas, so the specific fact stops standing
 * out; too small and a chunk loses the context that makes it meaningful. This example chunks
 * the same handbook four ways, embeds every variant, and measures which one actually retrieves
 * the right article for the golden questions - and how much text each sends along with it.
 * No opinions - numbers.
 *
 * Run:  node m06_rag/l03_chunking.ts
 */

import { section, title } from '../src/learnai/index.ts';
import { embed } from '../src/learnai/llm.ts';
import { loadHandbook, topK, type Doc, type Golden } from '../src/learnai/rag.ts';

const words = (t: string) => t.split(/\s+/).filter(Boolean);

// region: fixed
/**
 * Fixed-size windows of `size` words with `overlap` words shared between neighbours. Dumb,
 * predictable, and often good enough. Overlap stops a fact being split in half.
 */
function chunkFixed(text: string, size = 60, overlap = 15): string[] {
  const w = words(text);
  const chunks: string[] = [];
  let start = 0;
  while (start < w.length) {
    chunks.push(w.slice(start, start + size).join(' '));
    if (start + size >= w.length) break;
    start += size - overlap;
  }
  return chunks;
}
// endregion

// region: sentence
/**
 * Split on sentence boundaries, then pack sentences into chunks up to `maxWords`. Chunks end
 * where thoughts end, so a fact is rarely cut mid-sentence.
 */
function chunkSentences(text: string, maxWords = 60): string[] {
  const sentences = text.trim().split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current: string[] = [];
  for (const s of sentences) {
    if (current.length && words([...current, s].join(' ')).length > maxWords) {
      chunks.push(current.join(' '));
      current = [];
    }
    current.push(s);
  }
  if (current.length) chunks.push(current.join(' '));
  return chunks;
}
// endregion

// region: sections
/**
 * Split on headings. Real documents have structure - use it. Here each merged guide is
 * several articles separated by '## ' headings; each becomes one chunk.
 */
function chunkSections(text: string): string[] {
  return text.split(/\n(?=## )/).map((p) => p.trim()).filter(Boolean);
}
// endregion

/** One chunk per document: maximum context, minimum precision - the baseline. */
function chunkWhole(text: string): string[] {
  return [text];
}

const STRATEGIES: [string, (t: string) => string[]][] = [
  ['whole document', chunkWhole],
  ['sections (headings)', chunkSections],
  ['fixed 60/15 words', chunkFixed],
  ['sentences <=60 words', chunkSentences],
];

interface Guide { title: string; text: string; articles: string[] }

// region: corpus
/**
 * Real handbooks are not twelve tidy articles; they are a few long pages that each cover
 * several topics. Merge the articles into three guides with headings, and remember which
 * article each heading came from so hits can be scored.
 */
function mergedGuides(docs: Doc[]): Guide[] {
  const groups: [string, string[]][] = [
    ['Billing guide', ['refunds', 'billing-cycle', 'seats', 'plans']],
    ['Security and access guide', ['sso', 'security-incident', 'password-reset', 'api-limits']],
    ['Data and support guide', ['retention', 'export', 'support', 'onboarding']],
  ];
  const byId = new Map(docs.map((d) => [d.id, d]));
  return groups.map(([t, ids]) => ({ title: t, text: ids.map((i) => `## ${byId.get(i)!.title}\n${byId.get(i)!.text}`).join('\n'), articles: ids }));
}

/**
 * Which article(s) a chunk overlaps - by checking which article texts share a distinctive
 * sentence with it. Used only to score hits.
 */
function articleOf(chunk: string, guide: Guide, byId: Map<string, Doc>): Set<string> {
  const found = new Set<string>();
  for (const aid of guide.articles) {
    if (byId.get(aid)!.text.split('. ').some((sent) => chunk.includes(sent.slice(0, 40)))) found.add(aid);
  }
  return found;
}
// endregion

// region: measure
/**
 * Chunk every guide, embed all chunks, then for each answerable golden question check whether
 * a top-k chunk overlaps a relevant article (hit@k), whether the top-1 does (hit@1), and how
 * many words the top-k chunks would put in the prompt.
 */
async function evaluate(strategy: (t: string) => string[], guides: Guide[], golden: Golden[], byId: Map<string, Doc>, k = 3) {
  const chunks: [Set<string>, string][] = [];
  for (const g of guides) for (const c of strategy(g.text)) chunks.push([articleOf(c, g, byId), `${g.title}\n${c}`]);
  const vectors = (await embed(chunks.map(([, t]) => t))).vectors;
  const answerable = golden.filter((q) => q.relevant.length);
  const qvecs = (await embed(answerable.map((q) => q.question))).vectors;
  let hit1 = 0, hit3 = 0, wordCount = 0;
  answerable.forEach((q, qi) => {
    const top = topK(qvecs[qi], vectors, k);
    const relevant = new Set(q.relevant);
    const overlaps = (i: number) => [...chunks[i][0]].some((a) => relevant.has(a));
    hit1 += overlaps(top[0][0]) ? 1 : 0;
    hit3 += top.some(([i]) => overlaps(i)) ? 1 : 0;
    wordCount += top.reduce((s, [i]) => s + words(chunks[i][1]).length, 0);
  });
  const n = answerable.length;
  return { chunks: chunks.length, hit1: hit1 / n, hit3: hit3 / n, words: Math.floor(wordCount / n) };
}
// endregion

const pct = (x: number) => `${Math.round(x * 100)}%`;

async function main(): Promise<void> {
  const hb = loadHandbook();
  const byId = new Map(hb.docs.map((d) => [d.id, d]));
  const guides = mergedGuides(hb.docs);

  section('shapes');
  title('One guide, four ways');
  const sample = guides[0];
  console.log(`${sample.title}: ${words(sample.text).length} words, ${sample.articles.length} topics`);
  for (const [name, fn] of STRATEGIES) {
    const pieces = fn(sample.text);
    const sizes = pieces.map((p) => words(p).length);
    console.log(`  ${name.padEnd(22)} -> ${String(pieces.length).padStart(2)} chunk(s), ${String(Math.min(...sizes)).padStart(3)}-${String(Math.max(...sizes)).padEnd(3)} words each`);
  }

  section('measure');
  title('Retrieval quality and context cost per strategy (9 answerable golden questions)');
  console.log(`  ${'strategy'.padEnd(22)} ${'chunks'.padStart(6)} ${'hit@1'.padStart(6)} ${'hit@3'.padStart(6)} ${'words sent'.padStart(11)}`);
  for (const [name, fn] of STRATEGIES) {
    const r = await evaluate(fn, guides, hb.golden, byId);
    console.log(`  ${name.padEnd(22)} ${String(r.chunks).padStart(6)} ${pct(r.hit1).padStart(6)} ${pct(r.hit3).padStart(6)} ${String(r.words).padStart(11)}`);
  }
  console.log("read the last two columns together: the question is not only 'did we find it' but");
  console.log("'how much unrelated text came with it' - that is tokens, latency, and distraction");

  section('rules');
  title('What the numbers tell you to do');
  console.log('1. chunk at natural boundaries (headings, sentences) and keep a little overlap');
  console.log('2. prepend the document title / section path to every chunk so it carries its context');
  console.log("3. size by the question shape: fact lookups like small chunks, 'explain X' likes larger");
  console.log('4. parent-child: retrieve small, return the enclosing section to the model (6.5)');
  console.log('5. measure hit@k AND words sent on a golden set before and after every chunking change (6.7)');
}

await main();
