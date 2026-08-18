import { Link, NavLink, Outlet } from 'react-router-dom';
import { ThemePicker } from './ThemePicker';

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
