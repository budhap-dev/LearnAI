/**
 * Lesson 3.5 - Feature pipelines and serving
 *
 * A trained model is not a service. Between "the notebook says AUC 0.9" and "it answers
 * requests at 3am" sit four things this example does in miniature:
 *
 *   1. a *pipeline* - the same feature preparation at training time and at request time
 *   2. an *artefact* - the fitted numbers serialised with a version, so serving loads exactly
 *      what was evaluated
 *   3. *serving* - load once, predict per request, log what you predicted
 *   4. *monitoring* - notice when the incoming data no longer looks like the training data (drift)
 *
 * Run:  node m03_classic_ml/l05_pipeline.ts
 */

import { section, title } from '../src/learnai/index.ts';

type X = [number, number, number]; // amount, minutes since last payment, is new device
type Row = [X, number];

// region: data
// (payment amount, minutes since last payment, is new device) -> flagged for review?
const TRAIN: Row[] = [
  [[20.0, 1440, 0], 0], [[35.5, 720, 0], 0], [[12.0, 60, 0], 0], [[250.0, 30, 1], 1],
  [[980.0, 5, 1], 1], [[45.0, 300, 0], 0], [[610.0, 2, 1], 1], [[15.0, 2000, 0], 0],
  [[330.0, 15, 0], 1], [[70.0, 90, 1], 0], [[1200.0, 1, 1], 1], [[28.0, 500, 0], 0],
];
// endregion

// region: pipeline
/**
 * Fit on training data, apply everywhere else - with the *training* statistics.
 * Fitting a scaler on request data would make every request look 'average'.
 */
class Scaler {
  mean: number[] = [];
  sd: number[] = [];

  fit(rows: number[][]): Scaler {
    const cols = rows[0].map((_, j) => rows.map((r) => r[j]));
    this.mean = cols.map((c) => c.reduce((a, b) => a + b, 0) / c.length);
    this.sd = cols.map((c, j) => Math.sqrt(c.reduce((s, v) => s + (v - this.mean[j]) ** 2, 0) / c.length) || 1);
    return this;
  }

  transform(x: number[]): number[] {
    return x.map((v, j) => (v - this.mean[j]) / this.sd[j]);
  }
}

/**
 * Feature engineering lives in ONE function used by both training and serving.
 * log-amount because money is skewed; the rest as-is.
 */
function rawFeatures([amount, minutes, newDevice]: X): number[] {
  return [Math.log10(amount + 1), Math.log10(minutes + 1), newDevice];
}
// endregion

interface Artefact {
  version: string;
  features: string[];
  scaler: { mean: number[]; sd: number[] };
  weights: number[];
  bias: number;
  threshold: number;
}

// region: train
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/**
 * Fit scaler, then logistic regression (Lesson 3.2). Return an *artefact*: everything
 * serving needs, as plain data, with a version. No code objects, no pickles of surprises.
 */
function train(rows: Row[], steps = 2000, lr = 0.3): Artefact {
  const scaler = new Scaler().fit(rows.map(([x]) => rawFeatures(x)));
  const feats = rows.map(([x]) => scaler.transform(rawFeatures(x)));
  let w = [0, 0, 0];
  let b = 0;
  for (let s = 0; s < steps; s++) {
    let gw = [0, 0, 0];
    let gb = 0;
    feats.forEach((f, i) => {
      const err = sigmoid(f.reduce((acc, xi, j) => acc + w[j] * xi, 0) + b) - rows[i][1];
      gw = gw.map((g, j) => g + err * f[j]);
      gb += err;
    });
    w = w.map((wi, j) => wi - (lr * gw[j]) / rows.length);
    b -= (lr * gb) / rows.length;
  }
  return {
    version: 'review-model@2026-08-18.1',
    features: ['log10_amount', 'log10_minutes_since', 'new_device'],
    scaler: { mean: scaler.mean, sd: scaler.sd },
    weights: w,
    bias: b,
    threshold: 0.5,
  };
}
// endregion

// region: serve
/** What runs in the service: load the artefact once, predict per request, log. */
class Model {
  version: string;
  scaler = new Scaler();
  w: number[];
  b: number;
  threshold: number;

  constructor(artefactJson: string) {
    const a = JSON.parse(artefactJson) as Artefact;
    this.version = a.version;
    this.scaler.mean = a.scaler.mean;
    this.scaler.sd = a.scaler.sd;
    this.w = a.weights;
    this.b = a.bias;
    this.threshold = a.threshold;
  }

  predict(x: X): { score: number; review: boolean; model: string } {
    const f = this.scaler.transform(rawFeatures(x));
    const p = sigmoid(f.reduce((acc, xi, j) => acc + this.w[j] * xi, 0) + this.b);
    return { score: p, review: p >= this.threshold, model: this.version };
  }
}
// endregion

// region: drift
/**
 * Compare recent inputs with the training distribution: how many training standard
 * deviations has each feature's mean moved? > 1 is worth an alert; the model was not
 * trained on this world.
 */
function drift(scaler: Scaler, recent: number[][]): number[] {
  const cols = recent[0].map((_, j) => recent.map((r) => r[j]));
  return cols.map((c, j) => (c.reduce((a, b) => a + b, 0) / c.length - scaler.mean[j]) / scaler.sd[j]);
}
// endregion

const signed = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2);

function main(): void {
  section('artefact');
  title('Training produces an artefact: numbers plus a version, nothing else');
  const artefact = train(TRAIN);
  const blob = JSON.stringify(artefact);
  console.log(`${artefact.version}  (a small JSON document with ${Object.keys(artefact).length} keys)`);
  console.log('features:', artefact.features.join(', '));
  console.log('weights: ', artefact.weights.map(signed).join(', '), ` bias ${signed(artefact.bias)}`);

  section('serve');
  title('Serving loads the artefact and applies the SAME pipeline per request');
  const model = new Model(blob);
  for (const x of [[18.0, 900, 0], [450.0, 4, 1], [95.0, 40, 1]] as X[]) {
    const r = model.predict(x);
    console.log(`  amount ${x[0].toFixed(1).padStart(6)}  minutes ${String(x[1]).padStart(4)}  new_device ${x[2]}  ->  score ${r.score.toFixed(3)}  review=${r.review}  (${r.model})`);
  }
  console.log('Every prediction is logged with the model version, so a bad decision can be traced');
  console.log('to the exact artefact - and the artefact can be rolled back like any deploy.');

  section('drift');
  title("Monitoring: does today's traffic still look like the training data?");
  const scaler = new Scaler();
  scaler.mean = artefact.scaler.mean;
  scaler.sd = artefact.scaler.sd;
  const normalDay = ([[22.0, 800, 0], [40.0, 400, 0], [300.0, 20, 1], [15.0, 1500, 0]] as X[]).map(rawFeatures);
  const oddDay = ([[2200.0, 3, 1], [1800.0, 2, 1], [2500.0, 1, 1], [1900.0, 4, 1]] as X[]).map(rawFeatures);
  for (const [label, day] of [['normal day', normalDay], ['odd day   ', oddDay]] as [string, number[][]][]) {
    const shifts = drift(scaler, day);
    const flag = shifts.some((s) => Math.abs(s) > 1) ? '  <- ALERT: inputs no longer look like training data' : '';
    console.log(`  ${label}: feature-mean shift (in training SDs) = ${shifts.map(signed).join(', ')}${flag}`);
  }
  console.log('Drift does not say the model is wrong; it says you can no longer assume it is right.');
  console.log('Retrain, re-evaluate on fresh labels, and redeploy - the same loop as any release.');
}

main();
