import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSyllabus } from '../lib/useSyllabus';
import { useProgress } from '../lib/useProgress';
import { LEVEL_LABEL, lessonsIn, type Level } from '../lib/lessons';
import { exportJson, importJson, reset } from '../lib/progress';
import { pathwayById, routeLessons } from '../lib/pathways';

/**
 * Everything the site remembers, in one place: completion per module and level, best quiz
 * scores, weak topics, and export/import/reset. All of it lives in this browser only.
 */
export function Progress() {
  const syllabus = useSyllabus();
  const progress = useProgress();
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!syllabus) return <p className="muted">Loading…</p>;

  const written = syllabus.lessons;
  const done = written.filter((l) => progress.lessons[l.id] === 'done');
  const review = written.filter((l) => progress.lessons[l.id] === 'needs-review');
  const started = written.filter((l) => progress.lessons[l.id] === 'in-progress');
  const pathway = progress.pathway ?? null;
  const route = pathway ? routeLessons(syllabus, pathway) : [];
  const routeDone = route.filter((l) => progress.lessons[l.id] === 'done').length;

  const levels: Level[] = ['basic', 'intermediate', 'advanced'];

  // Weak topics: quiz questions' topics are not stored per attempt (yet), so use lessons
  // marked needs-review and best scores under 80%.
  const weak = written
    .map((l) => ({ lesson: l, best: (progress.quizzes[l.id] ?? []).reduce((b, a) => Math.max(b, a.score / a.outOf), 0), attempts: (progress.quizzes[l.id] ?? []).length }))
    .filter((w) => w.attempts > 0 && w.best < 0.8)
    .sort((a, b) => a.best - b.best);

  function download() {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `learnai-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    const ok = importJson(await file.text());
    setMessage(ok ? 'Progress imported.' : 'That file is not a LearnAI progress export.');
  }

  function wipe() {
    if (window.confirm('Reset all progress on this device? Export first if you want to keep it.')) {
      reset();
      setMessage('Progress reset.');
    }
  }

  return (
    <>
      <h1>Your progress</h1>
      <p className="lede">
        Stored in this browser only — nothing leaves your device. Export a copy to move it or keep it.
      </p>

      <section className="stat-cards">
        <div className="stat-card"><span className="stat-n">{done.length}</span><span>lessons done</span></div>
        <div className="stat-card"><span className="stat-n">{review.length}</span><span>marked for review</span></div>
        <div className="stat-card"><span className="stat-n">{started.length}</span><span>in progress</span></div>
        <div className="stat-card"><span className="stat-n">{written.length}</span><span>lessons written</span></div>
      </section>

      {pathway ? (
        <p>
          <strong>{pathwayById[pathway].emoji} {pathwayById[pathway].name} route:</strong> {routeDone} of {route.length} written
          lessons done. <Link to="/syllabus">See the route →</Link>
        </p>
      ) : (
        <p className="muted">No route chosen yet — <Link to="/">pick one on the home page</Link> to get ordered navigation.</p>
      )}

      <h2>By level</h2>
      <ul className="bar-list">
        {levels.map((lv) => {
          const ls = written.filter((l) => l.level === lv);
          const d = ls.filter((l) => progress.lessons[l.id] === 'done').length;
          return (
            <li key={lv}>
              <span className={`level level-${lv}`}>{LEVEL_LABEL[lv]}</span>
              <span className="bar"><span style={{ width: ls.length ? `${(d / ls.length) * 100}%` : 0 }} /></span>
              <span className="muted small">{d}/{ls.length}</span>
            </li>
          );
        })}
      </ul>

      <h2>By module</h2>
      <ul className="bar-list">
        {syllabus.modules.map((m) => {
          const ls = lessonsIn(syllabus, m.id);
          const d = ls.filter((l) => progress.lessons[l.id] === 'done').length;
          return (
            <li key={m.id} style={{ ['--mc' as string]: `var(--m${m.id})` }}>
              <span className="module-name"><span className="num">{m.id}</span> {m.name}</span>
              <span className="bar"><span style={{ width: ls.length ? `${(d / ls.length) * 100}%` : 0 }} /></span>
              <span className="muted small">{ls.length ? `${d}/${ls.length}` : '—'}</span>
            </li>
          );
        })}
      </ul>

      <h2>Quiz scores</h2>
      {Object.keys(progress.quizzes).length === 0 ? (
        <p className="muted">No quizzes taken yet.</p>
      ) : (
        <table className="score-table">
          <thead><tr><th>Lesson</th><th>Best</th><th>Attempts</th><th>Last</th></tr></thead>
          <tbody>
            {written.filter((l) => progress.quizzes[l.id]?.length).map((l) => {
              const attempts = progress.quizzes[l.id];
              const best = attempts.reduce((b, a) => (a.score > b.score ? a : b));
              const last = attempts[attempts.length - 1];
              return (
                <tr key={l.id}>
                  <td><Link to={`/lesson/${l.id}`}><span className="lid">{l.id}</span> {l.title}</Link></td>
                  <td>{best.score}/{best.outOf}</td>
                  <td>{attempts.length}</td>
                  <td className="muted small">{new Date(last.at).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {weak.length > 0 && (
        <>
          <h2>Worth another look</h2>
          <ul className="lesson-list">
            {weak.map(({ lesson, best }) => (
              <li key={lesson.id}>
                <Link to={`/lesson/${lesson.id}`}>
                  <span className="lid">{lesson.id}</span>
                  <span className="ltitle">{lesson.title}</span>
                  <span className="badge needs-review">best {Math.round(best * 100)}%</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>Export, import, reset</h2>
      <div className="cta">
        <button className="button ghost" onClick={download}>Export JSON</button>
        <button className="button ghost" onClick={() => fileRef.current?.click()}>Import JSON</button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => upload(e.target.files?.[0])} />
        <button className="button ghost danger" onClick={wipe}>Reset</button>
      </div>
      {message && <p className="muted" aria-live="polite">{message}</p>}
    </>
  );
}
