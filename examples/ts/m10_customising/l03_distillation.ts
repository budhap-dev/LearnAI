/**
 * Lesson 10.3 - Distillation and small models
 *
 * Distillation trains a small "student" model to imitate a large "teacher" on your task. You
 * run the expensive teacher once to label a pile of examples, then train the cheap student on
 * those labels. The student ends up nearly as good as the teacher on that one task, at a
 * fraction of the cost and latency - which is why a fine-tuned small model can beat a general
 * large one on a hot path (Lesson 9.4).
 *
 * This example distils a simple teacher into a tiny student and shows the student closing the
 * gap. Deterministic; the "teacher" is a fixed function so the student has a stable target.
 *
 * Run:  node m10_customising/l03_distillation.ts
 */

import { section, title } from '../src/learnai/index.ts';

// region: teacher
// The teacher: an accurate but "expensive" scoring function over 4 features. Think of it as a
// large model that classifies support tickets; we only get to see its labels, not its weights.
function teacher(x: number[]): number {
  return Math.max(0, Math.min(1, 0.6 * x[0] - 0.5 * x[1] + 0.9 * x[2] * x[3] + 0.1));
}

// A pile of unlabelled inputs (deterministic pseudo-data), which the teacher will label.
function inputs(n: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < n; i++) out.push([((i * 3) % 5) / 4, ((i * 7) % 5) / 4, ((i * 2) % 5) / 4, ((i * 5) % 5) / 4]);
  return out;
}
// endregion

// region: student
// The student: a tiny linear model (4 weights + bias) - cheap to run, cheap to train.
function studentPredict(w: number[], x: number[]): number {
  return Math.max(0, Math.min(1, w[0] * x[0] + w[1] * x[1] + w[2] * x[2] + w[3] * x[3] + w[4]));
}

/**
 * Train the student to match the TEACHER'S labels - not ground truth, the teacher's output.
 * That is distillation: the student learns to imitate the teacher on your data.
 */
function trainStudent(data: [number[], number][], steps: number, lr: number): number[] {
  const w = [0, 0, 0, 0, 0];
  for (let s = 0; s < steps; s++) {
    for (const [x, target] of data) {
      const err = studentPredict(w, x) - target;
      for (let k = 0; k < 4; k++) w[k] -= lr * 2 * err * x[k];
      w[4] -= lr * 2 * err;
    }
  }
  return w;
}
// endregion

/**
 * How often the student's answer is within 0.1 of the teacher's - the metric that matters for
 * distillation: not 'is the student right in the abstract' but 'does it match the teacher'.
 */
function agreement(w: number[], xs: number[][]): number {
  const close = xs.filter((x) => Math.abs(studentPredict(w, x) - teacher(x)) <= 0.1).length;
  return close / xs.length;
}

function main(): void {
  const trainXs = inputs(60);
  const testXs = inputs(200).slice(60); // held out: never seen in training
  const labelled: [number[], number][] = trainXs.map((x) => [x, teacher(x)]); // the teacher labels the training pile
  const pct = (x: number) => `${Math.round(x * 100)}%`;

  section('label');
  title('Step 1: run the expensive teacher once to label the data');
  const pyf = (v: number) => (Number.isInteger(v) ? `${v}.0` : String(v)); // Python prints 0.0/1.0
  for (const x of trainXs.slice(0, 4)) console.log(`  teacher([${x.map(pyf).join(', ')}]) = ${teacher(x).toFixed(3)}`);
  console.log(`  ... ${labelled.length} examples labelled by the teacher (a one-time cost)`);

  section('distil');
  title('Step 2: train the tiny student to imitate those labels');
  const w0 = [0, 0, 0, 0, 0];
  console.log(`  before training: student agrees with teacher ${pct(agreement(w0, testXs))} of the time (held-out)`);
  const w = trainStudent(labelled, 300, 0.1);
  console.log(`  after distillation: student agrees ${pct(agreement(w, testXs))} of the time (held-out)`);
  console.log(`  learned student weights: [${w.map((v) => pyf(Math.round(v * 100) / 100)).join(", ")}]`);

  section('economics');
  title('Why this pays: the student is cheap, the teacher was one-time');
  console.log('  teacher: large model, high $/call, high latency  - run ONCE per training example');
  console.log('  student: 5 parameters, runs in microseconds       - runs on EVERY production request');
  for (const volume of [10_000, 1_000_000]) {
    console.log(`  at ${volume.toLocaleString('en-US').padStart(9)} requests/day: the student serves them all; the teacher labelled a few thousand, once`);
  }

  section('when');
  title('When to distil, and its limits');
  console.log('distil a HIGH-VOLUME, STABLE task where a small model can match the teacher\'s judgement');
  console.log('the student is only as good as the teacher\'s labels - and only on the distribution you labelled');
  console.log('it does not generalise beyond that task: a distilled ticket-classifier is not a chatbot');
  console.log('measure agreement on a HELD-OUT set (3.3); re-distil when the task or the teacher changes');
  console.log('distillation and LoRA compose: distil onto a small base, then LoRA-adapt per sub-task');
}

main();
