/**
 * A rehype plugin that turns inline lesson citations in prose - "(8.4)", "(6.1, 10.1)",
 * "Lesson 2.7", "Lessons 6.3-6.7" - into links to those lessons. Only tokens that are real
 * lesson ids are linked, and only in a citation context (after "(", ",", "Lesson"/"Lab", or a
 * range dash), so ordinary decimals in the prose (0.5, 1.5x, a loss of 3.6) are left alone.
 * Never links inside existing links, code, or headings.
 */
import { visit, SKIP } from 'unist-util-visit';

interface HastText { type: 'text'; value: string }
interface HastElement { type: 'element'; tagName: string; properties?: Record<string, unknown>; children: unknown[] }
type HastNode = HastText | HastElement | { type: string };

const SKIP_TAGS = new Set(['a', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const TOKEN = /\d+\.\d+/g;

/** True when the text ending at a match looks like a lesson citation, not a bare decimal. */
function inCitationContext(before: string): boolean {
  return (
    /[(,]\s*$/.test(before) || // "(8.4"  or  ", 10.1"
    /\b[Ll]essons?\s+$/.test(before) || // "Lesson 2.7"
    /\b[Ll]abs?\s+$/.test(before) || // "Lab 5"
    /\d\s*[-–]\s*$/.test(before) // "6.3-6.7" (range continuation)
  );
}

export function rehypeLessonRefs(options: { ids?: Iterable<string> } = {}) {
  const ids = new Set(options.ids ?? []);
  if (ids.size === 0) return () => {};

  return (tree: unknown) => {
    visit(tree as HastNode, 'text', (node: HastText, index: number | undefined, parent: HastElement | undefined) => {
      if (!parent || index == null || parent.type !== 'element' || SKIP_TAGS.has(parent.tagName)) return;
      const value = node.value;
      TOKEN.lastIndex = 0;
      const out: HastNode[] = [];
      let last = 0;
      let changed = false;
      let m: RegExpExecArray | null;
      while ((m = TOKEN.exec(value))) {
        if (!ids.has(m[0]) || !inCitationContext(value.slice(0, m.index))) continue;
        changed = true;
        if (m.index > last) out.push({ type: 'text', value: value.slice(last, m.index) });
        out.push({
          type: 'element',
          tagName: 'a',
          properties: { href: `#/lesson/${m[0]}`, className: ['lesson-ref'] },
          children: [{ type: 'text', value: m[0] }],
        });
        last = m.index + m[0].length;
      }
      if (!changed) return;
      if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
      parent.children.splice(index, 1, ...out);
      return [SKIP, index + out.length];
    });
  };
}
