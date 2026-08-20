/**
 * Diagrams for Module 11 - AI in the software lifecycle: the review loop, the one-page design
 * doc, ownership (RACI), and framework abstraction layers.
 */
import { Arrow, Box, C, Defs, Figure, Txt } from './primitives';

/** 11.1 - the review loop: spec, generate, review, integrate - with what never to delegate. */
export function ReviewLoop() {
  const id = 'review-loop';
  return (
    <Figure
      title="The review loop for AI-generated code"
      caption="A coding assistant amplifies a clear spec into a draft; the engineer reviews, and either integrates it or refines the spec and goes round again. The loop is fast, but the accountability never moves: you own the spec, the review, and everything the assistant must never decide alone."
      viewBox="0 0 640 300"
      maxWidth={700}
    >
      <Defs id={id} />
      <Box x={40} y={40} w={130} h={54} label="spec / intent" sub="you write this" fill={C.soft} stroke={C.accent} bold />
      <Arrow id={id} x1={172} y1={67} x2={230} y2={67} />
      <Box x={232} y={40} w={140} h={54} label="AI generates" sub="a draft, fast" />
      <Arrow id={id} x1={374} y1={67} x2={432} y2={67} />
      <Box x={434} y={40} w={150} h={54} label="you review" sub="read every line" fill={C.soft} stroke={C.accent} bold />
      {/* accept down */}
      <Arrow id={id} x1={509} y1={94} x2={509} y2={140} color={C.correct} />
      <Txt x={534} y={117} size={10} color={C.correct}>accept</Txt>
      <Box x={434} y={140} w={150} h={48} label="integrate + test" sub="you are accountable" fill={C.correctSoft} stroke={C.correct} />
      {/* refine back */}
      <path d="M 434 80 C 300 130, 300 130, 170 80" fill="none" stroke={C.muted} strokeWidth={1.4} strokeDasharray="5 4" markerEnd={`url(#${id}-arrow)`} />
      <Txt x={300} y={126} size={10} color={C.muted}>refine the spec, go again</Txt>
      {/* never delegate */}
      <rect x={40} y={210} width={544} height={64} rx={8} fill="none" stroke={C.wrong} strokeDasharray="5 4" />
      <Txt x={312} y={228} size={11} bold color={C.wrong}>never delegate</Txt>
      <Txt x={312} y={248} size={10.5} color={C.text}>architecture &amp; security decisions · what &quot;correct&quot; means · the final review</Txt>
      <Txt x={312} y={264} size={10.5} color={C.text}>secrets &amp; access · anything you could not debug at 3am if it broke</Txt>
    </Figure>
  );
}

/** 11.2 - the one-page design doc skeleton: the sections, in order. */
export function DesignDocSkeleton() {
  const id = 'design-doc-skeleton';
  const rows = [
    ['1 · Problem & user', 'the job to be done, and who has it — not the solution'],
    ['2 · Why AI (or not)', 'what makes this probabilistic; the deterministic alternative'],
    ['3 · Approach', 'prompt / RAG / fine-tune / classic ML — and why (6.1, 10.1)'],
    ['4 · Eval plan', 'golden set, metrics, the bar to ship — decided up front (8.4)'],
    ['5 · Failure modes & guardrails', 'what goes wrong, and the checks in code (9.5, 9.7)'],
    ['6 · Cost & latency budget', 'tokens × traffic; the p95 target (5.5, 9.3)'],
    ['7 · Rollout & ownership', 'shadow → canary → on; who owns prompts, evals, cost'],
  ];
  return (
    <Figure
      title="The one-page AI feature design doc"
      caption="Seven sections, in order, on one page. The eval plan and the failure modes are decided before a line ships, not after — that is what separates a designed feature from a demo. If you cannot fill a row, that is the risk to resolve first."
      viewBox="0 0 620 320"
      maxWidth={660}
    >
      <Defs id={id} />
      {rows.map((r, i) => {
        const y = 20 + i * 40;
        const star = i === 3 || i === 4;
        return (
          <g key={r[0]}>
            <rect x={30} y={y} width={560} height={32} rx={6} fill={star ? C.soft : C.surface} stroke={star ? C.accent : C.border} strokeWidth={1.3} />
            <Txt x={44} y={y + 16} size={11.5} anchor="start" bold color={C.text}>{r[0]}</Txt>
            <Txt x={250} y={y + 16} size={10.5} anchor="start" color={C.muted}>{r[1]}</Txt>
          </g>
        );
      })}
    </Figure>
  );
}

/** 11.3 - RACI: who owns each cross-cutting concern of an AI system. */
export function RaciMatrix() {
  const id = 'raci';
  const cols = ['Eng', 'DS/ML', 'PM', 'SRE'];
  const rows: [string, string[]][] = [
    ['Prompts', ['A', 'C', 'C', 'I']],
    ['Evals & golden set', ['C', 'A', 'C', 'I']],
    ['Cost budget', ['C', 'C', 'A', 'C']],
    ['Guardrails & safety', ['A', 'C', 'I', 'C']],
    ['Serving & SLOs', ['C', 'I', 'I', 'A']],
  ];
  const x0 = 210;
  const cw = 90;
  const colour = (v: string) => (v === 'A' ? C.accent : v === 'R' ? C.correct : C.muted);
  return (
    <Figure
      title="Who owns what: a RACI for an AI system"
      caption="The cross-cutting concerns — prompts, evals, cost, guardrails, serving — each need one Accountable owner (A), or they fall between roles. AI work is a team sport; the failure mode is 'everyone and no one owns the evals'."
      viewBox="0 0 620 250"
      maxWidth={660}
    >
      <Defs id={id} />
      {cols.map((c, j) => (
        <Txt key={c} x={x0 + j * cw + cw / 2} y={30} size={11.5} bold color={C.text}>{c}</Txt>
      ))}
      {rows.map((r, i) => {
        const y = 56 + i * 34;
        return (
          <g key={r[0]}>
            <Txt x={x0 - 14} y={y + 15} size={11} anchor="end" color={C.text}>{r[0]}</Txt>
            {r[1].map((v, j) => (
              <g key={j}>
                <rect x={x0 + j * cw + 12} y={y} width={cw - 24} height={30} rx={5} fill={v === 'A' ? C.soft : C.surface} stroke={v === 'A' ? C.accent : C.border} strokeWidth={1.3} />
                <Txt x={x0 + j * cw + cw / 2} y={y + 16} size={12} bold color={colour(v)}>{v}</Txt>
              </g>
            ))}
          </g>
        );
      })}
      <Txt x={310} y={232} size={10} color={C.muted}>A = accountable (one per row) · C = consulted · I = informed</Txt>
    </Figure>
  );
}

/** 11.4 - abstraction layers: your logic on top, the model at the bottom, framework swappable. */
export function AbstractionLayers() {
  const id = 'abstraction-layers';
  const layers = [
    ['your domain logic', 'the part that is your product — keep it framework-free', C.correctSoft, C.correct],
    ['framework (optional)', 'templating · retry/parse · orchestration · memory · tracing', C.soft, C.accent],
    ['your adapter seam', 'the llm module — one place providers and libs are swapped', C.soft, C.accent],
    ['provider API', 'HTTP, auth, rate limits (Module 5)', C.surface, C.border],
    ['the model', 'weights, hosted or local (Module 10)', C.surface, C.border],
  ];
  return (
    <Figure
      title="Layers of abstraction — and where to cut"
      caption="A framework is one swappable layer in the middle, not the shape of your system. Keep your domain logic above it and your own adapter seam below it, and the framework becomes a dependency you can delete in a day rather than a rewrite."
      viewBox="0 0 600 300"
      maxWidth={640}
    >
      <Defs id={id} />
      {layers.map((l, i) => {
        const y = 20 + i * 54;
        const optional = i === 1;
        return (
          <g key={l[0]}>
            <rect x={70} y={y} width={460} height={42} rx={7} fill={l[2]} stroke={l[3]} strokeWidth={optional ? 1.6 : 1.3} strokeDasharray={optional ? '6 4' : undefined} />
            <Txt x={90} y={y + 21} size={12} anchor="start" bold color={C.text}>{l[0]}</Txt>
            <Txt x={520} y={y + 21} size={10} anchor="end" color={C.muted}>{l[1]}</Txt>
            {i < layers.length - 1 && <Arrow id={id} x1={300} y1={y + 42} x2={300} y2={y + 54} />}
          </g>
        );
      })}
    </Figure>
  );
}
