import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { PluggableList } from 'unified';
import { CAPSTONES, loadCapstone } from '../lib/capstones';
import { useSyllabus } from '../lib/useSyllabus';
import { MarkdownLink } from '../components/MarkdownLink';
import { Diagram } from '../components/Diagram';
import { CodeBlock } from '../components/CodeBlock';
import { rehypeLessonRefs } from '../lib/rehypeLessonRefs';

/** /capstones - index; /capstones/:id - one guide. */
export function Capstones() {
  const { id } = useParams();
  return id ? <CapstonePage id={id} /> : <CapstonesIndex />;
}

function CapstonesIndex() {
  return (
    <>
      <h1>Capstones</h1>
      <p className="lede">
        Four end-to-end systems that assemble the modules into whole features — the reference LLM
        feature, a batch document pipeline, a repo-aware coding agent, and a classic-ML model in
        production. Each is a design doc you could build from: the architecture, the pieces (with
        the lessons that build each one), the eval plan, the guardrails, and what to harden next.
      </p>
      <div className="module-grid">
        {CAPSTONES.map((c) => (
          <article className="module-card" key={c.id}>
            <h3><Link to={`/capstones/${c.id}`}>{c.title.replace(/^Capstone — /, '')}</Link></h3>
            <p>{c.summary}</p>
            {c.modules.length > 0 && (
              <p className="muted small">Modules {c.modules.join(', ')}</p>
            )}
          </article>
        ))}
      </div>
    </>
  );
}

// Only two fences appear in a capstone guide: ```diagram <name>, and ordinary code blocks.
function PreBlock(props: React.ComponentProps<'pre'>) {
  const child = props.children as React.ReactElement<{ className?: string; children?: React.ReactNode }> | undefined;
  const className = child?.props?.className ?? '';
  const body = String(child?.props?.children ?? '').trim();
  if (/language-diagram/.test(className)) return <Diagram name={body} />;
  return (
    <CodeBlock source={body}>
      <pre {...props} />
    </CodeBlock>
  );
}

function CapstonePage({ id }: { id: string }) {
  const meta = CAPSTONES.find((c) => c.id === id);
  const syllabus = useSyllabus();
  const [body, setBody] = useState<string | null>(null);

  useEffect(() => {
    setBody(null);
    loadCapstone(id).then(setBody);
    window.scrollTo(0, 0);
  }, [id]);

  const rehypePlugins = useMemo<PluggableList>(
    () => [[rehypeLessonRefs, { ids: syllabus ? syllabus.lessons.map((l) => l.id) : [] }]],
    [syllabus],
  );

  if (!meta) {
    return (
      <>
        <h1>Capstone not found</h1>
        <p className="muted"><Link to="/capstones">Back to the capstones</Link></p>
      </>
    );
  }

  return (
    <article className="lesson">
      <nav className="crumbs"><Link to="/capstones">Capstones</Link> <span>/</span> <span>{meta.title.replace(/^Capstone — /, '')}</span></nav>
      <h1>{meta.title.replace(/^Capstone — /, '')}</h1>
      <p className="summary">{meta.summary}</p>
      {meta.modules.length > 0 && (
        <p className="lesson-meta-line">
          <span className="muted">Draws on modules {meta.modules.join(', ')}</span>
        </p>
      )}
      {body ? (
        <div className="prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={rehypePlugins} components={{ a: MarkdownLink, pre: PreBlock }}>
            {body}
          </ReactMarkdown>
        </div>
      ) : (
        <p className="muted">Loading…</p>
      )}
    </article>
  );
}
