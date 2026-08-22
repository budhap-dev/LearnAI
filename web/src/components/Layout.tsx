import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ThemePicker } from './ThemePicker';
import { SearchBox } from './SearchBox';
import { useProgress } from '../lib/useProgress';
import { useSyllabus } from '../lib/useSyllabus';

function ProgressPill() {
  const progress = useProgress();
  const syllabus = useSyllabus();
  const total = syllabus?.lessons.length ?? 0;
  const done = Object.values(progress.lessons).filter((s) => s === 'done').length;
  if (!total) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <Link to="/progress" className="progress-pill" title="Your progress" aria-label={`Progress: ${done} of ${total} lessons done`}>
      <span className="ring" style={{ ['--pct' as string]: `${pct}%` }} aria-hidden="true" />
      {done}/{total}
    </Link>
  );
}


const ICON = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, width: 18, height: 18 } as const;

const NAV = [
  { to: '/', label: 'Home', end: true, icon: (<svg {...ICON}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h5v-6h4v6h5V9.5" /></svg>) },
  { to: '/syllabus', label: 'Syllabus', end: false, icon: (<svg {...ICON}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19a1 1 0 0 1 1 1v13.5" /><path d="M4 5.5V19a1 1 0 0 0 1 1h15" /><path d="M8 8h8M8 12h8" /></svg>) },
  { to: '/explore', label: 'Explore', end: false, icon: (<svg {...ICON}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></svg>) },
  { to: '/reference', label: 'Reference', end: false, icon: (<svg {...ICON}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z" /><path d="M4 5v14" /><path d="M9 7h6" /></svg>) },
] as const;

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the route changes (a nav link was followed).
  useEffect(() => setMenuOpen(false), [location.pathname]);

  // While the drawer is open: lock body scroll and let Escape close it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <div className="shell">
      <header>
        <Link to="/" className="brand">
          Learn<span>AI</span>
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="site-nav"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
        </button>

        <div id="site-nav" className={`site-nav ${menuOpen ? 'open' : ''}`}>
          <div className="nav-header">
            <span className="nav-header-title" aria-hidden="true">Learn<span>AI</span></span>
            <button type="button" className="nav-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
              ✕
            </button>
          </div>
          <nav aria-label="Primary">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end}>
                <span className="nav-ico">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="header-right">
            <SearchBox />
            <ProgressPill />
            <ThemePicker />
          </div>
        </div>
      </header>

      <button
        type="button"
        className={`nav-backdrop ${menuOpen ? 'show' : ''}`}
        aria-hidden="true"
        tabIndex={-1}
        onClick={() => setMenuOpen(false)}
      />

      <main>
        <Outlet />
      </main>

      <footer>
        <p>
          Every code snippet on this site is a traced extract of a Python and TypeScript example
          that really runs; every output was captured from that run.{' '}
          <a href="https://github.com/budhap-dev/LearnAI">Source</a>
        </p>
      </footer>
    </div>
  );
}
