import { useMemo, useState } from 'react';

/**
 * One model's scores on a held-out set; one threshold slider. Watch the four counts move and
 * precision / recall trade against each other. The scores are synthetic but shaped like a
 * decent, imperfect classifier - which is every classifier.
 */
function makeScores(): [number, number][] {
  // Deterministic pseudo-random: positives cluster high, negatives low, with overlap.
  let s = 12345;
  const rnd = () => (s = (s * 48271) % 2147483647) / 2147483647;
  const rows: [number, number][] = [];
  for (let i = 0; i < 40; i++) rows.push([Math.min(0.99, Math.max(0.01, 0.68 + (rnd() - 0.5) * 0.7)), 1]);
  for (let i = 0; i < 160; i++) rows.push([Math.min(0.99, Math.max(0.01, 0.28 + (rnd() - 0.5) * 0.6)), 0]);
  return rows;
}

export default function ConfusionMatrix() {
  const [t, setT] = useState(0.5);
  const [costFp, setCostFp] = useState(1);
  const [costFn, setCostFn] = useState(10);
  const rows = useMemo(makeScores, []);

  const tp = rows.filter(([s, y]) => s >= t && y === 1).length;
  const fp = rows.filter(([s, y]) => s >= t && y === 0).length;
  const fn = rows.filter(([s, y]) => s < t && y === 1).length;
  const tn = rows.filter(([s, y]) => s < t && y === 0).length;
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  const accuracy = (tp + tn) / rows.length;
  const cost = fp * costFp + fn * costFn;

  // Curve of precision/recall over thresholds, for the little chart.
  const curve = useMemo(() => {
    const pts: { t: number; p: number; r: number; cost: number }[] = [];
    for (let th = 0.02; th <= 0.98; th += 0.02) {
      const TP = rows.filter(([s, y]) => s >= th && y === 1).length;
      const FP = rows.filter(([s, y]) => s >= th && y === 0).length;
      const FN = rows.filter(([s, y]) => s < th && y === 1).length;
      pts.push({ t: th, p: TP + FP ? TP / (TP + FP) : 1, r: TP + FN ? TP / (TP + FN) : 0, cost: FP * costFp + FN * costFn });
    }
    return pts;
  }, [rows, costFp, costFn]);
  const best = curve.reduce((b, c) => (c.cost < b.cost ? c : b), curve[0]);

  const W = 360, H = 150, PAD = 26;
  const px = (th: number) => PAD + th * (W - 2 * PAD);
  const py = (v: number) => H - PAD - v * (H - 2 * PAD);
  const maxCost = Math.max(...curve.map((c) => c.cost));

  return (
    <div className="cm">
      <div className="explorer-head">
        <strong>Confusion matrix</strong>
        <span className="muted">200 held-out rows, 40 positive · one threshold · costs are yours to set</span>
      </div>

      <div className="slider-grid">
        <label>
          <span>threshold <b>{t.toFixed(2)}</b></span>
          <input type="range" min="0.02" max="0.98" step="0.01" value={t} onChange={(e) => setT(Number(e.target.value))} />
        </label>
        <label>
          <span>cost of a false alarm (FP) <b>{costFp}</b></span>
          <input type="range" min="1" max="20" step="1" value={costFp} onChange={(e) => setCostFp(Number(e.target.value))} />
        </label>
        <label>
          <span>cost of a miss (FN) <b>{costFn}</b></span>
          <input type="range" min="1" max="20" step="1" value={costFn} onChange={(e) => setCostFn(Number(e.target.value))} />
        </label>
      </div>

      <div className="cm-layout">
        <table className="cm-table" aria-label="Confusion matrix at the current threshold">
          <thead>
            <tr><th></th><th>predicted +</th><th>predicted −</th></tr>
          </thead>
          <tbody>
            <tr><th>actual +</th><td className="cm-tp">TP {tp}</td><td className="cm-fn">FN {fn}</td></tr>
            <tr><th>actual −</th><td className="cm-fp">FP {fp}</td><td className="cm-tn">TN {tn}</td></tr>
          </tbody>
        </table>
        <dl className="gd-stats cm-stats">
          <div><dt>precision</dt><dd>{precision.toFixed(2)}</dd></div>
          <div><dt>recall</dt><dd>{recall.toFixed(2)}</dd></div>
          <div><dt>F1</dt><dd>{f1.toFixed(2)}</dd></div>
          <div><dt>accuracy</dt><dd>{accuracy.toFixed(2)}</dd></div>
          <div><dt>cost at this threshold</dt><dd>{cost}</dd></div>
          <div><dt>cheapest threshold</dt><dd>{best.t.toFixed(2)} (cost {best.cost})</dd></div>
        </dl>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="cm-chart" role="img" aria-label="Precision, recall and cost across thresholds">
        <line x1={PAD} y1={py(0)} x2={W - PAD} y2={py(0)} stroke="var(--border)" />
        <line x1={PAD} y1={py(1)} x2={PAD} y2={py(0)} stroke="var(--border)" />
        <polyline fill="none" stroke="var(--correct)" strokeWidth={1.8} points={curve.map((c) => `${px(c.t)},${py(c.p)}`).join(' ')} />
        <polyline fill="none" stroke="var(--accent)" strokeWidth={1.8} points={curve.map((c) => `${px(c.t)},${py(c.r)}`).join(' ')} />
        <polyline fill="none" stroke="var(--wrong)" strokeWidth={1.4} strokeDasharray="4 3" points={curve.map((c) => `${px(c.t)},${py(c.cost / maxCost)}`).join(' ')} />
        <line x1={px(t)} y1={py(0)} x2={px(t)} y2={py(1)} stroke="var(--text)" strokeWidth={1.2} strokeDasharray="2 3" />
        <text x={px(0.02) + 4} y={py(1) - 8} fontSize={10} fill="var(--correct)" fontFamily="var(--sans)">precision</text>
        <text x={px(0.02) + 60} y={py(1) - 8} fontSize={10} fill="var(--accent)" fontFamily="var(--sans)">recall</text>
        <text x={px(0.02) + 100} y={py(1) - 8} fontSize={10} fill="var(--wrong)" fontFamily="var(--sans)">cost (relative)</text>
        <text x={W / 2} y={H - 6} fontSize={10} textAnchor="middle" fill="var(--muted)" fontFamily="var(--sans)">threshold →</text>
      </svg>
      <p className="muted small">
        Precision and recall pull in opposite directions; the threshold is where you settle the
        argument. Set the two costs to what an error really costs your product and the cheapest
        threshold appears — that decision belongs to the people who bear the cost, not to the model.
      </p>
    </div>
  );
}
