import { Link } from 'react-router-dom';
import { useSyllabus } from '../lib/useSyllabus';
import { useProgress } from '../lib/useProgress';
import { LEVEL_LABEL, lessonsIn } from '../lib/lessons';

export function Syllabus() {
  const syllabus = useSyllabus();
  const progress = useProgress();

  if (!syllabus) return <p className="muted">Loading…</p>;

  return (
    <>
      <h1>Syllabus</h1>
      <p className="syllabus-lede muted">
        11 modules · 66 lessons planned · {syllabus.lessons.length} written so far. Every written
        lesson has runnable Python and TypeScript examples with captured output.
      </p>

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
              {lessons.length > 0 && (
                <ul className="lesson-list">
                  {lessons.map((l) => {
                    const state = progress.lessons[l.id];
                    return (
                      <li key={l.id}>
                        <Link to={`/lesson/${l.id}`}>
                          <span className="lid">{l.id}</span>
                          <span className="ltitle">
                            {l.title}
                            <span className="lsummary">{l.summary}</span>
                          </span>
                          <span className="lesson-meta">
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
