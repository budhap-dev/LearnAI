/**
 * Lesson 10.2 - Fine-tuning mechanics (SFT and LoRA)
 *
 * Fine-tuning is Lesson 1.2's training loop, continued on your own examples. Full fine-tuning
 * updates every weight; LoRA (low-rank adaptation) freezes the base model and trains a tiny
 * add-on instead - so you get most of the benefit for a fraction of the trainable parameters,
 * and the base stays reusable across many adapters.
 *
 * This example fine-tunes a small linear layer two ways on a domain-shifted task: full (train
 * every weight) and LoRA (freeze the base, train a low-rank adapter). Deterministic gradient
 * descent - the mechanics, not a real training run.
 *
 * Run:  node m10_customising/l02_finetune.ts
 */

import { section, title } from '../src/learnai/index.ts';

// region: base
// A "pretrained" linear layer: 4 outputs from 6 inputs (a 4x6 weight matrix), frozen. In a
// real model this is one of thousands of such matrices, each far larger.
const IN = 6, OUT = 4, RANK = 2;
const W0: number[][] = Array.from({ length: OUT }, (_, i) => Array.from({ length: IN }, (_, j) => (((i * 7 + j * 3) % 11) - 5) / 10));

// The domain task: inputs -> a target the base does NOT already produce, so adaptation is needed.
const DATA: [number[], number[]][] = [
  [[1, 0, 1, 0, 1, 0], [0.9, -0.4, 0.2, 0.6]],
  [[0, 1, 0, 1, 0, 1], [-0.3, 0.7, -0.5, 0.1]],
  [[1, 1, 0, 0, 1, 1], [0.5, 0.5, -0.2, 0.4]],
  [[0, 0, 1, 1, 0, 0], [-0.6, 0.2, 0.8, -0.3]],
];
// endregion

// region: forward
function matvec(w: number[][], x: number[]): number[] {
  return w.map((row) => row.reduce((s, wij, j) => s + wij * x[j], 0));
}

function loss(weight: number[][]): number {
  let total = 0;
  for (const [x, y] of DATA) {
    const pred = matvec(weight, x);
    total += pred.reduce((s, p, k) => s + (p - y[k]) ** 2, 0);
  }
  return total / DATA.length;
}
// endregion

// region: full
/** Full fine-tuning: every weight is trainable. Trainable params = OUT * IN. */
function trainFull(steps: number, lr: number): [number[][], number] {
  const w = W0.map((row) => [...row]);
  for (let s = 0; s < steps; s++) {
    for (let i = 0; i < OUT; i++) {
      for (let j = 0; j < IN; j++) {
        let grad = 0;
        for (const [x, y] of DATA) grad += 2 * (matvec(w, x)[i] - y[i]) * x[j];
        w[i][j] -= (lr * grad) / DATA.length;
      }
    }
  }
  return [w, loss(w)];
}
// endregion

// region: lora
/**
 * LoRA: freeze W0, learn a low-rank update dW = B @ A (B is OUT x r, A is r x IN). The
 * effective weight is W0 + B@A. Trainable params = r*(OUT + IN), which for a big layer is a
 * tiny fraction of OUT*IN - and W0 is untouched, so many adapters can share one base.
 */
function trainLora(steps: number, lr: number, rank: number): [number[][], number] {
  const a: number[][] = Array.from({ length: rank }, () => Array(IN).fill(0)); // r x IN, starts at 0
  const b: number[][] = Array.from({ length: OUT }, (_, k) => Array.from({ length: rank }, (_, r) => (k === r % OUT ? 0.1 : 0))); // OUT x r

  const effective = (): number[][] =>
    Array.from({ length: OUT }, (_, i) =>
      Array.from({ length: IN }, (_, j) => W0[i][j] + Array.from({ length: rank }, (_, r) => b[i][r] * a[r][j]).reduce((s, v) => s + v, 0)),
    );

  for (let s = 0; s < steps; s++) {
    const w = effective();
    const errs = DATA.map(([x, y]) => matvec(w, x).map((p, i) => p - y[i]));
    for (let r = 0; r < rank; r++) {
      for (let j = 0; j < IN; j++) {
        let g = 0;
        for (let d = 0; d < DATA.length; d++) for (let i = 0; i < OUT; i++) g += 2 * errs[d][i] * b[i][r] * DATA[d][0][j];
        a[r][j] -= (lr * g) / DATA.length;
      }
      for (let i = 0; i < OUT; i++) {
        let g = 0;
        for (let d = 0; d < DATA.length; d++) {
          let ax = 0;
          for (let jj = 0; jj < IN; jj++) ax += a[r][jj] * DATA[d][0][jj];
          g += 2 * errs[d][i] * ax;
        }
        b[i][r] -= (lr * g) / DATA.length;
      }
    }
  }
  return [effective(), loss(effective())];
}
// endregion

function main(): void {
  section('before');
  title('The frozen base does not solve the domain task');
  console.log(`  base model: ${OUT}x${IN} = ${OUT * IN} weights,  loss on the domain data = ${loss(W0).toFixed(3)}`);

  section('full');
  title('Full fine-tuning: train every weight');
  const [, fullLoss] = trainFull(400, 0.1);
  console.log(`  trainable params = ${String(OUT * IN).padEnd(4)} (every weight)   final loss = ${fullLoss.toFixed(3)}`);

  section('lora');
  title('LoRA: freeze the base, train a low-rank adapter');
  const [, loraLoss] = trainLora(400, 0.1, RANK);
  const loraParams = RANK * (OUT + IN);
  console.log(`  trainable params = ${String(loraParams).padEnd(4)} (rank ${RANK} adapter)  final loss = ${loraLoss.toFixed(3)}`);
  console.log(`  the base's ${OUT * IN} weights were never touched - the adapter is a separate, swappable file`);
  console.log(`  (rank ${RANK} nearly matches full fine-tuning here; a higher rank closes the gap at more params)`);

  section('scale');
  title('Why LoRA matters at real model sizes');
  for (const d of [1024, 4096]) {
    const full = d * d;
    const lora = 8 * (d + d); // rank 8
    const c = (n: number, w: number) => n.toLocaleString('en-US').padStart(w);
    console.log(`  a ${d}x${d} layer: full = ${c(full, 12)}   LoRA r=8 = ${c(lora, 9)}   (${String(Math.floor(full / lora)).padStart(4)}x fewer trainable)`);
  }
  console.log('  a real model has hundreds of such layers; LoRA turns a GPU-cluster job into a single-GPU one');

  section('rules');
  title('SFT and LoRA in practice');
  console.log('data format: (prompt, ideal completion) pairs - quality and consistency beat quantity');
  console.log('full fine-tune: best fit, but trains and stores a whole model copy per task');
  console.log('LoRA/PEFT: near-equal quality at an adequate rank, tiny adapters you can store many of and swap');
  console.log('overfitting is the risk: too many epochs on too little data memorises - hold out an eval set (3.3)');
  console.log('fine-tune for BEHAVIOUR (format, tone, domain); for FACTS, retrieve (6.1, 10.1)');
}

main();
