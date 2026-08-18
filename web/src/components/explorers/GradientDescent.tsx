import { useMemo, useState } from 'react';

/**
 * Two parameters, one loss surface, one dial. The same data as the 1.2 example: fit a line
 * y = w·x + b to eight points. Step, watch the ball roll downhill; crank the learning rate
 * and watch it overshoot. Nothing else in ML training is conceptually different.
 */
const DATA: [number, number][] = [[1, 12], [2, 14.5], [3, 16], [4, 19], [5, 20.5], [6, 23], [8, 27], [10, 32]];

const loss = (w: number, b: number) => DATA.reduce((s, [x, y]) => s + (w * x + b - y) ** 2, 0) / DATA.length;
const grad = (w: number, b: number): [number, number] => {
  const n = DATA.length;
  return [
    DATA.reduce((s, [x, y]) => s + 2 * (w * x + b - y) * x, 0) / n,
    DATA.reduce((s, [x, y]) => s + 2 * (w * x + b - y), 0) / n,
  ];
};

// Plot window over (w, b). The minimum is near w≈2.15, b≈10.
const W_MIN = -1, W_MAX = 5, B_MIN = -4, B_MAX = 24;
const N = 44;

export default function GradientDescent() {
  const [lr, setLr] = useState(0.01);
  const [path, setPath] = useState<[number, number][]>([[0, 0]]);
  const [w, b] = path[path.length - 1];

  const surface = useMemo(() => {
    const cells: number[] = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const ww = W_MIN + ((i + 0.5) / N) * (W_MAX - W_MIN);
      const bb = B_MIN + ((j + 0.5) / N) * (B_MAX - B_MIN);
      cells.push(Math.log10(loss(ww, bb) + 1));
    }
    const max = Math.max(...cells);
    return { cells, max };
  }, []);

  function step(k = 1) {
    let [cw, cb] = path[path.length - 1];
    const next: [number, number][] = [];
    for (let i = 0; i < k; i++) {
      const [dw, db] = grad(cw, cb);
      cw -= lr * dw;
      cb -= lr * db;
      if (!Number.isFinite(cw) || Math.abs(cw) > 1e6) break;
      next.push([cw, cb]);
    }
    setPath((p) => [...p, ...next].slice(-400));
  }
  function reset(start: [number, number] = [0, 0]) {
    setPath([start]);
  }

  const S = 320, PAD = 28;
  const sx = (ww: number) => PAD + ((ww - W_MIN) / (W_MAX - W_MIN)) * (S - 2 * PAD);
  const sy = (bb: number) => S - PAD - ((bb - B_MIN) / (B_MAX - B_MIN)) * (S - 2 * PAD);
  const cell = (S - 2 * PAD) / N;
  const diverged = !Number.isFinite(loss(w, b)) || Math.abs(w) > 50;

  const fitW = 200, fitH = 160;
  const fx = (x: number) => 20 + (x / 11) * (fitW - 30);
  const fy = (y: number) => fitH - 20 - (Math.max(-5, Math.min(45, y)) / 45) * (fitH - 30);

  return (
    <div className="gd">
      <div className="explorer-head">
        <strong>Gradient descent</strong>
        <span className="muted">two parameters (w, b) · the loss surface · one learning rate</span>
      </div>

      <div className="gd-layout">
        <svg viewBox={`0 0 ${S} ${S}`} className="gd-surface" role="img" aria-label="Loss surface over w and b with the optimiser's path">
          {surface.cells.map((v, k) => {
            const i = k % N, j = Math.floor(k / N);
            return (
              <rect key={k} x={PAD + i * cell} y={S - PAD - (j + 1) * cell} width={cell + 0.5} height={cell + 0.5}
                fill={`hsl(262 60% ${88 - (v / surface.max) * 62}%)`} />
            );
          })}
          <polyline fill="none" stroke="var(--wrong)" strokeWidth={1.6} points={path.map(([pw, pb]) => `${sx(pw)},${sy(pb)}`).join(' ')} />
          {path.length > 1 && <circle cx={sx(path[0][0])} cy={sy(path[0][1])} r={4} fill="var(--wrong)" opacity={0.6} />}
          {!diverged && <circle cx={sx(w)} cy={sy(b)} r={5} fill="#fff" stroke="var(--wrong)" strokeWidth={2} />}
          <text x={S / 2} y={S - 6} fontSize={11} textAnchor="middle" fill="var(--muted)" fontFamily="var(--sans)">w (slope) →</text>
          <text x={10} y={S / 2} fontSize={11} textAnchor="middle" fill="var(--muted)" fontFamily="var(--sans)" transform={`rotate(-90 10 ${S / 2})`}>b (intercept) →</text>
        </svg>

        <div className="gd-side">
          <svg viewBox={`0 0 ${fitW} ${fitH}`} className="gd-fit" role="img" aria-label="Data points and the current line">
            {DATA.map(([x, y]) => <circle key={x} cx={fx(x)} cy={fy(y)} r={3.5} fill="var(--accent)" />)}
            {!diverged && <line x1={fx(0)} y1={fy(b)} x2={fx(11)} y2={fy(w * 11 + b)} stroke="var(--wrong)" strokeWidth={2} />}
            <text x={fitW / 2} y={fitH - 4} fontSize={10} textAnchor="middle" fill="var(--muted)" fontFamily="var(--sans)">the data and the current line</text>
          </svg>
          <dl className="gd-stats">
            <div><dt>step</dt><dd>{path.length - 1}</dd></div>
            <div><dt>w</dt><dd>{diverged ? '—' : w.toFixed(3)}</dd></div>
            <div><dt>b</dt><dd>{diverged ? '—' : b.toFixed(3)}</dd></div>
            <div><dt>loss</dt><dd>{diverged ? 'diverged' : loss(w, b).toFixed(3)}</dd></div>
          </dl>
        </div>
      </div>

      <div className="slider-grid">
        <label>
          <span>learning rate <b>{lr}</b></span>
          <input type="range" min="0.001" max="0.06" step="0.001" value={lr} onChange={(e) => setLr(Number(e.target.value))} />
        </label>
      </div>
      <div className="explorer-controls">
        <button onClick={() => step(1)} disabled={diverged}>Step</button>
        <button onClick={() => step(25)} disabled={diverged}>Step ×25</button>
        <button onClick={() => step(200)} disabled={diverged}>Step ×200</button>
        <button className="ghost button" onClick={() => reset()}>Reset</button>
        <button className="ghost button" onClick={() => reset([4.5, -3])}>Reset from a bad corner</button>
      </div>
      <p className="muted small">
        Try 0.01 (steady), 0.001 (crawls along the valley), and anything above ~0.045 (overshoots and
        diverges). The valley is long and shallow in <em>b</em> — that is why real optimisers adapt the
        step per parameter. Every model, of any size, is trained by this loop.
      </p>
    </div>
  );
}
