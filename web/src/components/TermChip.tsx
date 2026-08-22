import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { termBySlug } from '../lib/reference';

/**
 * An inline glossary chip: the term links to its glossary entry, and a hover/focus card shows
 * the definition without leaving the lesson. Pure CSS reveal (see .term-chip in index.css), so
 * it works on keyboard focus too. Falls back to a plain link if the slug is unknown.
 */
export function TermChip({ slug, children }: { slug: string; children: ReactNode }) {
  const entry = termBySlug(slug);
  const to = `/reference/glossary?term=${slug}`;
  if (!entry) return <Link to={to}>{children}</Link>;
  return (
    <span className="term-chip">
      <Link className="term-chip-link" to={to}>{children}</Link>
      <span className="term-card" role="tooltip">
        <span className="term-card-title">{entry.term}</span>
        <span className="term-card-def">{entry.definition}</span>
      </span>
    </span>
  );
}
