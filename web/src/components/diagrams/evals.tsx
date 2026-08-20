/**
 * Diagrams for Module 8 - Evaluation & quality.
 */
import { Arrow, Box, C, Defs, Figure, Txt } from './primitives';

/** The eval loop: offline gate + online watch feeding the golden set. */
export function EvalLoop() {
  const id = 'eval-loop';
  return (
    <Figure
      title="The eval loop closes offline and online"
      caption="Offline: a change is gated against the golden set before it ships. Online: production is watched, and every miss and incident becomes a new golden-set case. The set is the memory that stops the same bug shipping twice."
      viewBox="0 0 640 250"
      maxWidth={680}
    >
      <Defs id={id} />
      <Box x={30} y={30} w={120} h={44} label="change" sub="prompt · model · index" />
      <Arrow id={id} x1={152} y1={52} x2={190} y2={52} />
      <Box x={192} y={30} w={120} h={44} label="offline eval" sub="golden set + scorers" fill={C.soft} stroke={C.accent} bold />
      <Arrow id={id} x1={314} y1={52} x2={352} y2={52} />
      <Box x={354} y={30} w={120} h={44} label="gate" sub="pass → ship" stroke={C.correct} />
      <Arrow id={id} x1={476} y1={52} x2={514} y2={52} />
      <Box x={516} y={30} w={100} h={44} label="production" />
      <Box x={516} y={140} w={100} h={44} label="online eval" sub="A/B · canary · feedback" fill={C.soft} stroke={C.accent} bold />
      <path d="M 566 74 L 566 138" fill="none" stroke={C.muted} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Box x={192} y={140} w={200} h={44} label="golden set" sub="every miss + incident becomes a case" />
      <path d="M 514 162 L 396 162" fill="none" stroke={C.accent} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <path d="M 252 138 L 252 76" fill="none" stroke={C.accent} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={430} y={156} size={10} color={C.accent}>failures feed back</Txt>
      <Txt x={150} y={110} size={10} color={C.accent}>grows the set</Txt>
      <Txt x={320} y={215} size={10.5}>"it looks good" is not evidence; the loop turns judgement into a number you can defend</Txt>
    </Figure>
  );
}

/** Golden set lifecycle: traffic -> sample -> label -> version. */
export function GoldenLifecycle() {
  const id = 'golden-lifecycle';
  return (
    <Figure
      title="A golden set is sampled, labelled and versioned like code"
      caption="Sample from real traffic, stratified with a floor so rare-but-critical cases survive; label with checkable expectations and provenance; freeze with a content hash. Numbers from different versions are different numbers."
      viewBox="0 0 640 200"
      maxWidth={680}
    >
      <Defs id={id} />
      <Box x={20} y={70} w={120} h={50} label="production traffic" sub="what users ask" />
      <Arrow id={id} x1={142} y1={95} x2={178} y2={95} />
      <Box x={180} y={70} w={120} h={50} label="stratified sample" sub="mirror mix + floor rare" fill={C.soft} stroke={C.accent} bold />
      <Arrow id={id} x1={302} y1={95} x2={338} y2={95} />
      <Box x={340} y={70} w={120} h={50} label="labelled cases" sub="expectation + provenance" />
      <Arrow id={id} x1={462} y1={95} x2={498} y2={95} />
      <Box x={500} y={70} w={120} h={50} label="frozen set" sub="version + hash" stroke={C.correct} />
      <Txt x={240} y={150} size={10} color={C.wrong}>frequency is not risk: floor the security slice, or it vanishes</Txt>
      <Txt x={400} y={168} size={10} color={C.accent}>every incident and eval miss adds a case (8.4)</Txt>
    </Figure>
  );
}

/** The scorer ladder. */
export function ScorerLadder() {
  const rungs = [
    { name: 'exact', cost: 'free', trust: 'high on labels', use: 'enums, ids, labels — one spelling', color: C.correct },
    { name: 'normalised', cost: 'free', trust: 'high on phrases', use: 'phrases — but it is code with bugs; test it', color: C.correct },
    { name: 'code checks', cost: 'free', trust: 'high on properties', use: 'citations, numbers, length, schema, policy rules', color: C.accent },
    { name: 'LLM-as-judge', cost: '$ / slow', trust: 'needs calibration', use: 'meaning: correctness, grounding, tone', color: C.wrong },
  ];
  return (
    <Figure
      title="Choose the cheapest scorer that honestly measures the expectation"
      caption="Reach down the ladder only when the rung above cannot express what you need. String scorers measure phrasing; code checks measure properties; the judge measures meaning — and must be calibrated against human labels before you believe it."
      viewBox="0 0 640 220"
      maxWidth={680}
    >
      {rungs.map((r, i) => {
        const y = 20 + i * 46;
        return (
          <g key={r.name}>
            <rect x={20} y={y} width={600} height={40} rx={8} fill={C.surface} stroke={r.color} strokeWidth={1.4} />
            <Txt x={34} y={y + 20} size={12} bold color={r.color} anchor="start">{r.name}</Txt>
            <Txt x={150} y={y + 20} size={10.5} anchor="start" color={C.muted}>{r.cost}</Txt>
            <Txt x={230} y={y + 20} size={10.5} anchor="start" color={C.muted}>{r.trust}</Txt>
            <Txt x={370} y={y + 20} size={10.5} anchor="start" color={C.text}>{r.use}</Txt>
          </g>
        );
      })}
      <Txt x={320} y={214} size={10.5} color={C.accent}>cost rises and trustworthiness falls downward — most eval value is in the top three rungs</Txt>
    </Figure>
  );
}

/** Judge biases. */
export function JudgeBias() {
  const cols = [
    { title: 'Position', color: C.wrong, items: ['prefers first (or last)', 'test: swap the order', 'fix: run both ways, agree'] },
    { title: 'Verbosity', color: C.accent, items: ['longer reads as better', 'test: pad a wrong answer', 'fix: length-controlled rubric'] },
    { title: 'Self / style', color: C.muted, items: ['prefers its own phrasings', 'test: cross-model judge', 'fix: diverse judges, spot-check'] },
    { title: 'Sycophancy', color: C.correct, items: ['agrees with the prompt', 'test: assert a false premise', 'fix: neutral rubric, evidence'] },
  ];
  return (
    <Figure
      title="LLM-as-judge is useful and biased — probe every bias"
      caption="A judge is a model, so it inherits every model failing (Module 2). Each known bias has a test you run once and a mitigation you build in. Calibrate against human labels; treat the judge's score as evidence, never proof."
      viewBox="0 0 640 190"
      maxWidth={680}
    >
      {cols.map((g, i) => {
        const x = 10 + i * 158;
        return (
          <g key={g.title}>
            <rect x={x} y={10} width={148} height={170} rx={10} fill={C.surface} stroke={g.color} strokeWidth={1.4} />
            <Txt x={x + 74} y={30} size={11.5} bold color={g.color}>{g.title}</Txt>
            {g.items.map((it, j) => (
              <Txt key={it} x={x + 12} y={58 + j * 34} size={10} anchor="start" color={C.text}>• {it}</Txt>
            ))}
          </g>
        );
      })}
    </Figure>
  );
}

/** Eval-in-CI gate. */
export function EvalGate() {
  const id = 'eval-gate';
  return (
    <Figure
      title="The eval gate: measure rates, compare, block on regression"
      caption="A sampled system needs several runs per case, not one — a single pass measures luck. The gate compares rates against a pinned baseline with thresholds written down in peacetime, and blocks the merge when a behaviour regresses, even if the total holds."
      viewBox="0 0 640 220"
      maxWidth={680}
    >
      <Defs id={id} />
      <Box x={20} y={90} w={110} h={44} label="PR" sub="prompt change" />
      <Arrow id={id} x1={132} y1={112} x2={168} y2={112} />
      <Box x={170} y={90} w={120} h={44} label="run x N" sub="each case, N times" fill={C.soft} stroke={C.accent} bold />
      <Arrow id={id} x1={292} y1={112} x2={328} y2={112} />
      <Box x={330} y={90} w={120} h={44} label="rates" sub="per case + overall" />
      <Arrow id={id} x1={452} y1={112} x2={488} y2={112} />
      <Box x={490} y={64} w={130} h={40} label="PASS → merge" stroke={C.correct} />
      <Box x={490} y={116} w={130} h={40} label="FAIL → blocked" stroke={C.wrong} />
      <path d="M 450 104 L 488 84" fill="none" stroke={C.correct} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <path d="M 450 120 L 488 136" fill="none" stroke={C.wrong} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={230} y={165} size={10}>thresholds: overall floor · max drop vs baseline · per-slice minimums · per-case no-collapse</Txt>
      <Txt x={230} y={185} size={10} color={C.wrong}>a case at [+-+] is flaky, not a rerun-until-green ticket (2.7)</Txt>
      <Txt x={230} y={205} size={10} color={C.accent}>runs on every change to prompt, model, index, scorer or the set itself</Txt>
    </Figure>
  );
}

/** Rollout ladder for online eval. */
export function RolloutLadder() {
  const id = 'rollout-ladder';
  const steps = [
    { label: 'offline gate', sub: 'golden set', frac: '0% traffic', color: C.accent },
    { label: 'shadow', sub: 'run, do not serve; compare', frac: '0% served', color: C.accent },
    { label: 'canary', sub: 'small slice, watch metrics', frac: '1–5%', color: C.muted },
    { label: 'A/B', sub: 'measured against control', frac: '50%', color: C.muted },
    { label: 'full', sub: 'with rollback ready', frac: '100%', color: C.correct },
  ];
  return (
    <Figure
      title="Online evaluation is a ladder, not a launch"
      caption="Offline evals bound the risk before any user is exposed; each rung above increases exposure only as evidence accumulates. Shadow catches what the golden set missed with zero user impact; canary and A/B measure on real traffic with a rollback one config change away."
      viewBox="0 0 640 210"
      maxWidth={680}
    >
      <Defs id={id} />
      {steps.map((s, i) => {
        const y = 20 + i * 36;
        return (
          <g key={s.label}>
            <rect x={40 + i * 20} y={y} width={360} height={28} rx={6} fill={C.surface} stroke={s.color} strokeWidth={1.4} />
            <Txt x={54 + i * 20} y={y + 15} size={11} bold color={s.color} anchor="start">{s.label}</Txt>
            <Txt x={250 + i * 20} y={y + 15} size={9.5} anchor="start" color={C.muted}>{s.sub}</Txt>
            <Txt x={610} y={y + 15} size={10} anchor="end" color={C.text}>{s.frac}</Txt>
          </g>
        );
      })}
      <Txt x={320} y={200} size={10.5} color={C.accent}>each rung is entered on evidence and exited on a metric; rollback is always one step down</Txt>
    </Figure>
  );
}
