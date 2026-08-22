/**
 * The reference section: glossary terms and Markdown pages, generated into src/content/reference/
 * from docs/reference/ by the content build. Small enough to bundle; the pages are lazy per route.
 */
import glossaryRaw from '../content/reference/glossary.json';
import pagesRaw from '../content/reference/pages.json';

export interface GlossaryEntry {
  term: string;
  slug: string;
  aliases: string[];
  definition: string;
  lessons: string[];
  plannedLessons: string[];
  related: string[];
}

export interface ReferencePage {
  id: string;
  title: string;
  summary: string;
}

export function slugOf(term: string): string {
  return term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export const GLOSSARY: GlossaryEntry[] = (glossaryRaw as Omit<GlossaryEntry, 'slug'>[]).map((g) => ({ ...g, slug: slugOf(g.term) }));

export const REFERENCE_PAGES: ReferencePage[] = pagesRaw as ReferencePage[];

const bySlug = new Map(GLOSSARY.map((g) => [g.slug, g]));
export const termBySlug = (slug: string) => bySlug.get(slug);
export const termByName = (name: string) => bySlug.get(slugOf(name));

/** Terms a lesson teaches - shown as "key terms" at the foot of the lesson. */
export function termsForLesson(lessonId: string): GlossaryEntry[] {
  return GLOSSARY.filter((g) => g.lessons.includes(lessonId));
}

/** An acronym-ish token (MCP, LLM, LoRA, RAG, SFT...): short, alphanumeric, two+ capitals. */
function isAcronym(s: string): boolean {
  return /^[A-Za-z0-9]{2,8}$/.test(s) && s.replace(/[^A-Z]/g, '').length >= 2;
}

/**
 * The glossary terms worth auto-linking inline in a lesson's prose: every acronym in the
 * glossary (safe to match anywhere - LLM, MCP, RAG...) plus the full names of the terms this
 * lesson teaches. Deliberately conservative - common English words are not auto-linked.
 */
export function chipCandidates(lessonId: string): { text: string; slug: string }[] {
  const out = new Map<string, { text: string; slug: string }>();
  const add = (text: string, slug: string) => {
    const key = text.toLowerCase();
    if (!out.has(key)) out.set(key, { text, slug });
  };
  for (const g of GLOSSARY) for (const cand of [g.term, ...g.aliases]) if (isAcronym(cand)) add(cand, g.slug);
  for (const g of termsForLesson(lessonId)) {
    add(g.term, g.slug);
    for (const a of g.aliases) if (isAcronym(a)) add(a, g.slug);
  }
  return [...out.values()];
}

/** Simple glossary search over term, aliases and definition. */
export function searchGlossary(query: string): GlossaryEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return GLOSSARY;
  return GLOSSARY.map((g) => {
    const t = g.term.toLowerCase();
    let score = 0;
    if (t === q) score += 100;
    else if (t.startsWith(q)) score += 50;
    else if (t.includes(q)) score += 30;
    if (g.aliases.some((a) => a.toLowerCase().includes(q))) score += 25;
    if (g.definition.toLowerCase().includes(q)) score += 5;
    return { g, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).map((x) => x.g);
}

const pages = import.meta.glob('../content/reference/*.md', { query: '?raw', import: 'default' });
export async function loadReferencePage(id: string): Promise<string | null> {
  const load = pages[`../content/reference/${id}.md`];
  return load ? ((await load()) as string) : null;
}
