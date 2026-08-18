/**
 * Lesson 3.3 - Evaluating a model
 *
 * A model gives every row a score. Evaluation answers two questions engineers keep merging:
 *   1. does the score rank things well? (independent of any threshold)
 *   2. at the threshold we will actually deploy, what happens? (precision, recall, false alarms)
 *
 * Everything here is computed on a HELD-OUT set - rows the model never trained on. Accuracy
 * on training rows is a vanity metric; the point of a model is behaviour on rows it has not
 * seen.
 *
 * Run:  node m03_classic_ml/l03_evaluation.ts
 */

import { section, title } from '../src/learnai/index.ts';

type Scored = [number, number]; // (score, true label)

// region: heldout
// (score the model gave, true label). Imagine a fraud model scoring 20 held-out transactions.
// 6 are truly fraud (1). Notice the model is decent, not perfect - like every real model.
const HELDOUT: Scored[] = [
  [0.96, 1], [0.91, 1], [0.88, 0], [0.85, 1], [0.77, 1], [0.71, 0], [0.66, 1],
  [0.60, 0], [0.55, 0], [0.49, 1], [0.42, 0], [0.38, 0], [0.31, 0], [0.27, 0],
  [0.22, 0], [0.18, 0], [0.15, 0], [0.11, 0], [0.07, 0], [0.03, 0],
];
// endregion

// region: confusion
/** Count the four outcomes at one threshold. Every metric below is arithmetic on these. */
function confusion(rows: Scored[], threshold: number): [number, number, number, number] {
  const tp = rows.filter(([s, y]) => s >= threshold && y === 1).length;
  const fp = rows.filter(([s, y]) => s >= threshold && y === 0).length;
  const fn = rows.filter(([s, y]) => s < threshold && y === 1).length;
  const tn = rows.filter(([s, y]) => s < threshold && y === 0).length;
  return [tp, fp, fn, tn];
}

/**
 * precision: of what we flagged, how much was real?  recall: of the real, how much did we catch?
 * F1 balances them. Accuracy is last for a reason: with 14 negatives out of 20, "always no"
 * scores 70% and catches nothing.
 */
function metrics(tp: number, fp: number, fn: number, tn: number) {
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  const accuracy = (tp + tn) / (tp + fp + fn + tn);
  return { precision, recall, f1, accuracy };
}
// endregion

// region: auc
/**
 * Area under the ROC curve = probability a random positive scores above a random negative.
 * Threshold-free: it measures ranking quality, which is what you compare models on before
 * anyone has chosen a threshold. 0.5 is coin-flip, 1.0 is perfect separation.
 */
function auc(rows: Scored[]): number {
  const pos = rows.filter(([, y]) => y === 1).map(([s]) => s);
  const neg = rows.filter(([, y]) => y === 0).map(([s]) => s);
  let wins = 0;
  for (const p of pos) for (const n of neg) wins += p > n ? 1 : p === n ? 0.5 : 0;
  return wins / (pos.length * neg.length);
}
// endregion

function main(): void {
  section('baseline');
  title('First, the baseline every model must beat');
  const positives = HELDOUT.reduce((s, [, y]) => s + y, 0);
  console.log(`${HELDOUT.length} held-out rows, ${positives} positive`);
  const acc0 = Math.round(((HELDOUT.length - positives) / HELDOUT.length) * 100);
  console.log(`'always predict 0' accuracy = ${acc0}%  -  and recall = 0%`);
  console.log("Accuracy alone would call that model 'good'. It is useless.");

  section('threshold-sweep');
  title('The same scores, different thresholds, different products');
  console.log('  thr   TP FP FN TN   precision recall  F1   accuracy');
  for (const t of [0.9, 0.7, 0.5, 0.3, 0.1]) {
    const [tp, fp, fn, tn] = confusion(HELDOUT, t);
    const m = metrics(tp, fp, fn, tn);
    const p2 = (n: number) => String(n).padStart(2);
    console.log(`  ${t.toFixed(1)}   ${p2(tp)} ${p2(fp)} ${p2(fn)} ${p2(tn)}     ${m.precision.toFixed(2)}    ${m.recall.toFixed(2)}  ${m.f1.toFixed(2)}   ${m.accuracy.toFixed(2)}`);
  }
  console.log('High threshold: few false alarms, misses fraud. Low: catches fraud, floods reviewers.');
  console.log('Nothing in the model picks the row - the cost of each error type does.');

  section('auc');
  title('Threshold-free: how well does the model rank?');
  console.log(`AUC = ${auc(HELDOUT).toFixed(3)}   (0.5 = random, 1.0 = perfect)`);
  console.log('Compare models on AUC (or precision-recall AUC when positives are rare); pick the');
  console.log('threshold afterwards from the sweep, with the people who bear the cost of each error.');

  section('leakage');
  title("Why 'held-out' is not optional");
  const trainScores: Scored[] = HELDOUT.map(([s, y]) => [Math.min(1, s + 0.05 * y), y]); // imagine the model saw these
  console.log(`same model, scored on rows it trained on:   AUC = ${auc(trainScores).toFixed(3)}`);
  console.log(`scored on rows it never saw (the real test): AUC = ${auc(HELDOUT).toFixed(3)}`);
  console.log('Training-set numbers flatter every model. Split first, evaluate on what was held out,');
  console.log('and never let information from the test rows leak into training or feature building.');
}

main();
