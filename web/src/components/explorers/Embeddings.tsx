import { useMemo, useState } from 'react';

/**
 * Toy embeddings: 6 hand-made "meaning dimensions" per phrase. Real embeddings have
 * hundreds to thousands of learned dimensions, but the operations are the same - cosine
 * similarity, nearest neighbours - and the point (meaning as geometry) is visible in 2-D.
 *
 * dims: [animals, food, programming, cloud/infra, sport, travel]
 */
type Item = { text: string; v: number[] };
const ITEMS: Item[] = [
  { text: 'a cat asleep on the sofa', v: [1, 0, 0, 0, 0, 0.1] },
  { text: 'the dog fetched the ball', v: [0.9, 0, 0, 0, 0.5, 0] },
  { text: 'a kitten chasing string', v: [1, 0, 0, 0, 0.2, 0] },
  { text: 'wild horses on the plain', v: [0.9, 0, 0, 0, 0, 0.4] },
  { text: 'fresh sourdough from the oven', v: [0, 1, 0, 0, 0, 0.1] },
  { text: 'a bowl of ramen', v: [0, 1, 0, 0, 0, 0.3] },
  { text: 'grilled fish with lemon', v: [0.2, 1, 0, 0, 0, 0.2] },
  { text: 'chocolate cake recipe', v: [0, 1, 0.1, 0, 0, 0] },
  { text: 'a null pointer exception', v: [0, 0, 1, 0.1, 0, 0] },
  { text: 'refactor the payment service', v: [0, 0, 1, 0.3, 0, 0] },
  { text: 'unit tests for the parser', v: [0, 0, 1, 0, 0, 0] },
  { text: 'a TypeScript compile error', v: [0, 0, 1, 0.1, 0, 0] },
  { text: 'kubernetes pod restarting', v: [0, 0, 0.5, 1, 0, 0] },
  { text: 'the database failed over', v: [0, 0, 0.4, 1, 0, 0] },
  { text: 'autoscaling the API tier', v: [0, 0, 0.3, 1, 0, 0] },
  { text: 'a marathon in the rain', v: [0, 0, 0, 0, 1, 0.3] },
  { text: 'the striker scored twice', v: [0, 0, 0, 0, 1, 0] },
  { text: 'tennis final on centre court', v: [0, 0, 0, 0, 1, 0.1] },
  { text: 'a train through the Alps', v: [0, 0, 0, 0, 0, 1] },
  { text: 'boarding pass and passport', v: [0, 0, 0, 0.1, 0, 1] },
  { text: 'a week in Lisbon', v: [0, 0.3, 0, 0, 0, 1] },
  { text: 'street food in Bangkok', v: [0, 0.8, 0, 0, 0, 0.8] },
  { text: 'the team ran a bug bash', v: [0, 0, 0.8, 0, 0.4, 0] },
  { text: 'a horse race at Ascot', v: [0.6, 0, 0, 0, 0.8, 0.2] },
];

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** A fixed 6-D → 2-D projection - just so the picture is stable; the maths uses all 6. */
const AXES: [number[], number[]] = [
  [-0.9, -0.5, 0.9, 0.6, -0.2, 0.1],
  [0.6, -0.8, 0.5, -0.4, -0.7, 0.9],
];
function project(v: number[]): [number, number] {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  const u = v.map((x) => x / n);
  return [u.reduce((s, x, i) => s + x * AXES[0][i], 0), u.reduce((s, x, i) => s + x * AXES[1][i], 0)];
}

const CLUSTER_HUES = [30, 340, 262, 200, 150, 90];

export default function Embeddings() {
  const [selected, setSelected] = useState(0);
  const points = useMemo(() => ITEMS.map((it) => ({ ...it, xy: project(it.v) })), []);
  const ranked = useMemo(
    () =>
      points
        .map((p, i) => ({ i, sim: cosine(ITEMS[selected].v, p.v) }))
        .filter((r) => r.i !== selected)
        .sort((a, b) => b.sim - a.sim),
    [points, selected],
  );
  const top = new Map(ranked.slice(0, 3).map((r, rank) => [r.i, rank]));

  const xs = points.map((p) => p.xy[0]);
  const ys = points.map((p) => p.xy[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const W = 560, H = 360, PAD = 22;
  const sx = (x: number) => PAD + ((x - minX) / (maxX - minX)) * (W - 2 * PAD);
  const sy = (y: number) => H - PAD - ((y - minY) / (maxY - minY)) * (H - 2 * PAD);
  const hue = (v: number[]) => CLUSTER_HUES[v.indexOf(Math.max(...v))];

  return (
    <div className="embeddings">
      <div className="explorer-head">
        <strong>Embeddings</strong>
        <span className="muted">24 phrases · 6 toy dimensions · real cosine similarity · 2-D projection for display</span>
      </div>

      <div className="emb-layout">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Scatter plot of phrases; nearby points have similar meaning" className="emb-plot">
          {points.map((p, i) => {
            const isSel = i === selected;
            const rank = top.get(i);
            return (
              <g key={i} onClick={() => setSelected(i)} style={{ cursor: 'pointer' }}>
                {rank !== undefined && (
                  <line x1={sx(points[selected].xy[0])} y1={sy(points[selected].xy[1])} x2={sx(p.xy[0])} y2={sy(p.xy[1])} stroke="var(--accent)" strokeWidth={1.2} strokeDasharray="4 3" opacity={0.7} />
                )}
                <circle
                  cx={sx(p.xy[0])} cy={sy(p.xy[1])} r={isSel ? 8 : rank !== undefined ? 6.5 : 5}
                  fill={`hsl(${hue(p.v)} 65% 50% / ${isSel || rank !== undefined ? 0.95 : 0.55})`}
                  stroke={isSel ? 'var(--text)' : 'transparent'} strokeWidth={2}
                >
                  <title>{p.text}</title>
                </circle>
                {(isSel || rank !== undefined) && (
                  <text x={sx(p.xy[0]) + 10} y={sy(p.xy[1]) + 4} fontSize={11} fill="var(--text)" fontFamily="var(--sans)">
                    {p.text}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <div className="emb-side">
          <label className="small">
            phrase{' '}
            <select value={selected} onChange={(e) => setSelected(Number(e.target.value))} aria-label="Choose a phrase">
              {ITEMS.map((it, i) => (
                <option key={i} value={i}>{it.text}</option>
              ))}
            </select>
          </label>
          <p className="small"><strong>Nearest to</strong> “{ITEMS[selected].text}”</p>
          <ol className="emb-list">
            {ranked.slice(0, 5).map((r) => (
              <li key={r.i}>
                <button className="linkish" onClick={() => setSelected(r.i)}>{ITEMS[r.i].text}</button>
                <span className="dist-n">{r.sim.toFixed(2)}</span>
              </li>
            ))}
          </ol>
          <p className="small"><strong>Furthest</strong></p>
          <ul className="emb-list">
            {ranked.slice(-2).map((r) => (
              <li key={r.i}>
                <span>{ITEMS[r.i].text}</span>
                <span className="dist-n">{r.sim.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="muted small">
        Click any point. Colour = dominant toy dimension. Note “street food in Bangkok” sits between
        food and travel, and “a horse race at Ascot” between animals and sport — meaning is a
        position, not a category. Similarity ranks; it never proves.
      </p>
    </div>
  );
}
