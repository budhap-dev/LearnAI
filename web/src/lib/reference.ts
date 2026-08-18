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
