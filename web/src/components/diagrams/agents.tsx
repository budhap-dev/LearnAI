/**
 * Diagrams for Module 7 - Agents & orchestration.
 */
import { Arrow, Box, C, Defs, Figure, Txt } from './primitives';

/** The five orchestration patterns, one row each. */
export function PatternGallery() {
  const id = 'pattern-gallery';
  const b = (x: number, y: number, label: string, accent = false, w = 74) => (
    <Box x={x} y={y} w={w} h={30} label={label} fill={accent ? C.soft : C.surface} stroke={accent ? C.accent : C.border} />
  );
  const a = (x1: number, y1: number, x2: number, y2: number) => (
    <Arrow id={id} x1={x1} y1={y1} x2={x2} y2={y2} />
  );
  return (
    <Figure
      title="The orchestration patterns, simplest first"
      caption="Your code owns the graph in the first four; the model owns the next step only in the agent. Start at the top; move down only when the task's path genuinely cannot be known in advance."
      viewBox="0 0 680 360"
      maxWidth={700}
    >
      <Defs id={id} />
      <Txt x={12} y={37} size={11} bold color={C.text} anchor="start">chain</Txt>
      {b(80, 22, 'extract', true)}{a(156, 37, 176, 37)}{b(178, 22, 'decide', true)}{a(254, 37, 274, 37)}{b(276, 22, 'draft', true)}
      <Txt x={366} y={37} size={9.5} anchor="start">fixed steps, each checkable — most features end here</Txt>
      <Txt x={12} y={97} size={11} bold color={C.text} anchor="start">router</Txt>
      {b(80, 82, 'classify', true)}
      {b(178, 62, 'billing')}{b(178, 102, 'tech')}
      <path d="M 156 92 L 176 79" fill="none" stroke={C.muted} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <path d="M 156 100 L 176 115" fill="none" stroke={C.muted} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={366} y={97} size={9.5} anchor="start">one cheap call picks the branch; branches stay simple</Txt>
      <Txt x={12} y={172} size={11} bold color={C.text} anchor="start">parallel</Txt>
      {b(80, 157, 'fan out', true)}
      {b(178, 137, 'summary')}{b(178, 177, 'risks')}
      <path d="M 156 167 L 176 154" fill="none" stroke={C.muted} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <path d="M 156 175 L 176 190" fill="none" stroke={C.muted} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      {a(254, 152, 274, 167)}{a(254, 192, 274, 177)}{b(276, 157, 'merge', true)}
      <Txt x={366} y={172} size={9.5} anchor="start">independent pieces at once; latency of the slowest, not the sum</Txt>
      <Txt x={12} y={242} size={11} bold color={C.text} anchor="start">evaluator</Txt>
      {b(80, 227, 'generate', true)}{a(156, 242, 176, 242)}{b(178, 227, 'judge', true)}
      <path d="M 215 225 L 215 211 L 117 211 L 117 225" fill="none" stroke={C.accent} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={366} y={242} size={9.5} anchor="start">retry with feedback until good or capped</Txt>
      <Txt x={12} y={307} size={11} bold color={C.text} anchor="start">agent</Txt>
      {b(80, 292, 'model', true)}{a(156, 307, 176, 307)}{b(178, 292, 'tool')}
      <path d="M 215 290 L 215 276 L 117 276 L 117 290" fill="none" stroke={C.wrong} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={366} y={307} size={9.5} anchor="start">the model picks the next step — budgets and guardrails required</Txt>
      <Txt x={340} y={348} size={10} color={C.accent}>predictability and testability decrease downwards; move down a row only when the one above cannot express the task</Txt>
    </Figure>
  );
}

/** The agent loop with its stop conditions marked. */
export function AgentLoopStops() {
  const id = 'agent-loop-stops';
  return (
    <Figure
      title="The agent loop, with every exit marked"
      caption="One healthy exit (the model answers in prose) and three guardrail exits (step cap, token cap, no-progress). Every exit returns the trace. A loop with only the healthy exit is an incident waiting for a quiet afternoon."
      viewBox="0 0 640 250"
      maxWidth={680}
    >
      <Defs id={id} />
      <Box x={30} y={95} w={120} h={50} label="ask the model" sub="messages + tools" fill={C.soft} stroke={C.accent} bold />
      <Arrow id={id} x1={152} y1={120} x2={198} y2={120} />
      <Box x={200} y={95} w={120} h={50} label="tool calls?" sub="stop_reason" />
      <path d="M 322 110 L 380 70" fill="none" stroke={C.correct} strokeWidth={1.6} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={340} y={72} size={10} color={C.correct}>no → prose</Txt>
      <Box x={382} y={40} w={120} h={44} label="FINISH" sub="answer + trace" stroke={C.correct} />
      <path d="M 322 132 L 380 170" fill="none" stroke={C.muted} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={342} y={168} size={10}>yes</Txt>
      <Box x={382} y={165} w={120} h={44} label="run tools" sub="validate · execute" />
      <path d="M 442 211 L 442 230 L 90 230 L 90 147" fill="none" stroke={C.accent} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={266} y={243} size={10} color={C.accent}>append results, go round again</Txt>
      {/* guardrails */}
      <rect x={520} y={100} width={110} height={110} rx={10} fill="none" stroke={C.wrong} strokeDasharray="5 4" />
      <Txt x={575} y={116} size={10.5} bold color={C.wrong}>guardrail exits</Txt>
      <Txt x={575} y={136} size={10}>step cap</Txt>
      <Txt x={575} y={152} size={10}>token cap</Txt>
      <Txt x={575} y={168} size={10}>no progress</Txt>
      <Txt x={575} y={184} size={10}>drift check</Txt>
      <Txt x={575} y={200} size={10} color={C.wrong}>→ partial + trace</Txt>
      <Txt x={200} y={28} size={11} color={C.text} bold>the loop is your code; the model only proposes</Txt>
    </Figure>
  );
}

/** MCP: host, client, servers. */
export function McpTopology() {
  const id = 'mcp-topology';
  return (
    <Figure
      title="MCP: one protocol between hosts and tool servers"
      caption="Without a protocol, every app integrates every tool bespoke (N×M adapters). With MCP, an app speaks one client protocol and any server's tools, resources and prompts plug in. The security model does not change: each server still needs least privilege and its results are still untrusted input."
      viewBox="0 0 640 240"
      maxWidth={680}
    >
      <Defs id={id} />
      <Box x={30} y={80} w={150} h={70} label="host app" sub="your assistant / IDE / agent" fill={C.soft} stroke={C.accent} bold />
      <Box x={60} y={158} w={90} h={30} label="MCP client" sub="" />
      <line x1={105} y1={150} x2={105} y2={158} stroke={C.muted} />
      {[
        { y: 30, label: 'files server', sub: 'read/write workspace' },
        { y: 100, label: 'tickets server', sub: 'search, create' },
        { y: 170, label: 'database server', sub: 'read-only queries' },
      ].map((s) => (
        <g key={s.label}>
          <Box x={430} y={s.y} w={150} h={44} label={s.label} sub={s.sub} />
          <path d={`M 152 173 C 300 173, 300 ${s.y + 22}, 428 ${s.y + 22}`} fill="none" stroke={C.muted} strokeWidth={1.3} markerEnd={`url(#${id}-arrow)`} />
        </g>
      ))}
      <Txt x={290} y={215} size={10.5}>tools · resources · prompts, discovered at runtime over one protocol</Txt>
      <Txt x={290} y={232} size={10.5} color={C.wrong}>permissions per server; server output is untrusted data (Lesson 4.6)</Txt>
    </Figure>
  );
}

/** Memory tiers. */
export function MemoryTiers() {
  const id = 'memory-tiers';
  return (
    <Figure
      title="Memory is three tiers your code manages"
      caption="Nothing persists in the model. Recent turns ride verbatim; older turns are summarised (lossy, on purpose); durable facts live in a store and are loaded next session. Each arrow is your pipeline, not a model feature."
      viewBox="0 0 640 230"
      maxWidth={680}
    >
      <Defs id={id} />
      <rect x={20} y={20} width={290} height={190} rx={12} fill="none" stroke={C.border} strokeDasharray="6 4" />
      <Txt x={40} y={38} size={11} bold color={C.text} anchor="start">this session's prompt</Txt>
      <Box x={40} y={50} w={250} h={36} label="[facts] plan=Pro; region=eu-west; …" sub="loaded from the store" mono />
      <Box x={40} y={94} w={250} h={36} label="[summary] earlier: slow reports…" sub="model call, lossy" mono />
      <Box x={40} y={138} w={250} h={56} label="last N turns, verbatim" sub="the working set" />
      <Box x={420} y={40} w={180} h={50} label="fact store" sub="key/value · survives sessions" fill={C.soft} stroke={C.accent} bold />
      <Box x={420} y={130} w={180} h={50} label="transcript archive" sub="full history · analytics, audit" />
      <path d="M 292 68 C 360 68, 360 65, 418 65" fill="none" stroke={C.accent} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={355} y={54} size={9.5} color={C.accent}>extract facts</Txt>
      <path d="M 418 78 C 350 78, 350 60, 292 60" fill="none" stroke={C.accent} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={355} y={92} size={9.5} color={C.accent}>load next session</Txt>
      <path d="M 292 166 L 418 158" fill="none" stroke={C.muted} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={355} y={172} size={9.5}>append all turns</Txt>
      <Txt x={320} y={222} size={10.5} color={C.accent}>what to forget is a product decision — the store holds only what you would show the user</Txt>
    </Figure>
  );
}

/** Supervisor + workers + approval gate. */
export function SupervisorGate() {
  const id = 'supervisor-gate';
  return (
    <Figure
      title="Supervisor, workers, and the gate money waits at"
      caption="The supervisor only routes. Workers are narrow and testable alone. Anything with a blast radius produces a proposal that stops at a code gate until a human — authenticated by your auth system, not by the model — approves it."
      viewBox="0 0 660 260"
      maxWidth={700}
    >
      <Defs id={id} />
      <Box x={20} y={100} w={100} h={50} label="request" sub="email, ticket" />
      <Arrow id={id} x1={122} y1={125} x2={158} y2={125} />
      <Box x={160} y={100} w={110} h={50} label="supervisor" sub="split & route only" fill={C.soft} stroke={C.accent} bold />
      <path d="M 272 112 L 330 60" fill="none" stroke={C.muted} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <path d="M 272 138 L 330 190" fill="none" stroke={C.muted} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Box x={332} y={35} w={130} h={50} label="product worker" sub="grounded answer" />
      <Box x={332} y={165} w={130} h={50} label="billing worker" sub="proposes only" />
      <path d="M 464 60 L 560 60 L 560 98" fill="none" stroke={C.correct} strokeWidth={1.5} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={512} y={50} size={10} color={C.correct}>auto-serve</Txt>
      <Arrow id={id} x1={464} y1={190} x2={498} y2={190} />
      <Box x={500} y={165} w={120} h={50} label="approval gate" sub="policy in code" stroke={C.wrong} bold />
      <path d="M 560 163 L 560 152" fill="none" stroke={C.wrong} strokeWidth={1.5} markerEnd={`url(#${id}-arrow)`} />
      <Box x={500} y={100} w={120} h={50} label="respond" sub="answer + outcome" />
      <Txt x={560} y={238} size={10} color={C.wrong}>👤 approve / reject — real auth, real audit</Txt>
      <line x1={560} y1={216} x2={560} y2={228} stroke={C.wrong} strokeWidth={1.4} />
      <Txt x={230} y={240} size={10.5} color={C.accent}>typed JSON at every seam → each hop is loggable, replayable, evaluable on its own golden set</Txt>
    </Figure>
  );
}

/** Failure taxonomy for agents. */
export function AgentFailures() {
  const cols = [
    { title: 'Loops & stalls', color: C.wrong, items: ['same call repeated', 'variations, no new info', 'retrying a failing tool', 'fix: repeat/progress detectors'] },
    { title: 'Runaway spend', color: C.accent, items: ['steps × growing context', 'fan-out without caps', 'retries on retries', 'fix: step + token budgets'] },
    { title: 'Off the goal', color: C.muted, items: ['plausible but irrelevant work', 'scope creep mid-run', 'answering a different question', 'fix: drift check, re-state goal'] },
    { title: 'Compounding errors', color: C.correct, items: ['95% per step ≈ 60% at 10 steps', 'wrong fact poisons later steps', 'confident wrong conclusion', 'fix: verify between steps'] },
  ];
  return (
    <Figure
      title="How agents fail, and which guardrail answers each"
      caption="Every failure class has a code-shaped answer that lives in the loop. Prompts reduce the frequency; guardrails bound the damage. You need both, and the trace makes all of them debuggable."
      viewBox="0 0 640 200"
      maxWidth={680}
    >
      {cols.map((g, i) => {
        const x = 10 + i * 158;
        return (
          <g key={g.title}>
            <rect x={x} y={10} width={148} height={180} rx={10} fill={C.surface} stroke={g.color} strokeWidth={1.4} />
            <Txt x={x + 74} y={30} size={11} bold color={g.color}>{g.title}</Txt>
            {g.items.map((it, j) => (
              <Txt key={it} x={x + 12} y={56 + j * 32} size={9.8} anchor="start" color={j === 3 ? g.color : C.text}>{j === 3 ? it : `• ${it}`}</Txt>
            ))}
          </g>
        );
      })}
    </Figure>
  );
}
