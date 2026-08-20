/**
 * Diagrams for Module 9 - Production: architecture, security, operations.
 */
import { Arrow, Box, C, Defs, Figure, Txt } from './primitives';

/** The reference architecture: every box a lesson. */
export function ReferenceArchitecture() {
  const id = 'reference-architecture';
  return (
    <Figure
      title="The reference architecture for an LLM feature"
      caption="Almost every production LLM system is this shape. The model is one box; the value and the safety are in what surrounds it — the gateway, retrieval, tools, guardrails, evals and tracing. Each box is a lesson in this course."
      viewBox="0 0 660 320"
      maxWidth={700}
    >
      <Defs id={id} />
      <Box x={20} y={140} w={90} h={44} label="client" sub="user / job" />
      <Arrow id={id} x1={112} y1={162} x2={138} y2={162} />
      <Box x={140} y={132} w={110} h={60} label="gateway" sub="auth · quota · route" fill={C.soft} stroke={C.accent} bold />
      <Txt x={195} y={210} size={9.5}>keys · rate limit (9.2)</Txt>
      <Arrow id={id} x1={252} y1={162} x2={278} y2={162} />
      <Box x={280} y={132} w={110} h={60} label="orchestration" sub="workflow / agent" fill={C.soft} stroke={C.accent} bold />
      {/* around orchestration */}
      <Box x={280} y={40} w={110} h={40} label="retriever" sub="RAG (M6)" />
      <path d="M 335 132 L 335 82" fill="none" stroke={C.muted} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Box x={280} y={232} w={110} h={40} label="tools" sub="least privilege (7.3)" />
      <path d="M 335 192 L 335 230" fill="none" stroke={C.muted} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Arrow id={id} x1={392} y1={162} x2={418} y2={162} />
      <Box x={420} y={132} w={110} h={60} label="guardrails" sub="in / out (9.7)" stroke={C.wrong} bold />
      <Arrow id={id} x1={532} y1={162} x2={558} y2={162} />
      <Box x={560} y={140} w={90} h={44} label="model" sub="via gateway" />
      {/* cross-cutting */}
      <rect x={140} y={286} width={390} height={26} rx={6} fill="none" stroke={C.accent} strokeDasharray="5 4" />
      <Txt x={335} y={299} size={10.5} color={C.accent}>tracing · evals · cost — across every box (5.7, 8, 9.4)</Txt>
      <Txt x={335} y={24} size={11} bold color={C.text}>the model is one box; the system is the other twelve</Txt>
    </Figure>
  );
}

/** Gateway sequence: routing, rate-limit, fallback. */
export function GatewaySequence() {
  const id = 'gateway-sequence';
  const lanes = [{ x: 80, l: 'service' }, { x: 260, l: 'gateway' }, { x: 470, l: 'model(s)' }];
  const msg = (y: number, a: number, b: number, t: string, c = C.muted) => (
    <g key={y + t}>
      <line x1={lanes[a].x} y1={y} x2={lanes[b].x} y2={y} stroke={c} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={(lanes[a].x + lanes[b].x) / 2} y={y - 8} size={10} color={c}>{t}</Txt>
    </g>
  );
  return (
    <Figure
      title="One request through the gateway"
      caption="The gateway is the only thing that holds keys and the only place quotas, routing and fallback live. Application code sends one internal request and never sees a vendor credential."
      viewBox="0 0 560 240"
      maxWidth={620}
    >
      <Defs id={id} />
      {lanes.map((l) => (
        <g key={l.l}>
          <Box x={l.x - 55} y={10} w={110} h={30} label={l.l} fill={l.l === 'gateway' ? C.soft : C.surface} stroke={l.l === 'gateway' ? C.accent : C.border} />
          <line x1={l.x} y1={42} x2={l.x} y2={230} stroke={C.border} strokeDasharray="3 4" />
        </g>
      ))}
      {msg(70, 0, 1, 'complete(task, tokens)')}
      <Txt x={260} y={92} size={10} color={C.accent}>check tenant quota · pick model</Txt>
      {msg(110, 1, 2, 'POST (with the key)')}
      {msg(140, 2, 1, '503 model down', C.wrong)}
      <Txt x={260} y={162} size={10} color={C.accent}>fail over to backup</Txt>
      {msg(180, 1, 2, 'POST backup')}
      {msg(206, 2, 1, '200 + usage', C.correct)}
      {msg(222, 1, 0, 'answer + trace', C.correct)}
    </Figure>
  );
}

/** Latency waterfall: TTFT vs total, streaming. */
export function LatencyWaterfall() {
  const id = 'latency-waterfall';
  return (
    <Figure
      title="Where a response time goes"
      caption="Total = time-to-first-token (queue + prompt processing) plus generation (output tokens ÷ rate). Streaming hands the user the first token as soon as TTFT ends, so they feel TTFT, not total. Report the p95 of each, not the mean."
      viewBox="0 0 640 200"
      maxWidth={680}
    >
      <Defs id={id} />
      <Txt x={16} y={40} size={10.5} anchor="start" color={C.text}>queue</Txt>
      <rect x={90} y={30} width={40} height={20} rx={3} fill={C.muted} opacity={0.6} />
      <Txt x={140} y={40} size={10.5} anchor="start" color={C.text}>prompt (∝ input)</Txt>
      <rect x={250} y={30} width={70} height={20} rx={3} fill={C.accent} opacity={0.5} />
      <line x1={320} y1={22} x2={320} y2={58} stroke={C.accent} />
      <Txt x={320} y={70} size={10} color={C.accent}>TTFT — the number streaming shows the user</Txt>
      <Txt x={16} y={110} size={10.5} anchor="start" color={C.text}>generation</Txt>
      {Array.from({ length: 20 }, (_, i) => (
        <rect key={i} x={324 + i * 14} y={100} width={11} height={20} rx={2} fill={C.correct} opacity={0.45 + (i % 3) * 0.18} />
      ))}
      <line x1={608} y1={92} x2={608} y2={128} stroke={C.muted} />
      <Txt x={470} y={140} size={10}>total — output tokens ÷ tokens-per-second</Txt>
      <Txt x={320} y={175} size={10.5} color={C.accent}>levers: stream (feel), shorten output (total), shrink prompt (TTFT), route small (both)</Txt>
    </Figure>
  );
}

/** Cost breakdown / levers. */
export function CostBreakdown() {
  const id = 'cost-breakdown';
  const bars = [
    { label: 'baseline', frac: 1.0, note: 'all on the large model' },
    { label: 'route', frac: 0.66, note: 'cheap work → small model' },
    { label: '+ cache', frac: 0.50, note: 'stable prefix cached' },
    { label: '+ batch', frac: 0.47, note: 'unwatched work batched' },
    { label: '+ distil', frac: 0.45, note: 'hot paths → fine-tuned small' },
  ];
  return (
    <Figure
      title="Four independent levers, each a cut off the top"
      caption="Same product, ~55% less spend. Route first (biggest lever), cache the prefix, batch anything nobody is waiting for, and distil a small model for the highest-volume tasks. Then attribute cost per feature so a regression is a visible bug."
      viewBox="0 0 620 210"
      maxWidth={660}
    >
      <Defs id={id} />
      {bars.map((b, i) => {
        const y = 20 + i * 36;
        return (
          <g key={b.label}>
            <Txt x={14} y={y + 15} size={10.5} anchor="start" color={C.text}>{b.label}</Txt>
            <rect x={100} y={y} width={360 * b.frac} height={22} rx={4} fill={i === 0 ? C.wrong : C.accent} opacity={i === 0 ? 0.7 : 0.85} />
            <Txt x={110 + 360 * b.frac} y={y + 15} size={10} anchor="start">{Math.round(b.frac * 100)}% · {b.note}</Txt>
          </g>
        );
      })}
    </Figure>
  );
}

/** Threat model / OWASP controls. */
export function ThreatModel() {
  const id = 'threat-model';
  const rows = [
    { risk: 'LLM01 injection', ctl: 'fence untrusted input' },
    { risk: 'LLM02 output handling', ctl: 'validate before acting' },
    { risk: 'LLM04 DoS', ctl: 'rate-limit + budgets' },
    { risk: 'LLM06 disclosure', ctl: 'no secrets in context; scope data' },
    { risk: 'LLM07 tools', ctl: 'least privilege; propose-only' },
    { risk: 'LLM08 excessive agency', ctl: 'human gate on actions' },
  ];
  return (
    <Figure
      title="Security is a control per risk, checked in code"
      caption="Each OWASP LLM risk maps to a structural control — a property of the system, not an instruction to the model. Encode the mapping as predicates over your config and run it in CI, so removing a control fails the build."
      viewBox="0 0 640 230"
      maxWidth={680}
    >
      <Defs id={id} />
      <Txt x={30} y={26} size={11} bold color={C.wrong} anchor="start">risk (OWASP LLM Top 10)</Txt>
      <Txt x={340} y={26} size={11} bold color={C.correct} anchor="start">structural control (code, not prompt)</Txt>
      {rows.map((r, i) => {
        const y = 46 + i * 28;
        return (
          <g key={r.risk}>
            <Txt x={30} y={y} size={10.5} anchor="start" color={C.text}>• {r.risk}</Txt>
            <path d="M 300 0 L 320 0" transform={`translate(0 ${y - 4})`} stroke={C.muted} strokeWidth={1.2} markerEnd={`url(#${id}-arrow)`} />
            <Txt x={340} y={y} size={10.5} anchor="start" color={C.text}>{r.ctl}</Txt>
          </g>
        );
      })}
      <Txt x={320} y={218} size={10.5} color={C.accent}>"if the model were malicious, what could it make my system DO?" — bound the answer in code</Txt>
    </Figure>
  );
}

/** Guardrail layers. */
export function GuardrailLayers() {
  const id = 'guardrail-layers';
  return (
    <Figure
      title="Guardrails are layers, in and out"
      caption="Input guards block obvious abuse before you pay for a call; output guards are the last line — a model that was steered still cannot emit a secret, act without approval, or leak PII, because code checks the bytes. A blocked output escalates to a human; it never silently vanishes."
      viewBox="0 0 660 190"
      maxWidth={700}
    >
      <Defs id={id} />
      <Box x={20} y={80} w={80} h={44} label="request" />
      <Arrow id={id} x1={102} y1={102} x2={128} y2={102} />
      <Box x={130} y={72} w={110} h={60} label="input guards" sub="size · injection · PII-ask" stroke={C.wrong} bold />
      <Arrow id={id} x1={242} y1={102} x2={268} y2={102} />
      <Box x={270} y={80} w={90} h={44} label="model" fill={C.soft} bold />
      <Arrow id={id} x1={362} y1={102} x2={388} y2={102} />
      <Box x={390} y={72} w={120} h={60} label="output guards" sub="secret · action · PII" stroke={C.wrong} bold />
      <Arrow id={id} x1={512} y1={102} x2={538} y2={102} />
      <Box x={540} y={80} w={100} h={44} label="serve / act" sub="only if all pass" stroke={C.correct} />
      <path d="M 450 132 L 450 165" fill="none" stroke={C.wrong} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={450} y={180} size={10} color={C.wrong}>blocked → escalate to a human</Txt>
      <Txt x={185} y={165} size={10} color={C.wrong}>blocked → 4xx</Txt>
    </Figure>
  );
}
