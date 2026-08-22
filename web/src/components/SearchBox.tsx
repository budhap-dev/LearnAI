import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadIndex, search, terms, type SearchRecord } from '../lib/search';
import { searchGlossary, type GlossaryEntry } from '../lib/reference';

/** Wraps every occurrence of a search term in <mark> for highlighting. */
export function highlight(text: string, query: string): ReactNode {
  const words = terms(query);
  if (words.length === 0) return text;
  const pattern = new RegExp(`(${words.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return text.split(pattern).map((part, i) =>
    words.includes(part.toLowerCase()) ? <mark key={i}>{part}</mark> : part,
  );
}

// A flat list of what the dropdown can jump to: glossary terms first, then lessons.
type Item =
  | { kind: 'term'; entry: GlossaryEntry }
  | { kind: 'lesson'; record: SearchRecord };

/**
 * Header search with an autocomplete dropdown. Loads the lesson index on first focus, and
 * suggests matching glossary terms (MCP, LLM, RAG...) and lessons live - fully keyboard-driven.
 */
export function SearchBox() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [records, setRecords] = useState<SearchRecord[] | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  // Load the lesson index lazily - only when the box is first used. (The glossary is bundled.)
  function ensureIndex() {
    if (records === null) loadIndex().then(setRecords);
  }

  useEffect(() => {
    function onAway(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onAway);
    return () => document.removeEventListener('mousedown', onAway);
  }, []);

  const q = query.trim();
  const termHits = q.length > 1 ? searchGlossary(q).slice(0, 3) : [];
  const lessonHits = records && q.length > 1 ? search(records, q).slice(0, 6) : [];
  const items: Item[] = [
    ...termHits.map((entry) => ({ kind: 'term' as const, entry })),
    ...lessonHits.map((hit) => ({ kind: 'lesson' as const, record: hit.record })),
  ];

  function goItem(item: Item) {
    setOpen(false);
    setQuery('');
    setActive(-1);
    if (item.kind === 'term') navigate(`/reference/glossary?term=${item.entry.slug}`);
    else navigate(`/lesson/${item.record.id}`);
  }

  function seeAll() {
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
      setOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && items[active]) goItem(items[active]);
      else if (q.length > 1) seeAll();
    }
  }

  return (
    <div className="header-search" ref={boxRef} role="search">
      <input
        type="search"
        placeholder="Search lessons & terms…"
        value={query}
        aria-label="Search lessons and glossary terms"
        aria-expanded={open && items.length > 0}
        aria-autocomplete="list"
        role="combobox"
        aria-controls="search-suggestions"
        onFocus={ensureIndex}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />

      {open && q.length > 1 && (
        <ul className="search-suggest" id="search-suggestions" role="listbox">
          {items.length === 0 && <li className="ss-empty">No matches</li>}

          {termHits.length > 0 && <li className="ss-group" aria-hidden="true">Glossary</li>}
          {termHits.map((entry, i) => (
            <li key={`t-${entry.slug}`} className="ss-term" role="option" aria-selected={i === active}>
              <button
                className={i === active ? 'active' : ''}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  goItem({ kind: 'term', entry });
                }}
              >
                <span className="ss-title">{highlight(entry.term, query)}</span>
                <span className="ss-kind">term</span>
              </button>
            </li>
          ))}

          {lessonHits.length > 0 && <li className="ss-group" aria-hidden="true">Lessons</li>}
          {lessonHits.map((hit, j) => {
            const idx = termHits.length + j;
            return (
              <li key={`l-${hit.record.id}`} role="option" aria-selected={idx === active}>
                <button
                  className={idx === active ? 'active' : ''}
                  onMouseEnter={() => setActive(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    goItem({ kind: 'lesson', record: hit.record });
                  }}
                >
                  <span className="ss-id">{highlight(hit.record.id, query)}</span>
                  <span className="ss-title">{highlight(hit.record.title, query)}</span>
                </button>
              </li>
            );
          })}

          {lessonHits.length > 0 && (
            <li role="option" aria-selected={false} className="ss-all">
              <button onMouseDown={(e) => { e.preventDefault(); seeAll(); }}>
                See all results for “{q}” →
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
