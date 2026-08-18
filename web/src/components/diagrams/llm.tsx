/**
 * Diagrams for Module 2 - How LLMs actually work.
 * All colours are theme tokens (see primitives.tsx), so every diagram follows the theme.
 */
import { Arrow, Box, C, Defs, Figure, Txt } from './primitives';

/** text -> tokens -> ids -> model -> next-token probabilities -> token -> text */
export function TokenPipeline() {
  const id = 'token-pipeline';
  const y = 62;
  const stages: { label: string; sub: string; w: number }[] = [
    { label: 'text', sub: '"the token"', w: 96 },
    { label: 'tokeniser', sub: 'BPE merges', w: 96 },
    { label: 'token ids', sub: '[1820, 6602]', w: 104 },
    { label: 'model', sub: 'transformer', w: 96 },
    { label: 'next-token', sub: 'probabilities', w: 104 },
    { label: 'text', sub: '"…iser"', w: 96 },
  ];
  const gap = 26;
  let x = 10;
  const placed = stages.map((s) => {
    const p = { ...s, x };
    x += s.w + gap;
    return p;
  });
  const width = x - gap + 10;

  return (
    <Figure
      title="From text to tokens to model and back"
      caption="Everything the model does happens between the two tokeniser steps. It never sees characters — only integer ids."
      viewBox={`0 0 ${width} 150`}
      maxWidth={720}
    >
      <Defs id={id} />
      {placed.map((s, i) => (
        <g key={i}>
          <Box
            x={s.x} y={y} w={s.w} h={46} label={s.label} sub={s.sub}
            fill={i === 3 ? C.soft : C.surface}
            stroke={i === 1 || i === 4 ? C.accent : C.border}
            bold={i === 3}
          />
          {i < placed.length - 1 && (
            <Arrow id={id} x1={s.x + s.w + 2} y1={y + 23} x2={s.x + s.w + gap - 3} y2={y + 23} />
          )}
        </g>
      ))}
      <Txt x={placed[1].x + placed[1].w / 2} y={y - 18} size={11} color={C.accent}>encode</Txt>
      <Txt x={placed[4].x + placed[4].w / 2} y={y - 18} size={11} color={C.accent}>sample → decode</Txt>
      <line x1={placed[2].x} y1={y + 62} x2={placed[4].x + placed[4].w} y2={y + 62} stroke={C.muted} strokeWidth={1.2} />
      <line x1={placed[2].x} y1={y + 56} x2={placed[2].x} y2={y + 62} stroke={C.muted} strokeWidth={1.2} />
      <line x1={placed[4].x + placed[4].w} y1={y + 56} x2={placed[4].x + placed[4].w} y2={y + 62} stroke={C.muted} strokeWidth={1.2} />
      <Txt x={(placed[2].x + placed[4].x + placed[4].w) / 2} y={y + 76} size={11.5}>
        the model only ever works with integers — cost, context limits and "can't count letters" all live here
      </Txt>
    </Figure>
  );
}

/** The autoregressive loop: prompt -> predict -> pick -> append -> repeat until stop. */
export function NextTokenLoop() {
  const id = 'next-token-loop';
  return (
    <Figure
      title="Generation is a loop"
      caption="One forward pass produces one distribution; one token is picked and appended; the longer sequence goes back in. A 400-token answer is 400 trips round this loop."
      viewBox="0 0 640 210"
      maxWidth={640}
    >
      <Defs id={id} />
      <Box x={20} y={80} w={130} h={50} label="tokens so far" sub="prompt + output" mono />
      <Arrow id={id} x1={152} y1={105} x2={198} y2={105} />
      <Box x={200} y={80} w={110} h={50} label="model" sub="one forward pass" fill={C.soft} bold />
      <Arrow id={id} x1={312} y1={105} x2={358} y2={105} />
      <Box x={360} y={80} w={120} h={50} label="distribution" sub="P(next token)" />
      <Arrow id={id} x1={482} y1={105} x2={528} y2={105} />
      <Box x={530} y={80} w={90} h={50} label="pick one" sub="sampler" stroke={C.accent} />
      {/* return path */}
      <path d="M 575 132 L 575 170 L 85 170 L 85 134" fill="none" stroke={C.accent} strokeWidth={1.6} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={330} y={184} size={11.5} color={C.accent}>append the chosen token and go round again — until a stop token or the max-tokens limit</Txt>
      <Txt x={330} y={40} size={12} bold color={C.text}>predict → pick → append → repeat</Txt>
      <Txt x={330} y={58} size={11}>the sampler (temperature, top-p) lives in the last box; the model's "knowledge" lives in the second</Txt>
    </Figure>
  );
}

/** A 2-D vector space with three clusters and one cosine angle drawn. */
export function VectorSpace() {
  const id = 'vector-space';
  const pts: { x: number; y: number; l: string; c: number }[] = [
    { x: 120, y: 70, l: 'cat', c: 0 }, { x: 140, y: 95, l: 'dog', c: 0 }, { x: 105, y: 105, l: 'kitten', c: 0 },
    { x: 330, y: 60, l: 'server', c: 1 }, { x: 355, y: 85, l: 'browser', c: 1 }, { x: 320, y: 100, l: 'deploy', c: 1 },
    { x: 320, y: 170, l: 'ramen', c: 2 }, { x: 345, y: 190, l: 'sourdough', c: 2 },
  ];
  const fills = [C.accent, C.correct, C.wrong];
  const O = { x: 40, y: 210 };
  return (
    <Figure
      title="Meaning as position in a vector space"
      caption="Each text becomes a point (really a direction). Similar meaning → nearby directions → small angle → cosine near 1. Real spaces have hundreds of dimensions; the geometry is the same."
      viewBox="0 0 420 240"
      maxWidth={520}
    >
      <Defs id={id} />
      <line x1={O.x} y1={O.y} x2={400} y2={O.y} stroke={C.border} />
      <line x1={O.x} y1={O.y} x2={O.x} y2={20} stroke={C.border} />
      <Txt x={400} y={226} size={10} anchor="end">dimension 1</Txt>
      <Txt x={O.x + 6} y={22} size={10} anchor="start">dimension 2</Txt>
      {/* cosine angle between cat and dog */}
      <line x1={O.x} y1={O.y} x2={120} y2={70} stroke={C.accent} strokeWidth={1.2} strokeDasharray="4 3" />
      <line x1={O.x} y1={O.y} x2={140} y2={95} stroke={C.accent} strokeWidth={1.2} strokeDasharray="4 3" />
      <line x1={O.x} y1={O.y} x2={330} y2={60} stroke={C.correct} strokeWidth={1.2} strokeDasharray="4 3" />
      <path d="M 78 145 A 60 60 0 0 1 90 152" fill="none" stroke={C.accent} strokeWidth={1.4} />
      <Txt x={112} y={150} size={10.5} color={C.accent} anchor="start">small angle → cos ≈ 0.98</Txt>
      <path d="M 70 158 A 75 75 0 0 1 100 168" fill="none" stroke={C.correct} strokeWidth={1.4} />
      <Txt x={130} y={175} size={10.5} color={C.correct} anchor="start">bigger angle → cos ≈ 0.6</Txt>
      {pts.map((p) => (
        <g key={p.l}>
          <circle cx={p.x} cy={p.y} r={5.5} fill={fills[p.c]} />
          <Txt x={p.x + 9} y={p.y} size={11} anchor="start" color={C.text}>{p.l}</Txt>
        </g>
      ))}
    </Figure>
  );
}

/** One transformer block: attention then feed-forward, stacked N times. */
export function TransformerBlock() {
  const id = 'transformer-block';
  return (
    <Figure
      title="One transformer block, repeated"
      caption="Each token's vector is updated twice per block: attention mixes in information from earlier tokens; the feed-forward layer transforms each token on its own. Stack 30–100 of these and you have the model."
      viewBox="0 0 560 250"
      maxWidth={600}
    >
      <Defs id={id} />
      {/* input tokens */}
      {['The', 'bank', 'raised', 'its', 'rate'].map((t, i) => (
        <Box key={t} x={30 + i * 62} y={200} w={54} h={30} label={t} mono />
      ))}
      <Txt x={175} y={190} size={10.5}>one vector per token, position added</Txt>
      {/* the block */}
      <rect x={20} y={40} width={330} height={130} rx={12} fill="none" stroke={C.border} strokeDasharray="6 4" />
      <Txt x={40} y={54} size={11} anchor="start" bold color={C.text}>block × N</Txt>
      <Box x={40} y={110} w={290} h={40} label="self-attention" sub="each token looks at earlier tokens and pulls in what matters" fill={C.soft} stroke={C.accent} bold />
      <Box x={40} y={60} w={290} h={40} label="feed-forward" sub="each token transformed independently — where 'facts' mostly live" />
      <Arrow id={id} x1={185} y1={198} x2={185} y2={153} />
      <Arrow id={id} x1={185} y1={108} x2={185} y2={103} />
      <Arrow id={id} x1={185} y1={58} x2={185} y2={36} />
      <Box x={130} y={6} w={110} h={28} label="P(next token)" fill={C.surface} stroke={C.correct} />
      {/* side notes */}
      <Txt x={380} y={70} size={11} anchor="start" color={C.text} bold>what this buys</Txt>
      <Txt x={380} y={90} size={10.5} anchor="start">• context: "bank" near "rate" ≠ "bank" near "river"</Txt>
      <Txt x={380} y={108} size={10.5} anchor="start">• long-range links: "it" → "animal"</Txt>
      <Txt x={380} y={126} size={10.5} anchor="start">• parallel over the whole input (why GPUs)</Txt>
      <Txt x={380} y={150} size={11} anchor="start" color={C.text} bold>what it costs</Txt>
      <Txt x={380} y={170} size={10.5} anchor="start">• attention is O(n²) in tokens</Txt>
      <Txt x={380} y={188} size={10.5} anchor="start">• context window = how far it can look</Txt>
      <Txt x={380} y={206} size={10.5} anchor="start">• no memory beyond the window</Txt>
    </Figure>
  );
}

/** The context window as one bar with four segments, and the answer squeezed. */
export function ContextBudgetBar() {
  const id = 'context-budget-bar';
  const W = 520;
  const rows: { label: string; segs: [string, number, string][]; note: string }[] = [
    {
      label: 'healthy',
      segs: [['system', 0.08, C.accent], ['history', 0.22, C.muted], ['retrieved', 0.3, C.wrong], ['answer', 0.2, C.correct]],
      note: 'everything fits, answer has room',
    },
    {
      label: 'overloaded',
      segs: [['system', 0.08, C.accent], ['history', 0.42, C.muted], ['retrieved', 0.46, C.wrong], ['answer', 0.2, C.correct]],
      note: 'the answer is what gets squeezed — or the request is rejected',
    },
  ];
  return (
    <Figure
      title="One window, four claimants"
      caption="System prompt, conversation history, retrieved context and the answer all come out of the same fixed budget. Growth in any of the first three is paid for by the last — unless you decide what to drop."
      viewBox={`0 0 ${W + 40} 190`}
      maxWidth={640}
    >
      <Defs id={id} />
      {rows.map((r, ri) => {
        const y = 40 + ri * 70;
        let x = 20;
        return (
          <g key={r.label}>
            <Txt x={20} y={y - 14} size={11} anchor="start" bold color={C.text}>{r.label}</Txt>
            <Txt x={W + 20} y={y - 14} size={10.5} anchor="end">{r.note}</Txt>
            <rect x={20} y={y} width={W} height={26} rx={6} fill="none" stroke={C.border} />
            {r.segs.map(([name, frac, color]) => {
              const w = frac * W;
              const seg = (
                <g key={name}>
                  <rect x={x} y={y} width={Math.min(w, W + 20 - x)} height={26} fill={color} opacity={0.75} />
                  <Txt x={x + Math.min(w, W + 20 - x) / 2} y={y + 13} size={10} color="#fff" bold>{name}</Txt>
                </g>
              );
              x += w;
              return seg;
            })}
            <line x1={W + 20} y1={y - 4} x2={W + 20} y2={y + 30} stroke={C.wrong} strokeWidth={2} />
          </g>
        );
      })}
      <Txt x={W + 20} y={178} size={10.5} anchor="end" color={C.wrong}>← the window limit is hard</Txt>
    </Figure>
  );
}

/** pretrain -> supervised fine-tune -> preference tuning */
export function TrainingPipeline() {
  const id = 'training-pipeline';
  const stages = [
    { label: 'pretraining', sub: 'predict next token', data: ['trillions of tokens of', 'web, books, code'], out: ['a base model: completes text,', 'follows nothing'], cost: 'months · thousands of GPUs' },
    { label: 'supervised fine-tuning', sub: 'imitate good answers', data: ['tens of thousands of', '(prompt, ideal answer) pairs'], out: ['follows instructions,', 'has a "chat" shape'], cost: 'days' },
    { label: 'preference tuning', sub: 'RLHF / DPO', data: ['humans (or a model) rank', 'candidate answers'], out: ['helpful, hedged, refuses some', 'things — and wants to please'], cost: 'hours to days' },
  ];
  const w = 190;
  const gap = 34;
  return (
    <Figure
      title="How a chat model is made"
      caption="Almost all the capability comes from stage one. Stages two and three shape behaviour: format, helpfulness, refusals — and the eagerness to answer that produces confident nonsense."
      viewBox={`0 0 ${3 * w + 2 * gap + 20} 215`}
      maxWidth={680}
    >
      <Defs id={id} />
      {stages.map((s, i) => {
        const x = 10 + i * (w + gap);
        const cx = x + w / 2;
        return (
          <g key={s.label}>
            <Txt x={cx} y={22} size={10.5}>{s.data[0]}</Txt>
            <Txt x={cx} y={36} size={10.5}>{s.data[1]}</Txt>
            <Arrow id={id} x1={cx} y1={44} x2={cx} y2={62} />
            <Box x={x} y={64} w={w} h={46} label={s.label} sub={s.sub} fill={i === 0 ? C.soft : C.surface} stroke={i === 0 ? C.accent : C.border} bold={i === 0} />
            <Arrow id={id} x1={cx} y1={112} x2={cx} y2={128} />
            <Txt x={cx} y={140} size={10.5} color={C.text}>{s.out[0]}</Txt>
            <Txt x={cx} y={154} size={10.5} color={C.text}>{s.out[1]}</Txt>
            <Txt x={cx} y={176} size={10} color={C.accent}>{s.cost}</Txt>
            {i < 2 && <Arrow id={id} x1={x + w + 3} y1={87} x2={x + w + gap - 3} y2={87} />}
          </g>
        );
      })}
      <Txt x={(3 * w + 2 * gap + 20) / 2} y={202} size={11}>which is why almost nobody does stage one, many do stage two on their own data, and few need stage three</Txt>
    </Figure>
  );
}

/** Temperature reshaping a distribution: three side-by-side bar sets. */
export function TemperatureReshape() {
  const id = 'temperature-reshape';
  const base = [3.2, 2.6, 1.1, 0.9, 0.2, -1.5];
  const labels = ['the', 'a', 'an', 'this', 'every', 'purple'];
  const soft = (t: number) => {
    if (t === 0) return base.map((_, i) => (i === 0 ? 1 : 0));
    const e = base.map((v) => Math.exp(v / t));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map((v) => v / s);
  };
  const panels = [
    { t: 0, title: 'T = 0 (greedy)', note: 'always the same token' },
    { t: 1, title: 'T = 1', note: "the model's own view" },
    { t: 2, title: 'T = 2', note: 'flat: rare tokens get picked' },
  ];
  return (
    <Figure
      title="Temperature reshapes the same distribution"
      caption="Same model, same prompt, same knowledge. Temperature only sharpens or flattens the probabilities the sampler draws from — low for precision, higher for variety."
      viewBox="0 0 600 190"
      maxWidth={640}
    >
      <Defs id={id} />
      {panels.map((p, pi) => {
        const x0 = 20 + pi * 195;
        const probs = soft(p.t);
        return (
          <g key={p.t}>
            <Txt x={x0 + 80} y={22} size={11.5} bold color={C.text}>{p.title}</Txt>
            <Txt x={x0 + 80} y={38} size={10}>{p.note}</Txt>
            {probs.map((pr, i) => (
              <g key={i}>
                <rect x={x0 + i * 26} y={150 - pr * 100} width={20} height={pr * 100} fill={i === 0 ? C.accent : C.muted} opacity={0.85} rx={2} />
                <Txt x={x0 + i * 26 + 10} y={162} size={8.5} mono>{labels[i]}</Txt>
              </g>
            ))}
            <line x1={x0 - 4} y1={150} x2={x0 + 160} y2={150} stroke={C.border} />
          </g>
        );
      })}
    </Figure>
  );
}

/** Where a model's answers come from: knows / pattern-matches / guesses — same tone. */
export function KnowsVsGuesses() {
  const id = 'knows-vs-guesses';
  const cols = [
    { title: 'well-covered in training', ex: '"What is a mutex?"', out: 'reliable', color: C.correct },
    { title: 'plausible, thin data', ex: '"Cite a 2019 paper on X"', out: 'often fabricated', color: C.wrong },
    { title: 'after cutoff / private', ex: '"Our refund policy?"', out: 'guessed unless given', color: C.wrong },
    { title: 'in the prompt', ex: '"Given this doc, …"', out: 'grounded, checkable', color: C.correct },
  ];
  const w = 172;
  const gap = 14;
  return (
    <Figure
      title="Same fluency, different provenance"
      caption="A model produces the most likely continuation whether or not it has grounds for it — the tone is identical. Reliability depends on where the answer comes from, so design so that what matters is in the prompt or verified in code."
      viewBox={`0 0 ${4 * w + 3 * gap + 20} 175`}
      maxWidth={720}
    >
      <Defs id={id} />
      {cols.map((c, i) => {
        const x = 10 + i * (w + gap);
        return (
          <g key={c.title}>
            <rect x={x} y={20} width={w} height={120} rx={10} fill={C.surface} stroke={c.color} strokeWidth={1.4} />
            <Txt x={x + w / 2} y={42} size={10.5} bold color={C.text}>{c.title}</Txt>
            <Txt x={x + w / 2} y={72} size={10} mono>{c.ex}</Txt>
            <Txt x={x + w / 2} y={102} size={11} color={c.color} bold>{c.out}</Txt>
            <Txt x={x + w / 2} y={124} size={9.5}>sounds exactly as confident</Txt>
          </g>
        );
      })}
      <Txt x={(4 * w + 3 * gap + 20) / 2} y={160} size={11} color={C.accent}>what a model "knows" is a gradient — and it does not know where on it a given answer sits</Txt>
    </Figure>
  );
}
