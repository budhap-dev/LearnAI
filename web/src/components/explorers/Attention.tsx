import { useMemo, useState } from 'react';

/**
 * Attention, illustrated. Each sentence carries a hand-crafted attention pattern for one
 * "head": mostly local (each token looks at itself and its neighbours) plus a few strong
 * long-range links that show what attention buys - "it" resolving to the right noun, a
 * word's sense depending on its context. Weights are illustrative, not from a real model.
 */
interface Sentence {
  text: string;
  focus: number;               // the token to open with
  links: Record<number, Record<number, number>>; // from -> { to: weight }
  note: string;
}

const SENTENCES: Sentence[] = [
  {
    text: "The animal didn't cross the street because it was too tired",
    focus: 7,
    links: { 7: { 1: 0.62, 4: 0.08 } },
    note: '“it” attends mostly to “animal” — the sentence is about the animal being tired.',
  },
  {
    text: "The animal didn't cross the street because it was too wide",
    focus: 7,
    links: { 7: { 5: 0.6, 1: 0.1 } },
    note: 'One word changed at the end, and “it” now attends to “street”. Attention is computed per input, not stored.',
  },
  {
    text: 'The bank raised its interest rate again this quarter',
    focus: 1,
    links: { 1: { 3: 0.3, 4: 0.3, 5: 0.15 } },
    note: '“bank” attends to “interest” and “rate” — this is the financial sense, and the model represents it that way.',
  },
  {
    text: 'We sat on the grassy bank of the river all afternoon',
    focus: 5,
    links: { 5: { 4: 0.35, 8: 0.35 } },
    note: 'Same word, different neighbours: “bank” now attends to “grassy” and “river”. Same token id, different meaning in context.',
  },
];

/** Locality baseline plus the hand-set links, normalised to sum to 1 per row. */
function weights(s: Sentence, n: number): number[][] {
  const rows: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = Array.from({ length: n }, () => 0);
    for (let j = 0; j <= i; j++) row[j] = Math.exp(-Math.abs(i - j) * 0.9); // causal: only earlier tokens
    for (const [j, w] of Object.entries(s.links[i] ?? {})) row[Number(j)] += w * n * 0.6;
    const total = row.reduce((a, b) => a + b, 0);
    rows.push(row.map((x) => x / total));
  }
  return rows;
}

export default function Attention() {
  const [si, setSi] = useState(0);
  const sentence = SENTENCES[si];
  const tokens = useMemo(() => sentence.text.split(' '), [sentence]);
  const [focus, setFocus] = useState(sentence.focus);
  const W = useMemo(() => weights(sentence, tokens.length), [sentence, tokens.length]);
  const row = W[Math.min(focus, tokens.length - 1)];
  const rowMax = Math.max(...row);

  const cell = 24;
  const n = tokens.length;
  const size = n * cell;

  function choose(i: number) {
    setSi(i);
    setFocus(SENTENCES[i].focus);
  }

  return (
    <div className="attention">
      <div className="explorer-head">
        <strong>Attention</strong>
        <span className="muted">one head, illustrative weights · rows attend to earlier tokens only</span>
      </div>

      <div className="sample-row" role="group" aria-label="Sentences">
        {SENTENCES.map((s, i) => (
          <button key={i} className={`chip ${i === si ? 'active' : ''}`} onClick={() => choose(i)}>
            {i + 1}. {s.text.split(' ').slice(0, 3).join(' ')}…
          </button>
        ))}
      </div>

      <p className="attn-sentence" aria-label="Sentence; click a word to see what it attends to">
        {tokens.map((tok, j) => {
          const w = row[j];
          const isFocus = j === focus;
          return (
            <button
              key={j}
              className={`attn-tok ${isFocus ? 'focus' : ''}`}
              style={{ ['--w' as string]: (w / rowMax).toFixed(3) }}
              onClick={() => setFocus(j)}
              aria-pressed={isFocus}
              title={isFocus ? 'this token is attending' : `weight ${(w * 100).toFixed(0)}%`}
            >
              {tok}
            </button>
          );
        })}
      </p>
      <p className="muted small">
        Highlighted: how much <strong>“{tokens[focus]}”</strong> attends to each earlier token.{' '}
        {sentence.note}
      </p>

      <div className="attn-heat-wrap">
        <svg viewBox={`0 0 ${size + 90} ${size + 4}`} className="attn-heat" role="img" aria-label="Attention heat map, one row per token">
          {W.map((r, i) =>
            r.map((w, j) => (
              <rect
                key={`${i}-${j}`}
                x={90 + j * cell} y={i * cell} width={cell - 1} height={cell - 1}
                fill={`hsl(262 70% 50% / ${j > i ? 0 : Math.min(1, w * 3)})`}
                stroke={i === focus && j <= i ? 'var(--accent)' : 'transparent'}
                strokeWidth={i === focus ? 1 : 0}
                onClick={() => setFocus(i)}
                style={{ cursor: 'pointer' }}
              >
                <title>{`${tokens[i]} → ${tokens[j]}: ${(w * 100).toFixed(0)}%`}</title>
              </rect>
            )),
          )}
          {tokens.map((tok, i) => (
            <text key={i} x={86} y={i * cell + cell / 2 + 4} fontSize={10.5} textAnchor="end" fill={i === focus ? 'var(--accent)' : 'var(--muted)'} fontFamily="var(--sans)" fontWeight={i === focus ? 700 : 400}>
              {tok}
            </text>
          ))}
        </svg>
      </div>
      <p className="muted small">
        Each row is one token deciding which earlier tokens matter for it. Real models have
        dozens of heads per layer and dozens of layers, each with its own pattern — this is one.
      </p>
    </div>
  );
}
