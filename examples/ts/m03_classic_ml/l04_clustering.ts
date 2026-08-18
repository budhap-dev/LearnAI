/**
 * Lesson 3.4 - Clustering and anomaly detection
 *
 * No labels, just rows. Two questions you can still answer:
 *   - "what groups are in here?"       -> clustering (k-means, from scratch)
 *   - "which rows are unlike the rest?" -> anomaly detection (a z-score, the simplest kind)
 *
 * Both show up constantly in ordinary systems - ticket themes, user segments, weird
 * transactions, misbehaving hosts - and neither needs an LLM.
 *
 * Run:  node m03_classic_ml/l04_clustering.ts
 */

import { section, title } from '../src/learnai/index.ts';

type P = [number, number];

// region: data
// Per-host metrics: (cpu %, p95 latency ms). Three kinds of host are hiding in here,
// plus one that is just wrong. Nobody labelled anything.
const HOSTS: P[] = [
  [12, 40], [15, 45], [10, 38], [18, 50], [14, 42],          // idle-ish
  [55, 120], [60, 130], [52, 115], [58, 125], [63, 140],     // busy
  [85, 300], [90, 320], [88, 310], [92, 340],                // saturated
  [20, 900],                                                 // ??? low cpu, huge latency
];
// endregion

// region: kmeans
const dist = (a: P, b: P) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);

/**
 * Pick k starting centres, then repeat: assign each point to its nearest centre, move each
 * centre to the mean of its points. It converges in a few steps and finds *some* grouping -
 * which one depends on k and the start, so always look at the result.
 */
function kmeans(points: P[], k: number, steps = 10): [P[], P[][]] {
  let centres: P[] = Array.from({ length: k }, (_, i) => points[Math.floor((i * points.length) / k)]); // deterministic start
  let groups: P[][] = [];
  for (let s = 0; s < steps; s++) {
    groups = Array.from({ length: k }, () => []);
    for (const p of points) {
      let nearest = 0;
      for (let i = 1; i < k; i++) if (dist(p, centres[i]) < dist(p, centres[nearest])) nearest = i;
      groups[nearest].push(p);
    }
    centres = groups.map((g, i) =>
      g.length ? [g.reduce((s, p) => s + p[0], 0) / g.length, g.reduce((s, p) => s + p[1], 0) / g.length] : centres[i],
    );
  }
  return [centres, groups];
}
// endregion

// region: anomaly
/**
 * How many standard deviations from the mean each value is. |z| > 3 is the classic
 * 'this is not normal' line - crude, explainable, and often all you need.
 */
function zScores(values: number[]): number[] {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length) || 1;
  return values.map((v) => (v - mean) / sd);
}
// endregion

const signed = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2);

function main(): void {
  section('kmeans');
  title('k-means: find k groups without being told what they are');
  for (const k of [2, 3]) {
    const [centres, groups] = kmeans(HOSTS, k);
    console.log(`k = ${k}:`);
    const rows = centres.map((c, i) => ({ c, g: groups[i] })).sort((a, b) => a.c[0] - b.c[0]);
    for (const { c, g } of rows) {
      console.log(`  centre cpu ${c[0].toFixed(1).padStart(5)}%, p95 ${c[1].toFixed(1).padStart(6)}ms  <- ${g.length} hosts`);
    }
  }
  console.log('k is yours to choose - the algorithm will happily split 3 kinds into 2 or 4.');
  console.log('Look at the groups and name them; if you cannot, the clustering is not useful yet.');

  section('anomaly');
  title('Anomaly detection: which rows do not belong?');
  const zs = zScores(HOSTS.map((h) => h[1]));
  HOSTS.forEach((h, i) => {
    const flag = Math.abs(zs[i]) > 2.5 ? '  <- anomaly' : '';
    console.log(`  cpu ${String(h[0]).padStart(2)}%, p95 ${String(h[1]).padStart(4)}ms  z = ${signed(zs[i])}${flag}`);
  });
  console.log('The (20, 900) host is 3+ standard deviations out. z-scores need a roughly bell-shaped');
  console.log('baseline; for anything else use isolation forests, robust stats or a learned model.');

  section('scale');
  title('Scale your features first - k-means uses distance');
  const [, groups] = kmeans(HOSTS, 3);
  const sizes = groups.map((g) => g.length).join('/');
  console.log(`raw units:  latency spans ~860, cpu spans ~80 -> distance is almost all latency; group sizes ${sizes}`);
  const scaled: P[] = HOSTS.map(([c, l]) => [c / 100, l / 1000]);
  const [, groupsScaled] = kmeans(scaled, 3);
  const sizesScaled = groupsScaled.map((g) => g.length).join('/');
  console.log(`scaled 0-1: both features count                                            -> group sizes ${sizesScaled}`);
  console.log("Different groups from the same data. Neither is 'right' - the scaling decides what");
  console.log("'close' means, so choose it on purpose (Lesson 3.2) before any distance-based method.");
}

main();
