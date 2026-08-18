/**
 * Lesson metadata comes from docs/*.md frontmatter, validated and merged by
 * scripts/build-content.mjs into static JSON. The syllabus is small and loaded once;
 * each lesson's code and captured output is fetched only when that lesson is opened.
 */

export type Level = 'basic' | 'intermediate' | 'advanced';
export type Audience = 'orientation' | 'builder' | 'architect';
export type Language = 'python' | 'ts';

export interface ModuleInfo {
  id: number;
  name: string;
  emoji: string;
  level: Level;
  blurb: string;
}

export interface LessonMeta {
  id: string;
  module: number;
  title: string;
  level: Level;
  summary: string;
  objectives: string[];
  prerequisites: string[];
  estimatedMinutes: number;
  audiences: Audience[];
  pathwayOrder: Partial<Record<Audience, number | 'skip'>>;
  languages: Language[];
  explorers: string[];
  diagrams: string[];
  tags: string[];
}

export interface Syllabus {
  modules: ModuleInfo[];
  lessons: LessonMeta[];
}

/** Per-lesson code regions and captured outputs, keyed by name then language. */
export interface LessonData {
  id: string;
  files: Partial<Record<Language, string>>;
  code: Record<string, Partial<Record<Language, string>>>;
  output: Record<string, Partial<Record<Language, string>>>;
  /** Model responses replayed from cassettes, if the example called a model. */
  recorded: { model: string; recorded_at: string }[];
}

export const LEVEL_LABEL: Record<Level, string> = {
  basic: 'Basic',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const LANGUAGE_LABEL: Record<Language, string> = { python: 'Python', ts: 'TypeScript' };

const base = import.meta.env.BASE_URL;

let syllabusPromise: Promise<Syllabus> | null = null;

export function loadSyllabus(): Promise<Syllabus> {
  syllabusPromise ??= fetch(`${base}data/syllabus.json`).then((r) => r.json());
  return syllabusPromise;
}

const lessonData = new Map<string, Promise<LessonData | null>>();

export function loadLessonData(id: string): Promise<LessonData | null> {
  let p = lessonData.get(id);
  if (!p) {
    p = fetch(`${base}data/lessons/${id}.json`).then((r) => (r.ok ? r.json() : null));
    lessonData.set(id, p);
  }
  return p;
}

/** Markdown notes, bundled but split per lesson so only what is opened is downloaded. */
const notes = import.meta.glob('../content/lessons/*.md', { query: '?raw', import: 'default' });

export async function loadNotes(id: string): Promise<string | null> {
  const load = notes[`../content/lessons/${id}.md`];
  return load ? ((await load()) as string) : null;
}

export function lessonsIn(syllabus: Syllabus, module: number): LessonMeta[] {
  return syllabus.lessons.filter((l) => l.module === module);
}
