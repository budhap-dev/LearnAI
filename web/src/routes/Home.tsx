import { Link } from 'react-router-dom';
import { useSyllabus } from '../lib/useSyllabus';
import { useProgress } from '../lib/useProgress';
import { LEVEL_LABEL, lessonsIn } from '../lib/lessons';
import { PathwayChooser } from '../components/PathwayChooser';
import { pathwayById } from '../lib/pathways';

export function Home() {
  const syllabus = useSyllabus();
  const progress = useProgress();

  const done = Object.values(progress.lessons).filter((s) => s === 'done').length;
  const last = progress.lastLesson && syllabus?.lessons.find((l) => l.id === progress.lastLesson);
  const written = syllabus?.lessons.length ?? 0;

  return (
    <>
      <section className="hero">
        <h1>AI for software professionals — from what a token is to production systems.</h1>
        <p className="lede">
          Not a computer-science course and not a list of prompt tips. Every mechanism is drawn,
          every claim runs in Python <em>and</em> TypeScript with captured output, and every lesson
          ends in something to do. For senior developers, tech leads and architects who have to
          build this — and defend the design.
        </p>
        <div className="cta">
          {last ? (
            <Link className="button" to={`/lesson/${last.id}`}>
              Continue → {last.id} {last.title}
            </Link>
          ) : (
            <Link className="button" to={`/lesson/${syllabus?.lessons[0]?.id ?? '2.1'}`}>
              Start with {syllabus?.lessons[0]?.id ?? '2.1'} {syllabus?.lessons[0]?.title.split(' — ')[0] ?? ''} →
            </Link>
          )}
          <Link className="button ghost" to="/syllabus">Full syllabus</Link>
          <Link className="button ghost" to="/explore">Interactive explorers</Link>
        </div>
        {written > 0 && (
          <p className="muted">
            {done} of {written} written lesson{written === 1 ? '' : 's'} done
            {progress.pathway && ` · on the ${pathwayById[progress.pathway].name} route`} ·{' '}
            <Link to="/progress">your progress</Link>
          </p>
        )}
      </section>

      <h2>Choose your route</h2>
      <p className="muted">
        One body of content, three ways in. The route changes the order and the emphasis, never
        the ceiling — every lesson stays reachable. Change it any time.
      </p>
      <PathwayChooser syllabus={syllabus} />

      <h2>Three levels, eleven modules</h2>
      <p className="muted">
        Basic (modules 1–3) builds the mental models. Intermediate (4–7) is building: prompts,
        APIs, RAG, agents. Advanced (8–11) is owning it: evals, production, customising models,
        the lifecycle.
      </p>

      {syllabus ? (
        <div className="module-grid">
          {syllabus.modules.map((m) => {
            const lessons = lessonsIn(syllabus, m.id);
            return (
              <article className="module-card" key={m.id} style={{ ['--mc' as string]: `var(--m${m.id})` }}>
                <h3>
                  <Link to={`/module/${m.id}`} className="module-card-title">
                    <span className="num">{m.id}</span>
                    <span className="module-emoji" aria-hidden="true">{m.emoji}</span>
                    {m.name}
                  </Link>
                </h3>
                <p className={`level level-${m.level}`}>{LEVEL_LABEL[m.level]}</p>
                <p>{m.blurb}</p>
                {lessons.length > 0 ? (
                  <ul>
                    {lessons.map((l) => (
                      <li key={l.id}>
                        <Link to={`/lesson/${l.id}`}>
                          <span className="lid">{l.id}</span> {l.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">Lessons in preparation.</p>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="muted">Loading…</p>
      )}
    </>
  );
}
