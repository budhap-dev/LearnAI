import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MarkdownLink } from '../components/MarkdownLink';
import { GLOSSARY, REFERENCE_PAGES, loadReferencePage, searchGlossary, termBySlug, type GlossaryEntry } from '../lib/reference';
import { useSyllabus } from '../lib/useSyllabus';

/** /reference - index; /reference/glossary - the glossary; /reference/:id - a Markdown page. */
export function Reference() {
  const { id } = useParams();
  if (!id) return <ReferenceIndex />;
  if (id === 'glossary') return <Glossary />;
  return <ReferencePage id={id} />;
}

function ReferenceIndex() {
  return (
    <>
      <h1>Reference</h1>
      <p className="lede">
        The lookup pages: every term defined and linked to its lesson, the recurring architecture
        decisions as tables, the checklists for reviews and launches, and the one dated place model
        names and prices live.
      </p>
      <div className="module-grid">
        <article className="module-card">
          <h3><Link to="/reference/glossary">Glossary</Link></h3>
          <p>{GLOSSARY.length} terms, each in a sentence or two, linked to the lessons that teach them.</p>
        </article>
        {REFERENCE_PAGES.map((p) => (
          <article className="module-card" key={p.id}>
            <h3><Link to={`/reference/${p.id}`}>{p.title}</Link></h3>
            <p>{p.summary}</p>
          </article>
        ))}
      </div>
    </>
  );
}

function ReferencePage({ id }: { id: string }) {
  const meta = REFERENCE_PAGES.find((p) => p.id === id);
  const [body, setBody] = useState<string | null>(null);
  useEffect(() => {
    setBody(null);
    loadReferencePage(id).then(setBody);
    window.scrollTo(0, 0);
  }, [id]);
  if (!meta) {
    return (
      <>
        <h1>Page not found</h1>
        <Link to="/reference">Reference</Link>
      </>
    );
  }
  return (
    <article className="lesson">
      <nav className="crumbs"><Link to="/reference">Reference</Link> <span>/</span> <span>{meta.title}</span></nav>
      <h1>{meta.title}</h1>
      <p className="summary">{meta.summary}</p>
      {body ? (
        <div className="prose reference-prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: MarkdownLink }}>{body}</ReactMarkdown>
        </div>
      ) : (
        <p className="muted">Loading…</p>
      )}
    </article>
  );
}

function Glossary() {
  // The URL is the state: ?q= filters, ?term= highlights. No local copy, so no sync loops.
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const selected = params.get('term');
  const syllabus = useSyllabus();
  const entries = useMemo(() => searchGlossary(query), [query]);
  const lessonTitle = (id: string) => syllabus?.lessons.find((l) => l.id === id)?.title ?? '';

  function setQuery(value: string) {
    const next: Record<string, string> = {};
    if (value.trim()) next.q = value;
    if (selected) next.term = selected;
    setParams(next, { replace: true });
  }

  useEffect(() => {
    if (selected) document.getElementById(`term-${selected}`)?.scrollIntoView({ block: 'center' });
  }, [selected]);

  return (
    <>
      <nav className="crumbs"><Link to="/reference">Reference</Link> <span>/</span> <span>Glossary</span></nav>
      <h1>Glossary</h1>
      <p className="lede">{GLOSSARY.length} terms. Each links to the lessons that teach it and to related terms.</p>
      <input
        className="search-input-big"
        type="search"
        placeholder="Filter terms… e.g. token, drift, precision"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Filter glossary"
      />
      {entries.length === 0 && <p className="muted">No terms match.</p>}
      <dl className="glossary">
        {entries.map((g) => (
          <GlossaryItem key={g.slug} entry={g} highlighted={g.slug === selected} lessonTitle={lessonTitle} />
        ))}
      </dl>
    </>
  );
}

function GlossaryItem({ entry, highlighted, lessonTitle }: { entry: GlossaryEntry; highlighted: boolean; lessonTitle: (id: string) => string }) {
  return (
    <div className={`glossary-item ${highlighted ? 'highlighted' : ''}`} id={`term-${entry.slug}`}>
      <dt>
        <Link to={`/reference/glossary?term=${entry.slug}`}>{entry.term}</Link>
        {entry.aliases.length > 0 && <span className="muted small"> also: {entry.aliases.join(', ')}</span>}
      </dt>
      <dd>
        <p>{entry.definition}</p>
        <p className="small glossary-meta">
          {entry.lessons.length > 0 && (
            <>
              <span className="muted">Taught in </span>
              {entry.lessons.map((id, i) => (
                <span key={id}>{i > 0 && ', '}<Link to={`/lesson/${id}`} title={lessonTitle(id)}>{id}</Link></span>
              ))}
            </>
          )}
          {entry.plannedLessons.length > 0 && <span className="muted"> · coming in {entry.plannedLessons.join(', ')}</span>}
          {entry.related.length > 0 && (
            <>
              <span className="muted"> · Related: </span>
              {entry.related.map((r, i) => {
                const t = termBySlug(r.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
                return <span key={r}>{i > 0 && ', '}{t ? <Link to={`/reference/glossary?term=${t.slug}`}>{r}</Link> : r}</span>;
              })}
            </>
          )}
        </p>
      </dd>
    </div>
  );
}
