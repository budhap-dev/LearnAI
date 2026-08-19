import { useMemo, useState } from 'react';
import data from '../../data/hybrid-search.json';

/**
 * Keyword (BM25) vs meaning (vectors) vs fused (RRF) over the 12-article handbook. BM25 and
 * RRF run live in the browser; the cosine scores are real - exported from the embeddings
 * recorded for Lesson 6.4 - so the vector column is what the model actually thought.
 */
const STOP = new Set('a an the of for to in on at by with and or is are be do does what how i we you your our it its this that can my'.split(' '));
const tokens = (t: string) => (t.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((x) => !STOP.has(x));

const DOCS = data.docs as { id: string; title: string; text: string }[];
const QUERIES = data.queries as { q: string; cosine: number[] }[];
const TOKENS = DOCS.map((d) => tokens(`${d.title} ${d.text}`));
const AVG = TOKENS.reduce((s, d) => s + d.length, 0) / TOKENS.length;
const DF = new Map<string, number>();
for (const d of TOKENS) for (const t of new Set(d)) DF.set(t, (DF.get(t) ?? 0) + 1);
const IDF = new Map([...DF].map(([t, f]) => [t, Math.log(1 + (DOCS.length - f + 0.5) / (f + 0.5))]));

function bm25(query: string, i: number, k1 = 1.5, b = 0.75): number {
  const tf = new Map<string, number>();
  for (const t of TOKENS[i]) tf.set(t, (tf.get(t) ?? 0) + 1);
  let s = 0;
  for (const t of tokens(query)) {
    const f = tf.get(t);
    if (!f) continue;
    s += IDF.get(t)! * (f * (k1 + 1)) / (f + k1 * (1 - b + (b * TOKENS[i].length) / AVG));
  }
  return s;
}

export default function HybridSearch() {
  const [qi, setQi] = useState(0);
  const [k, setK] = useState(60);
  const query = QUERIES[qi];

  const { kw, vec, fused } = useMemo(() => {
    const kwScores = DOCS.map((_, i) => [i, bm25(query.q, i)] as [number, number]).sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    const vecScores = DOCS.map((_, i) => [i, query.cosine[i]] as [number, number]).sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    const f = new Map<number, number>();
    [kwScores, vecScores].forEach((list) => list.forEach(([i], r) => f.set(i, (f.get(i) ?? 0) + 1 / (k + r + 1))));
    const fusedList = [...f].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    return { kw: kwScores, vec: vecScores, fused: fusedList };
  }, [query, k]);

  const col = (title: string, rows: [number, number][], fmt: (x: number) => string) => (
    <div className="hs-col">
      <h4>{title}</h4>
      <ol>
        {rows.slice(0, 5).map(([i, s]) => (
          <li key={i}><span className="hs-id">{DOCS[i].id}</span><span className="dist-n">{fmt(s)}</span></li>
        ))}
      </ol>
    </div>
  );

  return (
    <div className="hybrid-search">
      <div className="explorer-head">
        <strong>Hybrid search</strong>
        <span className="muted">BM25 and RRF live in the browser · cosine scores are real, from the 6.4 recording</span>
      </div>
      <div className="sample-row" role="group" aria-label="Queries">
        {QUERIES.map((q, i) => (
          <button key={q.q} className={`chip ${i === qi ? 'active' : ''}`} onClick={() => setQi(i)}>{q.q}</button>
        ))}
      </div>
      <div className="hs-cols">
        {col('keywords (BM25)', kw, (x) => x.toFixed(2))}
        {col('meaning (cosine)', vec, (x) => x.toFixed(3))}
        {col('fused (RRF)', fused, (x) => x.toFixed(4))}
      </div>
      <div className="slider-grid">
        <label><span>RRF k <b>{k}</b> (higher = ranks matter more evenly; 60 is the usual default)</span><input type="range" min="1" max="100" step="1" value={k} onChange={(e) => setK(Number(e.target.value))} /></label>
      </div>
      <p className="muted small">
        Try "HTTP 429" (the exact token wins), "money back" (meaning wins; BM25 has no "refund"),
        "SCIM" (jargon the embedding barely knows). Fusion rarely beats the better list on its own
        query — its value is never being the worse one. Real systems add metadata filters and a
        reranker (6.5) on top.
      </p>
    </div>
  );
}
