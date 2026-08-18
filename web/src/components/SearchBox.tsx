import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadIndex, search, terms, type SearchRecord } from '../lib/search';

/** Wraps every occurrence of a search term in <mark> for highlighting. */
export function highlight(text: string, query: string): ReactNode {
  const words = terms(query);
  if (words.length === 0) return text;
  const pattern = new RegExp(`(${words.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return text.split(pattern).map((part, i) =>
    words.includes(part.toLowerCase()) ? <mark key={i}>{part}</mark> : part,
  );
}

/**
 * Header search with an autocomplete dropdown. Loads the index on first focus, suggests up to
 * eight matching lessons live, and is fully keyboard-driven (up/down/enter/escape).
 */
export function SearchBox() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [records, setRecords] = useState<SearchRecord[] | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  // Load the index lazily - only when the box is first used.
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

  const suggestions = records && query.trim().length > 1 ? search(records, query).slice(0, 8) : [];

  function go(id: string) {
    setOpen(false);
    setQuery('');
    setActive(-1);
    navigate(`/lesson/${id}`);
  }

  function seeAll() {
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
      setOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && suggestions[active]) go(suggestions[active].record.id);
      else if (query.trim().length > 1) seeAll();
    }
  }

  return (
    <div className="header-search" ref={boxRef} role="search">
      <input
        type="search"
        placeholder="Search lessons…"
        value={query}
        aria-label="Search lessons"
        aria-expanded={open && suggestions.length > 0}
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

      {open && query.trim().length > 1 && (
        <ul className="search-suggest" id="search-suggestions" role="listbox">
          {suggestions.length === 0 && <li className="ss-empty">No matches</li>}
          {suggestions.map((hit, i) => (
            <li key={hit.record.id} role="option" aria-selected={i === active}>
              <button
                className={i === active ? 'active' : ''}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep focus, fire before blur closes the list
                  go(hit.record.id);
                }}
              >
                <span className="ss-id">{hit.record.id}</span>
                <span className="ss-title">{highlight(hit.record.title, query)}</span>
              </button>
            </li>
          ))}
          {suggestions.length > 0 && (
            <li role="option" aria-selected={false} className="ss-all">
              <button onMouseDown={(e) => { e.preventDefault(); seeAll(); }}>
                See all results for “{query.trim()}” →
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
