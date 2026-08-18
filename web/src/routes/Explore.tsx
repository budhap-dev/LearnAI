import { Link, useParams } from 'react-router-dom';
import { EXPLORERS, Explorer } from '../components/Explorer';

/** /explore lists every explorer; /explore/:id shows one standalone. */
export function Explore() {
  const { id } = useParams();
  const info = id ? EXPLORERS.find((e) => e.id === id) : undefined;

  if (id && !info) {
    return (
      <>
        <h1>Explorer not found</h1>
        <Link to="/explore">All explorers</Link>
      </>
    );
  }

  if (info) {
    return (
      <>
        <nav className="crumbs">
          <Link to="/explore">Explorers</Link> <span>/</span> <span>{info.name}</span>
        </nav>
        <h1>{info.name}</h1>
        <p className="lede">{info.teaches}</p>
        <Explorer id={info.id} />
        <p className="muted">
          Taught in <Link to={`/lesson/${info.lesson}`}>lesson {info.lesson}</Link>.
        </p>
      </>
    );
  }

  return (
    <>
      <h1>Interactive explorers</h1>
      <p className="lede">
        Small, client-side mechanisms you can poke at. No API keys, nothing leaves your browser.
        Each is embedded in the lesson that teaches it and available here on its own.
      </p>
      <div className="module-grid">
        {EXPLORERS.map((e) => (
          <article className="module-card" key={e.id}>
            <h3><Link to={`/explore/${e.id}`}>{e.name}</Link></h3>
            <p>{e.teaches}</p>
            <p className="muted">Lesson {e.lesson}</p>
          </article>
        ))}
      </div>
    </>
  );
}
