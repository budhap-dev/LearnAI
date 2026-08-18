import { Link, NavLink, Outlet } from 'react-router-dom';
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

export function Layout() {
  return (
    <div className="shell">
      <header>
        <Link to="/" className="brand">
          Learn<span>AI</span>
        </Link>
        <nav aria-label="Primary">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/syllabus">Syllabus</NavLink>
          <NavLink to="/explore">Explore</NavLink>
        </nav>
        <div className="header-right">
          <SearchBox />
          <ProgressPill />
          <ThemePicker />
        </div>
      </header>

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
