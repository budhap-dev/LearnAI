import { Link } from 'react-router-dom';
import { useSyllabus } from '../lib/useSyllabus';
import { useProgress } from '../lib/useProgress';
import { LEVEL_LABEL, lessonsIn } from '../lib/lessons';
import { pathwayById, routeLessons, stepOn } from '../lib/pathways';
import { setPathway } from '../lib/progress';
import { PATHWAYS } from '../lib/pathways';

export function Syllabus() {
  const syllabus = useSyllabus();
  const progress = useProgress();

  if (!syllabus) return <p className="muted">Loading…</p>;
  const pathway = progress.pathway ?? null;
  const route = pathway ? routeLessons(syllabus, pathway) : [];

  return (
    <>
      <h1>Syllabus</h1>
      <p className="syllabus-lede muted">
        11 modules · {syllabus.lessons.length} lessons. Every code lesson has runnable Python
        and TypeScript examples with captured, byte-identical output.
      </p>

      <div className="route-bar" role="group" aria-label="Pathway">
        <span className="small">Route:</span>
        <button className={`chip ${!pathway ? 'active' : ''}`} onClick={() => setPathway(null)}>All lessons</button>
        {PATHWAYS.map((p) => (
          <button key={p.id} className={`chip ${pathway === p.id ? 'active' : ''}`} onClick={() => setPathway(p.id)}>
            {p.emoji} {p.name}
          </button>
        ))}
        {pathway && (
          <span className="muted small">
            {pathwayById[pathway].route} · {route.length} written lesson{route.length === 1 ? '' : 's'} on this route; others shown dimmed
          </span>
        )}
      </div>

      {pathway && route.length > 0 && (
        <details className="module-accordion route-order" open>
          <summary>
            <span className="num">→</span>
            <span className="module-title">
              <strong>{pathwayById[pathway].emoji} Your route, in order</strong>
              <span className="module-meta">{route.filter((l) => progress.lessons[l.id] === 'done').length}/{route.length} done</span>
            </span>
            <span className="chevron" aria-hidden="true" />
          </summary>
          <div className="module-body">
            <ol className="route-list">
              {route.map((l) => (
                <li key={l.id}>
                  <Link to={`/lesson/${l.id}`}>
                    <span className="lid">{l.id}</span> {l.title}
                    {progress.lessons[l.id] === 'done' && <span className="badge done">done</span>}
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </details>
      )}

      {syllabus.modules.map((m) => {
        const lessons = lessonsIn(syllabus, m.id);
        const done = lessons.filter((l) => progress.lessons[l.id] === 'done').length;
        return (
          <details className="module-accordion" key={m.id} open={lessons.length > 0} style={{ ['--mc' as string]: `var(--m${m.id})` }}>
            <summary>
              <span className="num">{m.id}</span>
              <span className="module-title">
                <strong>{m.emoji} {m.name}</strong>
                <span className="module-meta">
                  {LEVEL_LABEL[m.level]} · {lessons.length ? `${done}/${lessons.length} done` : 'in preparation'}
                </span>
              </span>
              <span className="chevron" aria-hidden="true" />
            </summary>
            <div className="module-body">
              <p className="blurb">{m.blurb}</p>
              <p className="module-overview-link"><Link to={`/module/${m.id}`}>Module {m.id} overview →</Link></p>
              {lessons.length > 0 && (
                <ul className="lesson-list">
                  {lessons.map((l) => {
                    const state = progress.lessons[l.id];
                    const step = pathway ? stepOn(l, pathway) : null;
                    return (
                      <li key={l.id} className={pathway && step === null ? 'off-route' : ''}>
                        <Link to={`/lesson/${l.id}`}>
                          <span className="lid">{l.id}</span>
                          <span className="ltitle">
                            {l.title}
                            <span className="lsummary">{l.summary}</span>
                          </span>
                          <span className="lesson-meta">
                            {step !== null && <span className="badge route">step {step}</span>}
                            <span className={`level level-${l.level}`}>{LEVEL_LABEL[l.level]}</span>
                            <span className="muted">{l.estimatedMinutes} min</span>
                            {state === 'done' && <span className="badge done">done</span>}
                            {state === 'needs-review' && <span className="badge needs-review">review</span>}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </details>
        );
      })}
    </>
  );
}
