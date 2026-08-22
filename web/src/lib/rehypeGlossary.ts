/**
 * A rehype plugin that turns recognised glossary terms in lesson prose into inline "chips"
 * (links to the glossary with a hover definition). Only the FIRST occurrence of each term is
 * linked, and never inside links, code, or headings - so the prose stays readable, not a sea
 * of links. The candidate set (see chipCandidates) is conservative: acronyms plus the lesson's
 * own key terms, never common English words.
 */
import { visit, SKIP } from 'unist-util-visit';

interface Candidate {
  text: string;
  slug: string;
}

// Minimal hast shapes - we avoid a hard dependency on @types/hast.
interface HastText {
  type: 'text';
  value: string;
}
interface HastElement {
  type: 'element';
  tagName: string;
  properties?: Record<string, unknown>;
  children: unknown[];
}
type HastNode = HastText | HastElement | { type: string };

const SKIP_TAGS = new Set(['a', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function rehypeGlossary(options: { candidates?: Candidate[] } = {}) {
  const candidates = options.candidates ?? [];
  if (candidates.length === 0) return () => {};

  const slugByText = new Map(candidates.map((c) => [c.text.toLowerCase(), c.slug]));
  // Longest first, so "Model Context Protocol" wins over a shorter substring.
  const sorted = [...candidates].sort((a, b) => b.text.length - a.text.length);
  const pattern = new RegExp(`\\b(${sorted.map((c) => escapeRe(c.text)).join('|')})\\b`, 'gi');

  return (tree: unknown) => {
    const used = new Set<string>();
    visit(tree as HastNode, 'text', (node: HastText, index: number | undefined, parent: HastElement | undefined) => {
      if (!parent || index == null || parent.type !== 'element' || SKIP_TAGS.has(parent.tagName)) return;
      const value = node.value;
      pattern.lastIndex = 0;
      const out: HastNode[] = [];
      let last = 0;
      let changed = false;
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(value))) {
        const slug = slugByText.get(m[0].toLowerCase());
        if (!slug || used.has(slug)) continue; // only the first occurrence of each term
        used.add(slug);
        changed = true;
        if (m.index > last) out.push({ type: 'text', value: value.slice(last, m.index) });
        out.push({
          type: 'element',
          tagName: 'a',
          properties: { href: `#/reference/glossary?term=${slug}`, className: ['term-chip'] },
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
