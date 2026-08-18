/**
 * Diagrams for Module 1 - Foundations.
 */
import { Arrow, Box, C, Defs, Figure, Txt } from './primitives';

/** AI ⊃ ML ⊃ DL ⊃ GenAI as nested rounded rectangles, with examples in each ring. */
export function AiNestedSets() {
  return (
    <Figure
      title="AI, machine learning, deep learning and generative AI as nested sets"
      caption="Each ring is a subset of the one outside it. 'AI' includes hand-written rules; ML learns from data; deep learning is ML with neural networks; generative AI is deep learning that produces content — LLMs live in the innermost ring."
      viewBox="0 0 560 300"
      maxWidth={600}
    >
      <rect x={10} y={10} width={540} height={280} rx={18} fill={C.surface} stroke={C.border} />
      <Txt x={30} y={30} size={12} bold color={C.text} anchor="start">Artificial intelligence</Txt>
      <Txt x={30} y={48} size={10.5} anchor="start">rules, search, planning, expert systems — anything that does a "smart" task</Txt>
      <rect x={30} y={62} width={500} height={218} rx={16} fill={C.bg} stroke={C.border} />
      <Txt x={50} y={82} size={12} bold color={C.text} anchor="start">Machine learning</Txt>
      <Txt x={50} y={100} size={10.5} anchor="start">behaviour learned from data: regression, trees, boosting, clustering</Txt>
      <rect x={50} y={114} width={460} height={156} rx={14} fill={C.surface} stroke={C.border} />
      <Txt x={70} y={134} size={12} bold color={C.text} anchor="start">Deep learning</Txt>
      <Txt x={70} y={152} size={10.5} anchor="start">neural networks with many layers: vision, speech, embeddings, recommendation</Txt>
      <rect x={70} y={166} width={420} height={94} rx={12} fill={C.soft} stroke={C.accent} strokeWidth={1.4} />
      <Txt x={90} y={186} size={12} bold color={C.text} anchor="start">Generative AI</Txt>
      <Txt x={90} y={204} size={10.5} anchor="start">models that produce content: text, code, images, audio</Txt>
      <rect x={90} y={216} width={380} height={34} rx={9} fill={C.surface} stroke={C.accent} />
      <Txt x={280} y={233} size={11.5} bold color={C.accent}>Large language models — where most of this course lives</Txt>
    </Figure>
  );
}

/** The training loop vs the inference path, side by side. */
export function TrainVsInfer() {
  const id = 'train-vs-infer';
  return (
    <Figure
      title="Training loop versus inference path"
      caption="Training: run examples through the model, measure the error, nudge the parameters, repeat — expensive, done once (or occasionally). Inference: parameters frozen, one input in, one output out — cheap, done constantly. Confusing the two is the root of 'can we just teach it our data at runtime?'."
      viewBox="0 0 640 230"
      maxWidth={680}
    >
      <Defs id={id} />
      {/* training */}
      <rect x={10} y={10} width={360} height={210} rx={12} fill="none" stroke={C.border} strokeDasharray="6 4" />
      <Txt x={30} y={28} size={12} bold color={C.text} anchor="start">Training (learn the numbers)</Txt>
      <Box x={24} y={50} w={132} h={40} label="known examples" sub="input, correct output" />
      <Arrow id={id} x1={158} y1={70} x2={186} y2={70} />
      <Box x={188} y={50} w={84} h={40} label="model" sub="parameters" fill={C.soft} bold />
      <Arrow id={id} x1={274} y1={70} x2={302} y2={70} />
      <Box x={304} y={50} w={34} h={40} label="ŷ" mono />
      <Arrow id={id} x1={321} y1={92} x2={321} y2={118} />
      <Box x={246} y={120} w={110} h={40} label="loss" sub="how wrong?" stroke={C.wrong} />
      <Arrow id={id} x1={244} y1={140} x2={160} y2={140} />
      <Box x={24} y={120} w={134} h={40} label="nudge parameters" sub="gradient step" stroke={C.accent} />
      <path d="M 90 118 L 90 100 L 230 100 L 230 92" fill="none" stroke={C.accent} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={190} y={190} size={10.5} color={C.accent}>repeat millions of times · GPUs · hours to months</Txt>
      <Txt x={190} y={206} size={10.5}>result: a file of numbers (the weights)</Txt>
      {/* inference */}
      <rect x={385} y={10} width={245} height={210} rx={12} fill="none" stroke={C.border} strokeDasharray="6 4" />
      <Txt x={405} y={28} size={12} bold color={C.text} anchor="start">Inference (use the numbers)</Txt>
      <Box x={400} y={80} w={70} h={40} label="input" />
      <Arrow id={id} x1={472} y1={100} x2={498} y2={100} />
      <Box x={500} y={80} w={80} h={40} label="model" sub="frozen" fill={C.soft} bold />
      <Arrow id={id} x1={582} y1={100} x2={598} y2={100} />
      <Box x={600} y={80} w={24} h={40} label="ŷ" mono />
      <Txt x={507} y={150} size={10.5}>no learning happens here</Txt>
      <Txt x={507} y={166} size={10.5}>every API call is this path</Txt>
      <Txt x={507} y={190} size={10.5} color={C.accent}>milliseconds to seconds · per request</Txt>
    </Figure>
  );
}

/** Supervised / unsupervised / reinforcement, one picture each. */
export function ThreeKindsOfLearning() {
  const id = 'three-kinds';
  return (
    <Figure
      title="Three kinds of learning, one picture each"
      caption="Supervised: examples with answers. Unsupervised: structure without answers. Reinforcement: actions, a reward, and a policy that improves. LLM pretraining is self-supervised — the 'answer' is the next token, taken from the text itself — and preference tuning uses reinforcement."
      viewBox="0 0 640 220"
      maxWidth={680}
    >
      <Defs id={id} />
      {/* supervised */}
      <rect x={10} y={10} width={200} height={200} rx={12} fill={C.surface} stroke={C.border} />
      <Txt x={110} y={30} size={12} bold color={C.text}>Supervised</Txt>
      <Txt x={110} y={46} size={10}>examples with labels</Txt>
      {[[40, 90, 'spam'], [70, 120, 'spam'], [55, 150, 'spam'], [140, 80, 'ok'], [165, 110, 'ok'], [150, 145, 'ok']].map(([x, y, l], i) => (
        <g key={i}>
          <circle cx={Number(x)} cy={Number(y)} r={6} fill={l === 'spam' ? C.wrong : C.correct} />
          <Txt x={Number(x)} y={Number(y) + 16} size={9}>{String(l)}</Txt>
        </g>
      ))}
      <line x1={100} y1={70} x2={120} y2={175} stroke={C.accent} strokeWidth={1.6} strokeDasharray="5 3" />
      <Txt x={110} y={195} size={10} color={C.accent}>learn the boundary</Txt>
      {/* unsupervised */}
      <rect x={220} y={10} width={200} height={200} rx={12} fill={C.surface} stroke={C.border} />
      <Txt x={320} y={30} size={12} bold color={C.text}>Unsupervised</Txt>
      <Txt x={320} y={46} size={10}>no labels — find structure</Txt>
      {[[255, 85], [270, 100], [250, 108], [340, 90], [355, 80], [350, 105], [300, 160], [315, 150], [290, 172], [335, 165]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={5.5} fill={C.muted} />
      ))}
      <ellipse cx={258} cy={98} rx={24} ry={22} fill="none" stroke={C.accent} strokeDasharray="4 3" />
      <ellipse cx={349} cy={92} rx={24} ry={22} fill="none" stroke={C.accent} strokeDasharray="4 3" />
      <ellipse cx={310} cy={162} rx={36} ry={22} fill="none" stroke={C.accent} strokeDasharray="4 3" />
      <Txt x={320} y={195} size={10} color={C.accent}>clusters, anomalies, embeddings</Txt>
      {/* reinforcement */}
      <rect x={430} y={10} width={200} height={200} rx={12} fill={C.surface} stroke={C.border} />
      <Txt x={530} y={30} size={12} bold color={C.text}>Reinforcement</Txt>
      <Txt x={530} y={46} size={10}>act, get a reward, improve the policy</Txt>
      <Box x={442} y={78} w={64} h={36} label="agent" sub="policy" fill={C.soft} />
      <Box x={554} y={78} w={64} h={36} label="env." sub="world" />
      <path d="M 508 88 L 550 88" stroke={C.muted} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={530} y={72} size={9}>action</Txt>
      <path d="M 552 106 L 510 106" stroke={C.muted} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={530} y={126} size={9}>state, reward</Txt>
      <Txt x={530} y={150} size={10}>games, robotics, ranking —</Txt>
      <Txt x={530} y={166} size={10}>and RLHF for chat models</Txt>
      <Txt x={530} y={195} size={10} color={C.accent}>the loop is the product</Txt>
    </Figure>
  );
}

/** Where a probabilistic component sits in an otherwise deterministic system. */
export function AiAsComponent() {
  const id = 'ai-as-component';
  return (
    <Figure
      title="A model is a component, not the system"
      caption="Everything around the model is ordinary software you already know how to build and test. The model is one probabilistic step; the value — and the reliability — comes from what feeds it and what checks it."
      viewBox="0 0 700 250"
      maxWidth={720}
    >
      <Defs id={id} />
      <Box x={10} y={70} w={90} h={46} label="request" sub="user / event" />
      <Arrow id={id} x1={102} y1={93} x2={126} y2={93} />
      <Box x={128} y={70} w={140} h={46} label="your code" sub="auth · lookup · retrieve" />
      <Arrow id={id} x1={270} y1={93} x2={294} y2={93} />
      <Box x={296} y={58} w={120} h={70} label="model call" sub="probabilistic" fill={C.soft} stroke={C.accent} bold />
      <Arrow id={id} x1={418} y1={93} x2={442} y2={93} />
      <Box x={444} y={70} w={140} h={46} label="your code" sub="validate · verify · act" />
      <Arrow id={id} x1={586} y1={93} x2={606} y2={93} />
      <Box x={608} y={70} w={84} h={46} label="response" sub="or escalate" />
      {/* top annotations */}
      <Txt x={356} y={24} size={10.5} color={C.wrong}>a sample from a distribution:</Txt>
      <Txt x={356} y={38} size={10.5} color={C.wrong}>evaluate on rates, never trust one run</Txt>
      {/* bottom annotations */}
      <Txt x={198} y={140} size={10.5} color={C.correct}>deterministic — test it normally</Txt>
      <Txt x={198} y={158} size={10.5} color={C.text}>what goes IN decides most of the quality</Txt>
      <Txt x={198} y={174} size={10.5}>context · retrieval · tool results</Txt>
      <Txt x={514} y={140} size={10.5} color={C.correct}>deterministic — test it normally</Txt>
      <Txt x={514} y={158} size={10.5} color={C.text}>what CHECKS the output decides the risk</Txt>
      <Txt x={514} y={174} size={10.5}>schemas · tests · policies · humans</Txt>
      <Txt x={350} y={215} size={11.5} color={C.accent} bold>judgement over meaning → model  ·  exactness, facts, side effects → code</Txt>
    </Figure>
  );
}

/** The 2026 stack from hardware to applications. */
export function AiStack() {
  const layers = [
    { label: 'Applications & agents', sub: 'your product · assistants · copilots · workflows', mine: true },
    { label: 'Orchestration & tooling', sub: 'RAG, tools/MCP, evals, gateways, observability, guardrails', mine: true },
    { label: 'Model APIs & serving', sub: 'hosted APIs · cloud model platforms · self-hosted inference', mine: false },
    { label: 'Models', sub: 'frontier closed models · open-weight models · small/specialised · embeddings', mine: false },
    { label: 'Training & data', sub: 'pretraining corpora · fine-tuning · preference data · labelling', mine: false },
    { label: 'Hardware', sub: 'GPUs / accelerators · memory · networking · energy', mine: false },
  ];
  return (
    <Figure
      title="The stack, top to bottom"
      caption="Most engineers work in the top two layers and buy the rest. Knowing the layers below explains cost, latency, why models change under you, and what 'self-hosting' actually means."
      viewBox="0 0 560 250"
      maxWidth={600}
    >
      {layers.map((l, i) => {
        const y = 12 + i * 38;
        return (
          <g key={l.label}>
            <rect x={20} y={y} width={520} height={32} rx={8} fill={l.mine ? C.soft : C.surface} stroke={l.mine ? C.accent : C.border} strokeWidth={l.mine ? 1.4 : 1} />
            <Txt x={34} y={y + 16} size={11.5} bold color={C.text} anchor="start">{l.label}</Txt>
            <Txt x={528} y={y + 16} size={10} anchor="end">{l.sub}</Txt>
          </g>
        );
      })}
      <Txt x={280} y={243} size={10.5} color={C.accent}>highlighted: where this course spends its time — the layers you build in</Txt>
    </Figure>
  );
}

/** Failure modes grouped by cause. */
export function FailureTaxonomy() {
  const groups = [
    { title: 'From the model', color: C.wrong, items: ['fabrication (hallucination)', 'knowledge cutoff', 'bias in training data', 'weak on characters, arithmetic', 'non-determinism'] },
    { title: 'From the input', color: C.accent, items: ['prompt injection', 'missing context', 'ambiguous asks', 'stale or wrong retrieval', 'too much context'] },
    { title: 'From the system', color: C.muted, items: ['cost blow-up', 'latency & timeouts', 'silent truncation', 'model version changed', 'no evals → regressions'] },
    { title: 'From the org', color: C.correct, items: ['no owner for prompts', 'no eval before launch', 'over-trusting demos', 'privacy, compliance gaps', 'no rollback plan'] },
  ];
  return (
    <Figure
      title="What goes wrong, grouped by where it comes from"
      caption="Sorting a failure by its source tells you where the fix lives. Model failures are designed around; input failures are engineered away; system failures are operated; org failures are process."
      viewBox="0 0 700 235"
      maxWidth={720}
    >
      {groups.map((g, i) => {
        const x = 10 + i * 172;
        return (
          <g key={g.title}>
            <rect x={x} y={10} width={164} height={215} rx={10} fill={C.surface} stroke={g.color} strokeWidth={1.4} />
            <Txt x={x + 82} y={30} size={11.5} bold color={g.color}>{g.title}</Txt>
            {g.items.map((it, j) => (
              <Txt key={it} x={x + 12} y={56 + j * 30} size={10.2} anchor="start" color={C.text}>• {it}</Txt>
            ))}
          </g>
        );
      })}
    </Figure>
  );
}
