/**
 * Progress lives in localStorage only - no accounts, no backend, nothing personal ever
 * leaves the device. Versioned so the shape can change later without throwing away history.
 */
const KEY = 'learnai.progress.v1';

export type LessonState = 'not-started' | 'in-progress' | 'needs-review' | 'done';

export interface QuizAttempt {
  score: number;
  outOf: number;
  at: string;
}

export interface Progress {
  version: 1;
  lessons: Record<string, LessonState>;
  quizzes: Record<string, QuizAttempt[]>;
  /** The lesson most recently opened - powers "continue where you left off". */
  lastLesson?: string;
  /** Preferred example language on lesson pages. */
  language?: 'python' | 'ts';
  /** The chosen pathway, if any - orders the syllabus and prev/next. */
  pathway?: 'orientation' | 'builder' | 'architect';
}

const empty: Progress = { version: 1, lessons: {}, quizzes: {} };

export function read(): Progress {
  try {
    const stored = localStorage.getItem(KEY);
    if (!stored) return { ...empty };
    const parsed = JSON.parse(stored) as Progress;
    return parsed.version === 1 ? parsed : { ...empty };
  } catch {
    return { ...empty }; // private browsing, full storage or corrupt data must never break the site
  }
}

function write(progress: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
    window.dispatchEvent(new Event('progress-changed'));
  } catch {
    /* storage unavailable - the site still works, it just cannot remember */
  }
}

export function setLessonState(id: string, state: LessonState): void {
  const progress = read();
  // Never downgrade: opening a finished lesson again does not un-finish it.
  if (state === 'in-progress' && (progress.lessons[id] === 'done' || progress.lessons[id] === 'needs-review')) {
    progress.lastLesson = id;
    write(progress);
    return;
  }
  progress.lessons[id] = state;
  progress.lastLesson = id;
  write(progress);
}

export function recordQuiz(id: string, score: number, outOf: number): void {
  const progress = read();
  const attempts = progress.quizzes[id] ?? [];
  attempts.push({ score, outOf, at: new Date().toISOString() });
  progress.quizzes[id] = attempts;
  // 80% or better counts as learned; below that it is flagged for another look.
  progress.lessons[id] = score / outOf >= 0.8 ? 'done' : 'needs-review';
  write(progress);
}

export function bestScore(id: string): QuizAttempt | null {
  const attempts = read().quizzes[id] ?? [];
  if (attempts.length === 0) return null;
  return attempts.reduce((best, a) => (a.score > best.score ? a : best));
}

export function preferredLanguage(): 'python' | 'ts' {
  return read().language ?? 'python';
}

export function setPreferredLanguage(language: 'python' | 'ts'): void {
  const progress = read();
  progress.language = language;
  write(progress);
}

export function currentPathway(): Progress['pathway'] | null {
  return read().pathway ?? null;
}

export function setPathway(pathway: Progress['pathway'] | null): void {
  const progress = read();
  if (pathway) progress.pathway = pathway;
  else delete progress.pathway;
  write(progress);
}

export function importJson(json: string): boolean {
  try {
    const parsed = JSON.parse(json) as Progress;
    if (parsed.version !== 1 || typeof parsed.lessons !== 'object') return false;
    write(parsed);
    return true;
  } catch {
    return false;
  }
}

export function reset(): void {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event('progress-changed'));
  } catch {
    /* nothing to do */
  }
}

export function exportJson(): string {
  return JSON.stringify(read(), null, 2);
}
