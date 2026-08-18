import { useNavigate } from 'react-router-dom';
import { PATHWAYS } from '../lib/pathways';
import { setPathway } from '../lib/progress';
import { useProgress } from '../lib/useProgress';
import { routeLessons } from '../lib/pathways';
import type { Syllabus } from '../lib/lessons';

/**
 * Three cards, one per pathway. Choosing one stores it and jumps to the first written lesson
 * on that route. The choice is never a lock - every lesson stays reachable from the syllabus.
 */
export function PathwayChooser({ syllabus, compact = false }: { syllabus: Syllabus | null; compact?: boolean }) {
  const navigate = useNavigate();
  const progress = useProgress();
  const chosen = progress.pathway ?? null;

  function choose(id: (typeof PATHWAYS)[number]['id']) {
    setPathway(id);
    if (!syllabus) return;
    const first = routeLessons(syllabus, id)[0];
    if (first) navigate(`/lesson/${first.id}`);
  }

  return (
    <div className={`pathway-grid ${compact ? 'compact' : ''}`}>
      {PATHWAYS.map((p) => {
        const written = syllabus ? routeLessons(syllabus, p.id).length : 0;
        const active = chosen === p.id;
        return (
          <article className={`pathway-card pathway-${p.id} ${active ? 'active' : ''}`} key={p.id}>
            <h3>
              <span aria-hidden="true">{p.emoji}</span> {p.name}
              {active && <span className="badge done">your route</span>}
            </h3>
            <p className="pathway-tagline">“{p.tagline}”</p>
            {!compact && <p>{p.blurb}</p>}
            <p className="muted small">
              {p.route} · {p.pace}
              {syllabus && ` · ${written} lesson${written === 1 ? '' : 's'} written so far`}
            </p>
            <button className={active ? 'ghost button' : 'button'} onClick={() => choose(p.id)}>
              {active ? 'Continue this route →' : `Start as ${p.name} →`}
            </button>
          </article>
        );
      })}
    </div>
  );
}
