import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { termBySlug } from '../lib/reference';

/** The first fenced code block of an example - the part that fits a hover card. */
function exampleSnippet(markdown: string | undefined): string | null {
  const m = markdown?.match(/```[^\n]*\n([\s\S]*?)\n```/);
  return m ? m[1] : null;
}

/**
 * An inline glossary chip: the term links to its glossary entry, and a hover/focus card shows
 * the definition (and the example's code, scrollable) without leaving the lesson. Pure CSS
 * reveal (see .term-chip in index.css), so it works on keyboard focus too. Everything inside is
 * a <span> because the chip sits in a paragraph. Falls back to a plain link if the slug is unknown.
 */
export function TermChip({ slug, children }: { slug: string; children: ReactNode }) {
  const entry = termBySlug(slug);
  const to = `/reference/glossary?term=${slug}`;
  if (!entry) return <Link to={to}>{children}</Link>;
  const snippet = exampleSnippet(entry.example);
  return (
    <span className="term-chip">
      <Link className="term-chip-link" to={to}>{children}</Link>
      <span className={`term-card ${snippet ? 'has-example' : ''}`} role="tooltip">
        <span className="term-card-title">{entry.term}</span>
        <span className="term-card-def">{entry.definition}</span>
        {snippet && (
          <>
            <span className="term-card-label">Example</span>
            <span className="term-card-code">{snippet}</span>
          </>
        )}
      </span>
    </span>
  );
}
