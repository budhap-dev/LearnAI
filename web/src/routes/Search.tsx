import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { loadIndex, search, type SearchRecord } from '../lib/search';
import { highlight } from '../components/SearchBox';
import { useSyllabus } from '../lib/useSyllabus';
import { LEVEL_LABEL, type Level } from '../lib/lessons';

export function Search() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [records, setRecords] = useState<SearchRecord[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const syllabus = useSyllabus();

  useEffect(() => {
    loadIndex().then(setRecords);
    inputRef.current?.focus();
  }, []);

  // Keep the URL query string in step so results are shareable/back-navigable.
  useEffect(() => {
    const trimmed = query.trim();
    setParams(trimmed ? { q: trimmed } : {}, { replace: true });
  }, [query, setParams]);

  const hits = useMemo(() => (records ? search(records, query) : []), [records, query]);
  const moduleName = (m: number) => syllabus?.modules.find((x) => x.id === m)?.name ?? '';

  return (
    <>
      <h1>Search</h1>
      <p className="lede">Titles, tags, objectives and the full notes of every written lesson.</p>

      <input
        ref={inputRef}
        className="search-input-big"
        type="search"
        placeholder="e.g. temperature, cosine, context window, hallucination…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search lessons"
      />

      {records === null && <p className="muted">Loading the index…</p>}
      {records !== null && query.trim().length > 1 && (
        <p className="muted result-count">
          {hits.length} {hits.length === 1 ? 'lesson' : 'lessons'} match “{query.trim()}”.
        </p>
      )}

      <ol className="search-results">
        {hits.map(({ record, snippet }) => (
          <li key={record.id}>
            <Link to={`/lesson/${record.id}`}>
              <div className="sr-head">
                <span className="lid">{record.id}</span>
                <strong>{highlight(record.title, query)}</strong>
                <span className={`level level-${record.level}`}>{LEVEL_LABEL[record.level as Level]}</span>
                <span className="sr-module">Module {record.module} · {moduleName(record.module)}</span>
              </div>
              <p className="sr-snippet">{highlight(snippet, query)}</p>
            </Link>
          </li>
        ))}
      </ol>

      {records !== null && query.trim().length > 1 && hits.length === 0 && (
        <p className="callout">Nothing matched. Try a single keyword — a concept, a technique, a term.</p>
      )}
    </>
  );
}
