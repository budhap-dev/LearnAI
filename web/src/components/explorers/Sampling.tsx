import { useMemo, useState } from 'react';

/**
 * One fixed next-token distribution and the three sampler knobs. Nothing here is a model:
 * the logits are made up to look like a real "the / a / an …" step. What matters is that
 * temperature, top-k and top-p only reshape or cut this list - they never add knowledge.
 */
const LOGITS: [string, number][] = [
  [' the', 3.2],
  [' a', 2.6],
  [' an', 1.1],
  [' this', 0.9],
  [' every', 0.2],
  [' one', -0.4],
  [' purple', -1.5],
  [' seventeen', -2.4],
];

function softmax(logits: [string, number][], temperature: number): [string, number][] {
  if (temperature <= 0) {
    return logits.map(([t], i) => [t, i === 0 ? 1 : 0] as [string, number]);
  }
  const scaled = logits.map(([t, v]) => [t, Math.exp(v / temperature)] as [string, number]);
  const total = scaled.reduce((s, [, v]) => s + v, 0);
  return scaled.map(([t, v]) => [t, v / total]);
}

function truncate(probs: [string, number][], k: number, p: number): [string, number][] {
  const sorted = [...probs].sort((a, b) => b[1] - a[1]);
  const kept: [string, number][] = [];
  let running = 0;
  for (const [t, prob] of sorted.slice(0, k)) {
    kept.push([t, prob]);
    running += prob;
    if (running >= p) break;
  }
  const total = kept.reduce((s, [, v]) => s + v, 0);
  return kept.map(([t, v]) => [t, v / total]);
}

const PRESETS: { label: string; t: number; k: number; p: number; note: string }[] = [
  { label: 'Greedy', t: 0, k: 8, p: 1, note: 'temperature 0 - always the top token; deterministic, repetitive' },
  { label: 'Precise', t: 0.3, k: 8, p: 0.9, note: 'low temperature - factual answers, extraction, code' },
  { label: 'Default', t: 1, k: 8, p: 1, note: "the model's own distribution, untouched" },
  { label: 'Creative', t: 1.3, k: 8, p: 0.95, note: 'flatter - more variety, more surprises, more nonsense' },
];

export default function Sampling() {
  const [t, setT] = useState(1);
  const [k, setK] = useState(8);
  const [p, setP] = useState(1);
  const [samples, setSamples] = useState<string[]>([]);

  const probs = useMemo(() => softmax(LOGITS, t), [t]);
  const final = useMemo(() => truncate(probs, k, p), [probs, k, p]);
  const finalMap = new Map(final);
  const max = Math.max(...probs.map(([, v]) => v), ...final.map(([, v]) => v));

  function draw(n = 20) {
    const picks: string[] = [];
    for (let i = 0; i < n; i++) {
      const r = Math.random();
      let running = 0;
      let chosen = final[final.length - 1][0];
      for (const [tok, prob] of final) {
        running += prob;
        if (r < running) {
          chosen = tok;
          break;
        }
      }
      picks.push(chosen.trim());
    }
    setSamples(picks);
  }

  return (
    <div className="sampling">
      <div className="explorer-head">
        <strong>Sampling</strong>
        <span className="muted">one next-token step · temperature, top-k, top-p · nothing here is a model</span>
      </div>

      <div className="sample-row" role="group" aria-label="Presets">
        {PRESETS.map((pr) => (
          <button
            key={pr.label}
            className="chip"
            title={pr.note}
            onClick={() => {
              setT(pr.t);
              setK(pr.k);
              setP(pr.p);
              setSamples([]);
            }}
          >
            {pr.label}
          </button>
        ))}
      </div>

      <div className="slider-grid">
        <label>
          <span>temperature <b>{t.toFixed(2)}</b></span>
          <input type="range" min="0" max="2" step="0.05" value={t} onChange={(e) => setT(Number(e.target.value))} />
        </label>
        <label>
          <span>top-k <b>{k}</b></span>
          <input type="range" min="1" max="8" step="1" value={k} onChange={(e) => setK(Number(e.target.value))} />
        </label>
        <label>
          <span>top-p <b>{p.toFixed(2)}</b></span>
          <input type="range" min="0.1" max="1" step="0.05" value={p} onChange={(e) => setP(Number(e.target.value))} />
        </label>
      </div>

      <div className="dist" role="img" aria-label="Bar chart of next-token probabilities after temperature and truncation">
        {probs.map(([tok, raw]) => {
          const kept = finalMap.get(tok);
          return (
            <div className="dist-row" key={tok}>
              <code className="dist-tok">{tok.replace(' ', '␣')}</code>
              <div className="dist-bar">
                <span className="dist-raw" style={{ width: `${(raw / max) * 100}%` }} />
                {kept !== undefined && <span className="dist-kept" style={{ width: `${(kept / max) * 100}%` }} />}
              </div>
              <span className="dist-n">
                {kept === undefined ? <em>cut</em> : `${(kept * 100).toFixed(1)}%`}
              </span>
            </div>
          );
        })}
      </div>
      <p className="muted small">
        Faint bar = after temperature only. Solid bar = what the sampler actually draws from,
        after top-k / top-p cut the tail and the rest was renormalised.
      </p>

      <div className="explorer-controls">
        <button onClick={() => draw()}>Sample 20 tokens</button>
        {samples.length > 0 && (
          <code className="samples" aria-live="polite">
            {samples.join(' ')}
          </code>
        )}
      </div>
    </div>
  );
}
