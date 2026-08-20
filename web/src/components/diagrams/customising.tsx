/**
 * Diagrams for Module 10 - Customising models: when to fine-tune, LoRA, distillation,
 * quantisation, and embedding domain adaptation.
 */
import { Arrow, Box, C, Defs, Figure, Txt } from './primitives';

/** 10.1 - the decision: retrieve for facts, prompt first, fine-tune only for behaviour + data. */
export function FinetuneDecision() {
  const id = 'finetune-decision';
  return (
    <Figure
      title="When to fine-tune - and when not"
      caption="Fine-tuning is the last resort, not the first. Facts belong in retrieval; most behaviour changes are a prompt away. Fine-tune only when you need a consistent behaviour AND you have the labelled data to teach it - otherwise you have paid to bake in something a prompt could have done."
      viewBox="0 0 660 300"
      maxWidth={720}
    >
      <Defs id={id} />
      <Box x={250} y={12} w={160} h={40} label="what do you need to change?" fill={C.soft} stroke={C.accent} bold />
      {/* facts branch */}
      <Arrow id={id} x1={300} y1={52} x2={150} y2={92} />
      <Txt x={205} y={68} size={10} color={C.muted}>new FACTS / knowledge</Txt>
      <Box x={70} y={92} w={160} h={44} label="Retrieve (RAG)" sub="6.1 - not fine-tuning" fill={C.correctSoft} stroke={C.correct} />
      {/* behaviour branch */}
      <Arrow id={id} x1={360} y1={52} x2={470} y2={92} />
      <Txt x={445} y={68} size={10} color={C.muted}>BEHAVIOUR / format / tone</Txt>
      <Box x={400} y={92} w={180} h={44} label="a good prompt enough?" sub="roles, few-shot (M4)" />
      <Arrow id={id} x1={430} y1={136} x2={300} y2={176} />
      <Txt x={330} y={158} size={10} color={C.correct}>yes</Txt>
      <Box x={190} y={176} w={170} h={44} label="Prompt / few-shot" sub="cheapest, reversible" fill={C.correctSoft} stroke={C.correct} />
      <Arrow id={id} x1={520} y1={136} x2={520} y2={176} />
      <Txt x={545} y={158} size={10} color={C.wrong}>no</Txt>
      <Box x={430} y={176} w={190} h={44} label="have labelled data + volume?" />
      <Arrow id={id} x1={480} y1={220} x2={430} y2={252} />
      <Txt x={415} y={240} size={10} color={C.correct}>yes</Txt>
      <Box x={300} y={252} w={150} h={40} label="Fine-tune / LoRA" sub="10.2" fill={C.soft} stroke={C.accent} bold />
      <Arrow id={id} x1={560} y1={220} x2={560} y2={252} />
      <Txt x={585} y={240} size={10} color={C.wrong}>no</Txt>
      <Box x={470} y={252} w={170} h={40} label="collect data first" sub="or stay prompted" stroke={C.wrong} />
    </Figure>
  );
}

/** 10.2 - LoRA: frozen base W0 plus a tiny low-rank adapter B@A trained instead. */
export function LoraAdapter() {
  const id = 'lora-adapter';
  return (
    <Figure
      title="LoRA: freeze the base, train a low-rank adapter"
      caption="Full fine-tuning updates every weight in W0. LoRA freezes W0 and learns a small update ΔW = B·A of rank r, so the trainable parameters drop from d×d to r×(d+d) - a tiny, swappable adapter. The base is untouched, so many adapters can share one copy of it."
      viewBox="0 0 620 260"
      maxWidth={680}
    >
      <Defs id={id} />
      {/* frozen base */}
      <rect x={40} y={40} width={140} height={140} rx={8} fill={C.surface} stroke={C.border} strokeWidth={1.4} />
      <Txt x={110} y={30} size={11.5} bold color={C.text}>W₀ (frozen)</Txt>
      <Txt x={110} y={110} size={12} mono color={C.muted}>d × d</Txt>
      <Txt x={110} y={128} size={10} color={C.muted}>🔒 not trained</Txt>
      {/* plus */}
      <Txt x={210} y={110} size={24} color={C.accent}>+</Txt>
      {/* adapter B and A */}
      <rect x={250} y={40} width={44} height={140} rx={6} fill={C.soft} stroke={C.accent} strokeWidth={1.6} />
      <Txt x={272} y={110} size={12} mono bold color={C.accent}>B</Txt>
      <Txt x={272} y={196} size={9.5} color={C.muted}>d × r</Txt>
      <Txt x={312} y={110} size={20} color={C.accent}>·</Txt>
      <rect x={326} y={95} width={140} height={30} rx={6} fill={C.soft} stroke={C.accent} strokeWidth={1.6} />
      <Txt x={396} y={110} size={12} mono bold color={C.accent}>A</Txt>
      <Txt x={396} y={140} size={9.5} color={C.muted}>r × d</Txt>
      {/* equals effective */}
      <Arrow id={id} x1={476} y1={110} x2={508} y2={110} color={C.accent} />
      <Box x={512} y={80} w={92} h={60} label="W₀ + B·A" sub="effective" fill={C.soft} stroke={C.accent} bold mono />
      {/* param comparison */}
      <Txt x={310} y={224} size={11} anchor="middle" color={C.text}>trainable: only B and A — r·(d+d), a small fraction of d²</Txt>
      <Txt x={310} y={244} size={10} anchor="middle" color={C.muted}>rank r ≈ 8 · a 4096×4096 layer: 16.8M → 65K trainable (256× fewer)</Txt>
    </Figure>
  );
}

/** 10.3 - distillation: a big teacher labels data, a small student learns to imitate it. */
export function TeacherStudent() {
  const id = 'teacher-student';
  return (
    <Figure
      title="Distillation: teacher labels, student imitates"
      caption="Run the expensive teacher once to label a pile of your data, then train a small, cheap student to reproduce those labels. The student matches the teacher on that one task at a fraction of the cost and latency - so it can serve every production request while the teacher's run was one-time."
      viewBox="0 0 640 240"
      maxWidth={700}
    >
      <Defs id={id} />
      <Box x={30} y={80} w={130} h={70} label="Teacher" sub="large · expensive" fill={C.surface} stroke={C.border} bold />
      <Txt x={95} y={166} size={9.5} color={C.muted}>run ONCE</Txt>
      <Arrow id={id} x1={162} y1={115} x2={210} y2={115} />
      <Box x={212} y={85} w={120} h={60} label="labelled data" sub="teacher's outputs" />
      <Arrow id={id} x1={334} y1={115} x2={382} y2={115} />
      <Txt x={358} y={104} size={9.5} color={C.accent}>train on</Txt>
      <Box x={384} y={80} w={130} h={70} label="Student" sub="tiny · cheap" fill={C.soft} stroke={C.accent} bold />
      <Arrow id={id} x1={516} y1={115} x2={560} y2={115} color={C.correct} />
      <Box x={520} y={30} w={110} h={40} label="production" sub="every request" fill={C.correctSoft} stroke={C.correct} />
      <path d="M 449 80 L 449 72 L 575 72 L 575 70" fill="none" stroke={C.correct} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={320} y={205} size={10.5} anchor="middle" color={C.text}>agreement measured on a HELD-OUT set — the student is only as good as it matches the teacher there</Txt>
    </Figure>
  );
}

/** 10.4 - quantisation: memory shrinks by precision, quality holds until very low bits. */
export function QuantisationTradeoff() {
  const id = 'quantisation-tradeoff';
  const rows = [
    { name: 'fp32', gb: 32, q: 100, note: 'reference' },
    { name: 'fp16', gb: 16, q: 100, note: 'server default' },
    { name: 'int8', gb: 8, q: 98, note: 'tiny loss' },
    { name: 'int4', gb: 4, q: 94, note: 'fits one GPU' },
  ];
  const x0 = 120;
  const scale = 12; // px per GB
  return (
    <Figure
      title="Quantisation: memory versus quality"
      caption="Fewer bits per weight means less memory, at a quality cost that stays small until you go very low. int8 roughly halves memory for a negligible drop; int4 quarters it for a modest one, which is what fits an 8B model on a single consumer GPU. The bars are the weights of an 8B model."
      viewBox="0 0 620 250"
      maxWidth={680}
    >
      <Defs id={id} />
      {rows.map((r, i) => {
        const y = 30 + i * 46;
        return (
          <g key={r.name}>
            <Txt x={x0 - 12} y={y + 14} size={12} mono anchor="end" color={C.text}>{r.name}</Txt>
            <rect x={x0} y={y} width={r.gb * scale} height={28} rx={4} fill={C.soft} stroke={C.accent} strokeWidth={1.3} />
            <Txt x={x0 + r.gb * scale + 8} y={y + 14} size={11} anchor="start" color={C.muted}>{r.gb} GB · {r.note}</Txt>
            <Txt x={x0 + r.gb * scale - 8} y={y + 14} size={10} anchor="end" color={C.accent}>quality ~{r.q}%</Txt>
          </g>
        );
      })}
      <line x1={x0} y1={22} x2={x0} y2={214} stroke={C.border} />
      <Txt x={330} y={232} size={10.5} anchor="middle" color={C.muted}>memory ∝ bytes-per-weight; quality falls slowly, then faster below 4-bit</Txt>
    </Figure>
  );
}

/** 10.5 - embedding adaptation: recall@1 and MRR rise on a held-out set after adapting. */
export function EmbeddingAdaptation() {
  const id = 'embedding-adaptation';
  const bar = (x: number, label: string, before: number, after: number) => {
    const base = 190;
    const h = 120;
    return (
      <g key={label}>
        <rect x={x} y={base - before * h} width={38} height={before * h} rx={3} fill={C.surface} stroke={C.border} strokeWidth={1.3} />
        <rect x={x + 46} y={base - after * h} width={38} height={after * h} rx={3} fill={C.soft} stroke={C.accent} strokeWidth={1.4} />
        <Txt x={x + 42} y={base + 16} size={11} color={C.text}>{label}</Txt>
        <Txt x={x + 19} y={base - before * h - 10} size={9.5} color={C.muted}>before</Txt>
        <Txt x={x + 65} y={base - after * h - 10} size={9.5} color={C.accent}>after</Txt>
      </g>
    );
  };
  return (
    <Figure
      title="Domain adaptation: the held-out retrieval gain"
      caption="A general embedding model misroutes queries whose wording differs from the passages. Adapting on a handful of (query, passage) pairs - here, pulling each passage toward the queries that should hit it - lifts held-out recall@1 and MRR. The gain is real but bounded: it aligns a domain, it does not fix a wrong base model."
      viewBox="0 0 520 240"
      maxWidth={560}
    >
      <Defs id={id} />
      <line x1={70} y1={190} x2={470} y2={190} stroke={C.border} />
      {bar(120, 'recall@1', 5 / 8, 7 / 8)}
      {bar(300, 'MRR', 0.813, 0.938)}
      <Txt x={270} y={222} size={10.5} anchor="middle" color={C.muted}>measured on a HELD-OUT eval set (6.7) — the only number that counts</Txt>
      <Txt x={270} y={18} size={11} anchor="middle" bold color={C.text}>5/8 → 7/8 recall@1 · MRR 0.81 → 0.94, from 16 pairs</Txt>
    </Figure>
  );
}
