import { Link, useParams } from 'react-router-dom';
import { useSyllabus } from '../lib/useSyllabus';
import { useProgress } from '../lib/useProgress';
import { LEVEL_LABEL, lessonsIn } from '../lib/lessons';

/**
 * A per-module overview page: the module's promise ("what you can build"), its lessons with
 * progress and badges, and navigation to the neighbouring modules. Linked from Home and the
 * syllabus; every module is a deep-linkable page at /module/:id.
 */
export function Module() {
  const { id } = useParams();
  const syllabus = useSyllabus();
  const progress = useProgress();

  if (!syllabus) return <p className="muted">Loading…</p>;
  const moduleId = Number(id);
  const module = syllabus.modules.find((m) => m.id === moduleId);
  if (!module) {
    return (
      <>
        <h1>Module not found</h1>
        <p className="muted">No module “{id}”. <Link to="/syllabus">See the syllabus →</Link></p>
      </>
    );
  }

  const lessons = lessonsIn(syllabus, module.id);
  const done = lessons.filter((l) => progress.lessons[l.id] === 'done').length;
  const totalMinutes = lessons.reduce((s, l) => s + l.estimatedMinutes, 0);
  const withCode = lessons.filter((l) => l.languages.length > 0).length;
  const withExplorer = lessons.filter((l) => l.explorers.length > 0).length;
  const prev = syllabus.modules.find((m) => m.id === module.id - 1);
  const next = syllabus.modules.find((m) => m.id === module.id + 1);

  return (
    <div className="module-page" style={{ ['--mc' as string]: `var(--m${module.id})` }}>
      <p className="crumb"><Link to="/syllabus">Syllabus</Link> / Module {module.id}</p>

      <h1 className="module-page-title">
        <span className="num">{module.id}</span>
        <span className="module-emoji" aria-hidden="true">{module.emoji}</span>
        {module.name}
      </h1>
      <p className={`level level-${module.level}`}>{LEVEL_LABEL[module.level]}</p>
      <p className="module-page-blurb">{module.blurb}</p>

      {module.build && (
        <div className="module-build">
          <span className="module-build-label">What you can build after this module</span>
          <p>{module.build}</p>
        </div>
      )}

      {lessons.length > 0 ? (
        <>
          <p className="module-page-stats muted">
            {lessons.length} lesson{lessons.length === 1 ? '' : 's'} · {done}/{lessons.length} done ·
            {' '}~{totalMinutes} min · {withCode} with runnable code · {withExplorer} with an explorer
          </p>

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
                      {l.languages.length > 0 && <span className="badge kind">code</span>}
                      {l.explorers.length > 0 && <span className="badge kind">explorer</span>}
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
        </>
      ) : (
        <p className="muted">Lessons in preparation.</p>
      )}

      <nav className="module-nav" aria-label="Adjacent modules">
        {prev ? (
          <Link className="module-nav-link prev" to={`/module/${prev.id}`}>
            <span className="dir">← Module {prev.id}</span>
            <span className="nm">{prev.emoji} {prev.name}</span>
          </Link>
        ) : <span />}
        {next ? (
          <Link className="module-nav-link next" to={`/module/${next.id}`}>
            <span className="dir">Module {next.id} →</span>
            <span className="nm">{next.emoji} {next.name}</span>
          </Link>
        ) : <span />}
      </nav>
    </div>
  );
}
