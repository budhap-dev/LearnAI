import type { Audience, LessonMeta, Syllabus } from './lessons';

/**
 * Three routes through one body of content (STORIES.md §2.1). A pathway changes the order,
 * the framing and what is emphasised - never the ceiling: every lesson stays reachable.
 */
export interface Pathway {
  id: Audience;
  name: string;
  tagline: string;
  blurb: string;
  route: string;
  pace: string;
  emoji: string;
}

export const PATHWAYS: Pathway[] = [
  {
    id: 'orientation',
    name: 'Orientation',
    emoji: '🧭',
    tagline: 'I need the mental models, fast',
    blurb: 'For experienced engineers new to AI work. Foundations first, then how LLMs work, then classic ML - enough to reason about designs, review proposals and talk to specialists without bluffing.',
    route: 'Modules 1 → 2 → 3, then 4 lightly',
    pace: '~3 weeks',
  },
  {
    id: 'builder',
    name: 'Builder',
    emoji: '🔧',
    tagline: 'I have to ship a feature',
    blurb: 'Straight into how LLMs work, then prompting, APIs, RAG, evaluation and production. Every lesson has code in Python and TypeScript and something to build.',
    route: 'Modules 2 → 3 → 4 → 5 → 6 → 8, then 9',
    pace: '~6 weeks',
  },
  {
    id: 'architect',
    name: 'Architect',
    emoji: '🏛️',
    tagline: 'I own the system and the risk',
    blurb: 'For tech leads and architects: decision tables, failure modes, security, cost, governance. Skims the mechanics, goes deep on RAG, agents, evals and production, and ends with an ADR.',
    route: '2 (skim) → 6 → 7 → 8 → 9 → 10, plus 11',
    pace: '~4 weeks',
  },
];

export const pathwayById = Object.fromEntries(PATHWAYS.map((p) => [p.id, p])) as Record<Audience, Pathway>;

/** Position of a lesson on a pathway, or null if it is off-route. */
export function stepOn(lesson: LessonMeta, pathway: Audience): number | null {
  const order = lesson.pathwayOrder[pathway];
  return typeof order === 'number' ? order : null;
}

/** Lessons on the route, in route order. Off-route lessons are excluded (still reachable). */
export function routeLessons(syllabus: Syllabus, pathway: Audience): LessonMeta[] {
  return syllabus.lessons
    .filter((l) => stepOn(l, pathway) !== null)
    .sort((a, b) => (stepOn(a, pathway) ?? 0) - (stepOn(b, pathway) ?? 0));
}

/**
 * The lessons to navigate between from `current`: the pathway route when one is chosen and
 * the current lesson is on it, otherwise plain syllabus order.
 */
export function navigationOrder(syllabus: Syllabus, current: LessonMeta, pathway: Audience | null): LessonMeta[] {
  if (pathway && stepOn(current, pathway) !== null) return routeLessons(syllabus, pathway);
  return syllabus.lessons;
}
