/**
 * Lesson 3.2 - Regression and classification
 *
 * Two classic models built from scratch, on the same tiny dataset, so you can see what a
 * "classifier" actually is: a function from features to a score, learned from labelled rows.
 *
 *   - logistic regression: a weighted sum pushed through a squashing function; the workhorse
 *     for "probability that X" - trained by the same gradient descent as Lesson 1.2
 *   - a decision stump: the smallest decision tree - one question, two answers; the unit that
 *     gradient-boosted trees stack thousands of
 *
 * Neither needs a framework to understand. In practice you would use scikit-learn or a
 * boosting library, and the concepts carry over unchanged.
 *
 * Run:  node m03_classic_ml/l02_classifiers.ts
 */

import { section, title } from '../src/learnai/index.ts';

type Row = [[number, number], number];

// region: data
// Rows: (requests per minute, error rate %) -> is this service instance unhealthy? (1 = yes)
// Deliberately small so the model is inspectable; the shape is what matters.
const ROWS: Row[] = [
  [[120, 0.5], 0], [[150, 0.8], 0], [[90, 0.2], 0], [[200, 1.0], 0], [[110, 0.4], 0],
  [[300, 2.5], 1], [[320, 4.0], 1], [[250, 3.1], 1], [[280, 1.9], 1], [[400, 5.2], 1],
  [[180, 2.8], 1], [[210, 0.6], 0], [[230, 1.4], 1], [[260, 1.2], 0], [[170, 1.6], 0],
  [[240, 1.7], 1],
];
// endregion

// region: features
/**
 * Scale the raw columns to similar ranges. Models learn faster and weights become
 * comparable when features are on the same scale - the first thing every pipeline does.
 */
function features([rpm, err]: [number, number]): number[] {
  return [rpm / 400.0, err / 5.0];
}
// endregion

// region: logistic
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/**
 * Logistic regression: a weighted sum, squashed into (0, 1). The output is a *score* you
 * can read as a probability - which is why it is the default first classifier.
 */
function predictProba(feats: number[], w: number[], b: number): number {
  return sigmoid(feats.reduce((s, xi, i) => s + w[i] * xi, 0) + b);
}

/** Gradient descent on log-loss - the same loop as Lesson 1.2 with a different loss. */
function trainLogistic(rows: Row[], steps = 3000, lr = 0.5): [number[], number] {
  let w = [0, 0];
  let b = 0;
  const n = rows.length;
  for (let s = 0; s < steps; s++) {
    let gw = [0, 0];
    let gb = 0;
    for (const [x, y] of rows) {
      const f = features(x);
      const err = predictProba(f, w, b) - y; // derivative of log-loss wrt the score
      gw = gw.map((g, i) => g + err * f[i]);
      gb += err;
    }
    w = w.map((wi, i) => wi - (lr * gw[i]) / n);
    b -= (lr * gb) / n;
  }
  return [w, b];
}
// endregion

type Stump = [number, number, number, number]; // feature, threshold, leftLabel, rightLabel

// region: stump
/**
 * The smallest decision tree: try every (feature, threshold) split, keep the one that
 * separates the labels best. Trees ask questions; boosting stacks thousands of stumps,
 * each correcting the last - which is why boosted trees dominate on tabular data.
 */
function trainStump(rows: Row[]): Stump {
  let best: [number, ...Stump] | null = null;
  for (const feature of [0, 1] as const) {
    const values = [...new Set(rows.map(([x]) => x[feature]))].sort((a, b) => a - b);
    for (let i = 0; i + 1 < values.length; i++) {
      const threshold = (values[i] + values[i + 1]) / 2;
      const left = rows.filter(([x]) => x[feature] <= threshold).map(([, y]) => y);
      const right = rows.filter(([x]) => x[feature] > threshold).map(([, y]) => y);
      // majority label on each side; error = rows on the wrong side of their majority
      const sum = (ys: number[]) => ys.reduce((a, b) => a + b, 0);
      const lLabel = sum(left) * 2 > left.length ? 1 : 0;
      const rLabel = sum(right) * 2 > right.length ? 1 : 0;
      const errors = left.filter((y) => y !== lLabel).length + right.filter((y) => y !== rLabel).length;
      if (best === null || errors < best[0]) best = [errors, feature, threshold, lLabel, rLabel];
    }
  }
  const [, feature, threshold, lLabel, rLabel] = best!;
  return [feature, threshold, lLabel, rLabel];
}

function stumpPredict(x: [number, number], [feature, threshold, lLabel, rLabel]: Stump): number {
  return x[feature] <= threshold ? lLabel : rLabel;
}
// endregion

const signed = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2);

function main(): void {
  section('logistic');
  title('Logistic regression: learned weights, and a score per row');
  const [w, b] = trainLogistic(ROWS);
  console.log(`weights: rpm ${signed(w[0])}  error-rate ${signed(w[1])}  bias ${signed(b)}`);
  console.log('  rpm  err%   p(unhealthy)  label');
  for (const [x, y] of ROWS) {
    const p = predictProba(features(x), w, b);
    console.log(`  ${String(x[0]).padStart(3)}  ${x[1].toFixed(1).padStart(4)}     ${p.toFixed(2)}          ${y}`);
  }

  section('threshold');
  title('A score becomes a decision only when you choose a threshold');
  for (const t of [0.3, 0.5, 0.7]) {
    const flagged = ROWS.filter(([x]) => predictProba(features(x), w, b) >= t).length;
    const wrong = ROWS.filter(([x, y]) => (predictProba(features(x), w, b) >= t) !== Boolean(y)).length;
    console.log(`  threshold ${t}: flags ${String(flagged).padStart(2)} of ${ROWS.length}, ${wrong} wrong`);
  }
  console.log('Lower threshold = catch more, false alarms up. The right value is a product decision (Lesson 3.3).');

  section('stump');
  title('A decision stump: one question');
  const stump = trainStump(ROWS);
  const name = ['rpm', 'error rate'][stump[0]];
  console.log(`if ${name} <= ${stump[1].toFixed(2)} then ${stump[2]} else ${stump[3]}`);
  const wrong = ROWS.filter(([x, y]) => stumpPredict(x, stump) !== y).length;
  console.log(`  ${wrong} of ${ROWS.length} wrong on the training rows`);
  console.log('A real tree keeps asking; a boosted ensemble asks thousands of small questions in turn.');

  section('new-rows');
  title('Inference: both models score rows they never saw');
  for (const x of [[160, 0.7], [260, 2.2], [500, 0.3]] as [number, number][]) {
    const p = predictProba(features(x), w, b);
    const s = stumpPredict(x, stump);
    console.log(`  rpm ${String(x[0]).padStart(3)}, err ${x[1].toFixed(1).padStart(3)}%  ->  logistic p=${p.toFixed(2)}   stump=${s}`);
  }
  console.log('(500, 0.3) is unlike anything in training - both models answer anyway. See Lesson 3.3.');
}

main();
