/**
 * Diagrams for Module 5 - Building with LLM APIs.
 */
import { Arrow, Box, C, Defs, Figure, Txt } from './primitives';

/** Request/response with the wrapper's retry + timeout around it. */
export function RequestSequence() {
  const id = 'request-sequence';
  const lanes = [
    { x: 70, label: 'your code' },
    { x: 250, label: 'wrapper', sub: 'timeout · retry · idempotency' },
    { x: 450, label: 'gateway' },
    { x: 610, label: 'model API' },
  ];
  const msg = (y: number, from: number, to: number, label: string, color = C.muted, dashed = false) => (
    <g key={`${y}-${label}`}>
      <line x1={lanes[from].x} y1={y} x2={lanes[to].x} y2={y} stroke={color} strokeWidth={1.4} strokeDasharray={dashed ? '4 3' : undefined} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={(lanes[from].x + lanes[to].x) / 2} y={y - 8} size={10} color={color}>{label}</Txt>
    </g>
  );
  return (
    <Figure
      title="One model call, properly wrapped"
      caption="The wrapper owns the boring, vendor-neutral parts: a timeout on every attempt, retries with backoff only for retryable errors, an idempotency key for any side effect, and the accounting. The gateway (Lesson 9.2) owns keys, quotas and routing."
      viewBox="0 0 680 260"
      maxWidth={700}
    >
      <Defs id={id} />
      {lanes.map((l) => (
        <g key={l.label}>
          <Box x={l.x - 50} y={10} w={100} h={34} label={l.label} sub={l.sub} fill={l.label === 'wrapper' ? C.soft : C.surface} stroke={l.label === 'wrapper' ? C.accent : C.border} />
          <line x1={l.x} y1={46} x2={l.x} y2={250} stroke={C.border} strokeDasharray="3 4" />
        </g>
      ))}
      {msg(80, 0, 1, 'complete(prompt)')}
      {msg(105, 1, 2, 'POST /messages  (attempt 1, timeout 30s)')}
      {msg(130, 2, 3, 'forward')}
      {msg(155, 3, 2, '429 rate limited', C.wrong)}
      {msg(180, 2, 1, '429', C.wrong)}
      <Txt x={250} y={198} size={10} color={C.accent}>retryable → back off 0.5s → attempt 2</Txt>
      {msg(215, 1, 3, 'POST /messages  (attempt 2)')}
      {msg(238, 3, 1, '200 + usage {in, out}', C.correct)}
      {msg(252, 1, 0, 'Completion', C.correct)}
    </Figure>
  );
}

/** Streaming timeline: TTFT vs total, tokens arriving over time. */
export function StreamingTimeline() {
  const id = 'streaming-timeline';
  return (
    <Figure
      title="Streaming changes which latency the user feels"
      caption="Without streaming the user waits for the whole answer. With streaming the first token arrives after the prompt is processed (time to first token), and the rest flow at the model's generation rate. Same total time; a completely different experience."
      viewBox="0 0 640 200"
      maxWidth={680}
    >
      <Defs id={id} />
      <Txt x={20} y={30} size={11} bold color={C.text} anchor="start">no streaming</Txt>
      <rect x={140} y={20} width={420} height={18} rx={4} fill={C.border} />
      <rect x={560} y={16} width={60} height={26} rx={4} fill={C.correct} opacity={0.85} />
      <Txt x={590} y={29} size={10} color="#fff" bold>answer</Txt>
      <Txt x={350} y={29} size={10}>spinner… 4.8 s</Txt>
      <Txt x={20} y={90} size={11} bold color={C.text} anchor="start">streaming</Txt>
      <rect x={140} y={80} width={90} height={18} rx={4} fill={C.border} />
      <Txt x={185} y={89} size={10}>prompt 0.6 s</Txt>
      {Array.from({ length: 26 }, (_, i) => (
        <rect key={i} x={232 + i * 15} y={78} width={12} height={22} rx={2} fill={C.correct} opacity={0.45 + (i % 3) * 0.18} />
      ))}
      <line x1={232} y1={110} x2={232} y2={125} stroke={C.accent} />
      <Txt x={232} y={135} size={10} color={C.accent}>time to first token (TTFT)</Txt>
      <line x1={620} y1={110} x2={620} y2={125} stroke={C.muted} />
      <Txt x={560} y={135} size={10}>last token — same 4.8 s</Txt>
      <Txt x={420} y={160} size={10.5}>tokens per second = the slope; TTFT = the gap — measure both (Lesson 9.3)</Txt>
      <line x1={140} y1={185} x2={620} y2={185} stroke={C.border} />
      <Txt x={140} y={195} size={9} anchor="start">0 s</Txt>
      <Txt x={620} y={195} size={9} anchor="end">5 s</Txt>
    </Figure>
  );
}

/** The tool-call round trip. */
export function ToolRoundTrip() {
  const id = 'tool-round-trip';
  return (
    <Figure
      title="The tool-calling round trip"
      caption="The model never runs anything. It emits a structured request; your code validates and executes it, returns the result as a message, and calls the model again. The loop, the cap and the permissions are all yours."
      viewBox="0 0 640 250"
      maxWidth={680}
    >
      <Defs id={id} />
      <Box x={20} y={100} w={120} h={50} label="your code" sub="owns the loop" fill={C.soft} stroke={C.accent} bold />
      <Box x={260} y={20} w={120} h={44} label="model" sub="proposes" />
      <Box x={260} y={190} w={120} h={44} label="tool" sub="executes" />
      <Box x={500} y={100} w={120} h={50} label="answer" sub="or next call" />
      <path d="M 140 112 L 258 42" fill="none" stroke={C.muted} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={180} y={62} size={10}>1. messages + tool schemas</Txt>
      <path d="M 330 66 L 330 88 L 150 88 L 145 88" fill="none" stroke={C.accent} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={250} y={100} size={10} color={C.accent}>2. tool_calls: get_order({'{'}id{'}'})  stop_reason=tool_use</Txt>
      <path d="M 140 140 L 258 210" fill="none" stroke={C.muted} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={170} y={195} size={10}>3. validate args · least privilege · run</Txt>
      <path d="M 330 188 L 330 165 L 150 165 L 145 165" fill="none" stroke={C.muted} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={250} y={155} size={10}>4. result as data (errors too)</Txt>
      <path d="M 382 42 L 560 42 L 560 98" fill="none" stroke={C.correct} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={470} y={32} size={10} color={C.correct}>5. …repeat until prose · step cap</Txt>
    </Figure>
  );
}

/** Cache hit vs miss on a prefix-stable prompt. */
export function CacheHitMiss() {
  const id = 'cache-hit-miss';
  const bar = (y: number, label: string, segs: [string, number, string, boolean][]) => {
    let x = 150;
    return (
      <g key={label}>
        <Txt x={20} y={y + 13} size={11} bold color={C.text} anchor="start">{label}</Txt>
        {segs.map(([name, w, color, cached]) => {
          const el = (
            <g key={name}>
              <rect x={x} y={y} width={w} height={26} fill={color} opacity={cached ? 0.35 : 0.85} stroke={cached ? color : 'none'} strokeDasharray={cached ? '4 3' : undefined} />
              <Txt x={x + w / 2} y={y + 13} size={10} color={cached ? color : '#fff'} bold>{name}</Txt>
            </g>
          );
          x += w;
          return el;
        })}
      </g>
    );
  };
  return (
    <Figure
      title="Prompt caching: only the unchanged prefix is cheap"
      caption="Dashed = served from cache at a fraction of the input price. A variable part anywhere before the stable parts ends the cacheable prefix at position zero. Same content, different order, very different bill."
      viewBox="0 0 640 180"
      maxWidth={680}
    >
      <Defs id={id} />
      {bar(20, 'cache-friendly', [['system', 110, C.accent, true], ['examples', 140, C.accent, true], ['docs', 150, C.wrong, false], ['user', 60, C.wrong, false]])}
      {bar(70, 'cache-hostile', [['user', 60, C.wrong, false], ['system', 110, C.accent, false], ['examples', 140, C.accent, false], ['docs', 150, C.wrong, false]])}
      <Txt x={20} y={130} size={10.5} anchor="start" color={C.text}>stable first, variable last — and byte-identical: a timestamp in the system prompt kills the cache</Txt>
      <Txt x={20} y={150} size={10.5} anchor="start">nobody waiting? send it to the batch endpoint at a discount instead (Lesson 5.5)</Txt>
    </Figure>
  );
}

/** Model router with budgets. */
export function ModelRouter() {
  const id = 'model-router';
  return (
    <Figure
      title="Budgets and a router in front of the model"
      caption="Per-request caps bound one prompt; per-tenant ledgers bound one customer; the router sends cheap tasks to cheap models. All three are code — rules you can read, test and tune with eval numbers."
      viewBox="0 0 640 220"
      maxWidth={680}
    >
      <Defs id={id} />
      <Box x={10} y={90} w={90} h={44} label="request" />
      <Arrow id={id} x1={102} y1={112} x2={128} y2={112} />
      <Box x={130} y={90} w={110} h={44} label="request cap" sub="tokens in / out" stroke={C.wrong} />
      <Arrow id={id} x1={242} y1={112} x2={268} y2={112} />
      <Box x={270} y={90} w={110} h={44} label="tenant ledger" sub="$/day, degrade" stroke={C.wrong} />
      <Arrow id={id} x1={382} y1={112} x2={408} y2={112} />
      <Box x={410} y={90} w={90} h={44} label="router" sub="by task shape" fill={C.soft} stroke={C.accent} bold />
      <path d="M 502 104 L 540 60" fill="none" stroke={C.muted} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <path d="M 502 120 L 540 164" fill="none" stroke={C.muted} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Box x={545} y={36} w={85} h={40} label="small" sub="classify · extract" />
      <Box x={545} y={150} w={85} h={40} label="large" sub="judge · reason" />
      <Txt x={185} y={150} size={10} color={C.wrong}>reject / truncate</Txt>
      <Txt x={325} y={150} size={10} color={C.wrong}>degrade before refuse</Txt>
      <Txt x={320} y={200} size={10.5} color={C.accent}>measure each route on the golden set before moving a task down a tier</Txt>
    </Figure>
  );
}

/** A trace waterfall for one request. */
export function TraceWaterfall() {
  const rows = [
    { label: 'request tr-7f3a9c', x: 0, w: 600, color: C.border, note: '' },
    { label: 'retrieve', x: 10, w: 60, color: C.muted, note: '48 ms · 6 chunks' },
    { label: 'classify  ticket-classify@3', x: 80, w: 110, color: C.accent, note: '88+2 tok · validated ✓' },
    { label: 'draft-reply  ticket-reply@5', x: 200, w: 330, color: C.accent, note: '91+41 tok · validated ✓ · stop=end_turn' },
    { label: 'validate + persist', x: 540, w: 50, color: C.muted, note: '' },
  ];
  return (
    <Figure
      title="One request as a trace"
      caption="Every model step is a span with the prompt id and hash, model, tokens in/out, cost, stop reason and whether validation passed. Latency per span is the first column in production; validation-pass rate per prompt id is the number you alert on."
      viewBox="0 0 640 200"
      maxWidth={680}
    >
      {rows.map((r, i) => (
        <g key={r.label}>
          <Txt x={12} y={30 + i * 30} size={10.5} anchor="start" color={C.text}>{r.label}</Txt>
          <rect x={20 + r.x * 0.95} y={38 + i * 30} width={r.w * 0.95} height={12} rx={3} fill={r.color} opacity={i === 0 ? 0.6 : 0.85} />
          <Txt x={30 + (r.x + r.w) * 0.95} y={44 + i * 30} size={9.5} anchor="start">{r.note}</Txt>
        </g>
      ))}
      <Txt x={320} y={190} size={10.5} color={C.accent}>redact before it lands: emails, card numbers, names — logs outlive requests</Txt>
    </Figure>
  );
}

/** Modality pipeline: image/doc -> tokens -> same model. */
export function ModalityPipeline() {
  const id = 'modality-pipeline';
  return (
    <Figure
      title="Images go through the same machinery — as (many) tokens"
      caption="A vision model turns the picture into tokens and continues as usual. An image costs far more tokens than the text it contains, so for dense text OCR first and send the text; send the image when layout, charts or photos carry the meaning."
      viewBox="0 0 640 180"
      maxWidth={680}
    >
      <Defs id={id} />
      <Box x={10} y={30} w={110} h={44} label="image / page" sub="PNG, PDF page" />
      <Arrow id={id} x1={122} y1={52} x2={158} y2={52} />
      <Box x={160} y={30} w={120} h={44} label="image tokens" sub="hundreds–thousands" stroke={C.wrong} />
      <Arrow id={id} x1={282} y1={52} x2={318} y2={52} />
      <Box x={10} y={110} w={110} h={44} label="OCR / text layer" sub="when it is text" />
      <Arrow id={id} x1={122} y1={132} x2={158} y2={132} />
      <Box x={160} y={110} w={120} h={44} label="text tokens" sub="~150 for an invoice" stroke={C.correct} />
      <Arrow id={id} x1={282} y1={132} x2={318} y2={92} />
      <Box x={320} y={70} w={110} h={44} label="model" sub="same transformer" fill={C.soft} bold />
      <Arrow id={id} x1={432} y1={92} x2={468} y2={92} />
      <Box x={470} y={70} w={150} h={44} label="structured output" sub="schema + value checks" />
      <Txt x={320} y={165} size={10.5}>either path ends in Lesson 4.3: a schema pins the shape, code verifies the values like OCR output</Txt>
    </Figure>
  );
}
