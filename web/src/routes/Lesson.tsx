import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LEVEL_LABEL, loadLessonData, loadNotes, type LessonData } from '../lib/lessons';
import { useSyllabus } from '../lib/useSyllabus';
import { MarkdownLink } from '../components/MarkdownLink';
import { Diagram } from '../components/Diagram';
import { CodeTabs } from '../components/CodeTabs';
import { OutputBlock } from '../components/OutputBlock';
import { Explorer } from '../components/Explorer';
import { CodeBlock } from '../components/CodeBlock';
import { Quiz, type Question } from '../components/Quiz';
import { Check, parseCheck } from '../components/Check';
import { bestScore, currentPathway, setLessonState } from '../lib/progress';
import { navigationOrder, pathwayById, stepOn } from '../lib/pathways';
import { termsForLesson } from '../lib/reference';

const quizzes = import.meta.glob('../data/quizzes/*.json', { import: 'default' });

/**
 * The notes use four custom fences, each naming a thing the build step has verified exists:
 *   ```code <region>       traced extract of the Python + TypeScript examples (tabs)
 *   ```output <marker>     output captured from running them
 *   ```diagram <name>      themed inline SVG from the registry
 *   ```explorer <id>       a lazy-loaded interactive island
 *   ```check               an inline check-yourself card (see components/Check.tsx)
 * Anything else is an ordinary code block.
 */
function makePreBlock(data: LessonData | null) {
  return function PreBlock(props: React.ComponentProps<'pre'>) {
    const child = props.children as
      | React.ReactElement<{ className?: string; children?: React.ReactNode }>
      | undefined;
    const className = child?.props?.className ?? '';
    const body = String(child?.props?.children ?? '').trim();

    if (/language-diagram/.test(className)) return <Diagram name={body} />;
    if (/language-check/.test(className)) {
      const spec = parseCheck(body);
      return spec ? <Check spec={spec} /> : <p className="missing">Malformed check card.</p>;
    }
    if (/language-explorer/.test(className)) return <Explorer id={body} />;
    if (/language-code/.test(className)) {
      if (!data) return <p className="muted">Loading code…</p>;
      return <CodeTabs code={data.code[body] ?? {}} region={body} />;
    }
    if (/language-output/.test(className)) {
      if (!data) return <p className="muted">Loading output…</p>;
      return <OutputBlock output={data.output[body] ?? {}} marker={body} recorded={data.recorded} />;
    }
    return (
      <CodeBlock source={body}>
        <pre {...props} />
      </CodeBlock>
    );
  };
}

/** The glossary entries this lesson teaches - a recap before the quiz. */
function KeyTerms({ lessonId }: { lessonId: string }) {
  const terms = termsForLesson(lessonId);
  if (terms.length === 0) return null;
  return (
    <section className="key-terms">
      <h2>Key terms</h2>
      <dl>
        {terms.map((t) => (
          <div key={t.slug}>
            <dt><Link to={`/reference/glossary?term=${t.slug}`}>{t.term}</Link></dt>
            <dd>{t.definition}</dd>
          </div>
        ))}
      </dl>
      <p className="muted small"><Link to="/reference/glossary">Browse the full glossary →</Link></p>
    </section>
  );
}

export function Lesson() {
  const { id } = useParams();
  const syllabus = useSyllabus();
  const lesson = syllabus?.lessons.find((l) => l.id === id);

  const [notes, setNotes] = useState<string | null>(null);
  const [data, setData] = useState<LessonData | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    if (!id) return;
    setNotes(null);
    setData(null);
    setQuestions(null);
    setShowQuiz(false);

    loadNotes(id).then(setNotes);
    loadLessonData(id).then(setData);
    const loadQuiz = quizzes[`../data/quizzes/${id}.json`];
    if (loadQuiz) loadQuiz().then((q) => setQuestions(q as Question[]));

    setLessonState(id, 'in-progress');
    window.scrollTo(0, 0);
  }, [id]);

  if (!syllabus) return <p className="muted">Loading…</p>;

  if (!lesson) {
    return (
      <>
        <h1>Lesson not found</h1>
        <p className="muted">This lesson may not be written yet.</p>
        <Link to="/syllabus">Back to the syllabus</Link>
      </>
    );
  }

  const module = syllabus.modules.find((m) => m.id === lesson.module);
  const pathway = currentPathway() ?? null;
  const order = navigationOrder(syllabus, lesson, pathway);
  const position = order.indexOf(lesson);
  const previous = order[position - 1];
  const next = order[position + 1];
  const step = pathway ? stepOn(lesson, pathway) : null;
  const best = bestScore(lesson.id);
  const PreBlock = makePreBlock(data);

  return (
    <article className="lesson" style={{ ['--mc' as string]: `var(--m${lesson.module})` }}>
      <nav className="crumbs">
        <Link to="/syllabus">Syllabus</Link> <span>/</span>{' '}
        <span>
          {module?.emoji} Module {lesson.module} — {module?.name}
        </span>
      </nav>

      <h1>
        <span className="lid big">{lesson.id}</span>
        {lesson.title}
      </h1>

      <p className="lesson-meta-line">
        <span className={`level level-${lesson.level}`}>{LEVEL_LABEL[lesson.level]}</span>
        {pathway && (
          <span className={`badge ${step !== null ? 'route' : ''}`}>
            {step !== null ? `${pathwayById[pathway].name} route · step ${step}` : `off the ${pathwayById[pathway].name} route`}
          </span>
        )}
        <span className="muted">~{lesson.estimatedMinutes} min</span>
        {lesson.languages.length > 0 && (
          <span className="muted">
            examples: {lesson.languages.map((l) => (l === 'ts' ? 'TypeScript' : 'Python')).join(' + ')}
          </span>
        )}
        {lesson.prerequisites.length > 0 && (
          <span className="muted">
            after:{' '}
            {lesson.prerequisites.map((p, i) => (
              <React.Fragment key={p}>
                {i > 0 && ', '}
                {syllabus.lessons.some((l) => l.id === p) ? <Link to={`/lesson/${p}`}>{p}</Link> : p}
              </React.Fragment>
            ))}
          </span>
        )}
      </p>

      <p className="summary">{lesson.summary}</p>

      <section className="objectives">
        <h2>By the end of this lesson you can</h2>
        <ul>
          {lesson.objectives.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      </section>

      {notes ? (
        <div className="prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: MarkdownLink, pre: PreBlock }}>
            {notes}
          </ReactMarkdown>
        </div>
      ) : (
        <p className="muted">Loading notes…</p>
      )}

      <KeyTerms lessonId={lesson.id} />

      <section className="quiz-panel">
        <h2>Check yourself</h2>
        {questions === null ? (
          <p className="muted">No quiz for this lesson yet.</p>
        ) : showQuiz ? (
          <Quiz lessonId={lesson.id} questions={questions} />
        ) : (
          <>
            <p>
              {questions.length} questions. Score 80% or better and the lesson is marked done.
              {best && ` Your best so far: ${best.score}/${best.outOf}.`}
            </p>
            <button onClick={() => setShowQuiz(true)}>{best ? 'Try again' : 'Start the quiz'}</button>
          </>
        )}
      </section>

      {data && Object.keys(data.files).length > 0 && (
        <p className="source-note">
          Every snippet above is a traced extract of a runnable example, and every output was
          captured from running it — regenerated on each build, so the site can never show
          output the code does not produce. Run them yourself:{' '}
          {data.files.python && (
            <>
              <code>python3 examples/python/{data.files.python.replace('examples/python/', '')}</code>
            </>
          )}
          {data.files.python && data.files.ts && ' · '}
          {data.files.ts && (
            <>
              <code>node examples/ts/{data.files.ts.replace('examples/ts/', '')}</code>
            </>
          )}
        </p>
      )}

      <nav className="pager">
        {previous ? (
          <Link to={`/lesson/${previous.id}`}>
            ← {previous.id} {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`/lesson/${next.id}`}>
            {next.id} {next.title} →
          </Link>
        )}
      </nav>
    </article>
  );
}
