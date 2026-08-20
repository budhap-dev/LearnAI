import { useMemo, useState } from 'react';

/**
 * A golden set of 8 cases scored across two prompt versions, several runs each — the shape of
 * the 8.4 gate. Toggle the thresholds and watch the verdict flip; the pre-baked pass/fail
 * marks are illustrative (not a live model), so the focus stays on how a gate turns rates
 * into a ship/block decision — including a per-case regression the aggregate misses.
 */
interface Row {
  id: string;
  slice: string;
  v1: boolean[];
  v2: boolean[];
}

// Pre-baked marks: v2 fixes the refusal case (g8) but collapses a covered case (g3).
const ROWS: Row[] = [
  { id: 'g1', slice: 'billing', v1: [true, true, true], v2: [true, true, true] },
  { id: 'g2', slice: 'billing', v1: [true, true, false], v2: [true, true, true] },
  { id: 'g3', slice: 'billing', v1: [true, true, true], v2: [false, false, false] },
  { id: 'g4', slice: 'how-to', v1: [true, true, true], v2: [true, true, true] },
  { id: 'g5', slice: 'how-to', v1: [true, false, true], v2: [true, true, true] },
  { id: 'g6', slice: 'bug', v1: [true, true, true], v2: [true, true, true] },
  { id: 'g7', slice: 'product', v1: [true, true, true], v2: [true, false, true] },
  { id: 'g8', slice: 'refusal', v1: [false, false, false], v2: [true, true, true] },
];

const rate = (rows: Row[], k: 'v1' | 'v2') => {
  const all = rows.flatMap((r) => r[k]);
  return all.filter(Boolean).length / all.length;
};

export default function EvalRunner() {
  const [overallMin, setOverallMin] = useState(0.75);
  const [maxDrop, setMaxDrop] = useState(0.1);
  const [refusalMin, setRefusalMin] = useState(1);
  const [blockCollapse, setBlockCollapse] = useState(true);

  const base = useMemo(() => rate(ROWS, 'v1'), []);
  const cand = useMemo(() => rate(ROWS, 'v2'), []);
  const refusalRate = useMemo(() => {
    const r = ROWS.filter((x) => x.slice === 'refusal').flatMap((x) => x.v2);
    return r.filter(Boolean).length / r.length;
  }, []);
  const collapses = useMemo(
    () => ROWS.filter((r) => r.v1.filter(Boolean).length >= r.v1.length - 1 && r.v2.every((x) => !x)).map((r) => r.id),
    [],
  );

  const reasons: string[] = [];
  if (cand < overallMin) reasons.push(`overall ${Math.round(cand * 100)}% below floor ${Math.round(overallMin * 100)}%`);
  if (cand < base - maxDrop) reasons.push(`dropped ${Math.round((base - cand) * 100)}% vs baseline (max ${Math.round(maxDrop * 100)}%)`);
  if (refusalRate < refusalMin) reasons.push(`refusal slice ${Math.round(refusalRate * 100)}% below ${Math.round(refusalMin * 100)}%`);
  if (blockCollapse && collapses.length) reasons.push(`case collapsed: ${collapses.join(', ')}`);
  const pass = reasons.length === 0;

  const marks = (arr: boolean[]) => arr.map((p) => (p ? '+' : '−')).join('');

  return (
    <div className="eval-runner">
      <div className="explorer-head">
        <strong>Eval runner</strong>
        <span className="muted">8 golden cases × 3 runs · two prompt versions · the 8.4 gate</span>
      </div>

      <table className="eval-table">
        <thead>
          <tr><th>case</th><th>slice</th><th>v1</th><th>v2</th><th></th></tr>
        </thead>
        <tbody>
          {ROWS.map((r) => {
            const collapsed = collapses.includes(r.id);
            return (
              <tr key={r.id} className={collapsed ? 'collapsed' : ''}>
                <td><code>{r.id}</code></td>
                <td>{r.slice}</td>
                <td className="marks">{marks(r.v1)}</td>
                <td className="marks">{marks(r.v2)}</td>
                <td>{collapsed ? <span className="over">regressed</span> : r.v2.filter(Boolean).length > r.v1.filter(Boolean).length ? <span className="ok">improved</span> : ''}</td>
              </tr>
            );
          })}
          <tr className="eval-totals">
            <td colSpan={2}>overall</td>
            <td className="marks">{Math.round(base * 100)}%</td>
            <td className="marks">{Math.round(cand * 100)}%</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <div className="slider-grid">
        <label><span>overall floor <b>{Math.round(overallMin * 100)}%</b></span><input type="range" min="0" max="1" step="0.05" value={overallMin} onChange={(e) => setOverallMin(Number(e.target.value))} /></label>
        <label><span>max drop vs baseline <b>{Math.round(maxDrop * 100)}%</b></span><input type="range" min="0" max="0.5" step="0.05" value={maxDrop} onChange={(e) => setMaxDrop(Number(e.target.value))} /></label>
        <label><span>refusal slice min <b>{Math.round(refusalMin * 100)}%</b></span><input type="range" min="0" max="1" step="0.05" value={refusalMin} onChange={(e) => setRefusalMin(Number(e.target.value))} /></label>
        <label><input type="checkbox" checked={blockCollapse} onChange={(e) => setBlockCollapse(e.target.checked)} /> block any collapsed case</label>
      </div>

      <div className={`eval-verdict ${pass ? 'pass' : 'fail'}`} aria-live="polite">
        {pass ? 'PASS — merge allowed' : 'FAIL — merge blocked'}
        {reasons.map((r) => <div key={r} className="small">· {r}</div>)}
      </div>
      <p className="muted small">
        Both versions score {Math.round(base * 100)}% overall — yet v2 broke g3 (a covered billing
        question) while fixing g8 (refusal). Turn off "block collapsed case" and raise nothing else:
        the aggregate gate waves the regression through. The per-case rule is what catches it.
      </p>
    </div>
  );
}
