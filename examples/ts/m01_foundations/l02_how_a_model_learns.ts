/**
 * Lesson 1.2 - How a model learns
 *
 * "Training" is not magic and it is not programming. It is: guess some numbers, measure how
 * wrong they are on known examples, nudge the numbers to be less wrong, repeat. Every model
 * from a two-parameter line to a trillion-parameter LLM learns this way - the loop is the
 * same; only the size of the model and the shape of the "wrongness" differ.
 *
 * This example fits a straight line to a handful of points using gradient descent, then uses
 * the fitted line to predict - so training and inference are visibly two different things.
 *
 * Run:  node m01_foundations/l02_how_a_model_learns.ts
 */

import { section, title } from '../src/learnai/index.ts';

// region: data
// Known examples: (input, correct output). Here: response time in ms for a payload size in KB.
// In an LLM the "input" is the text so far and the "correct output" is the actual next token;
// the idea is identical.
const DATA: [number, number][] = [[1, 12.0], [2, 14.5], [3, 16.0], [4, 19.0], [5, 20.5], [6, 23.0], [8, 27.0], [10, 32.0]];
// endregion

// region: model
/**
 * The model: two parameters, w and b. That is all a model is - a function with numbers in
 * it that training will choose. Bigger models just have more numbers.
 */
function predict(x: number, w: number, b: number): number {
  return w * x + b;
}
// endregion

// region: loss
/**
 * How wrong is the model on the known examples? Mean squared error: average of the squared
 * gaps between prediction and truth. Training exists to make this small.
 */
function loss(w: number, b: number): number {
  return DATA.reduce((s, [x, y]) => s + (predict(x, w, b) - y) ** 2, 0) / DATA.length;
}
// endregion

// region: gradient
/**
 * Which way is 'less wrong'? The gradient says how the loss changes if w or b nudges up.
 * Move against it and the loss goes down. (Calculus gives these two lines; a deep learning
 * framework computes the same thing automatically for millions of parameters.)
 */
function gradient(w: number, b: number): [number, number] {
  const n = DATA.length;
  const dw = DATA.reduce((s, [x, y]) => s + 2 * (predict(x, w, b) - y) * x, 0) / n;
  const db = DATA.reduce((s, [x, y]) => s + 2 * (predict(x, w, b) - y), 0) / n;
  return [dw, db];
}
// endregion

const f = (n: number, width: number, digits: number) => n.toFixed(digits).padStart(width);

// region: train
/**
 * The training loop. Start from a bad guess; nudge against the gradient; repeat.
 * `learningRate` is how big each nudge is - too small and it crawls, too big and it
 * overshoots and blows up (see the last section).
 */
function train(steps: number, learningRate: number): [number, number] {
  let w = 0;
  let b = 0;
  const report = new Set([0, 1, 2, 5, 10, 50, 100, 500, steps - 1]);
  for (let step = 0; step < steps; step++) {
    const [dw, db] = gradient(w, b);
    w -= learningRate * dw;
    b -= learningRate * db;
    if (report.has(step)) {
      console.log(`  step ${String(step).padStart(4)}: w = ${f(w, 6, 3)}  b = ${f(b, 6, 3)}  loss = ${f(loss(w, b), 8, 3)}`);
    }
  }
  return [w, b];
}
// endregion

function main(): void {
  section('before');
  title('Before training: a model is just a guess');
  console.log(`w = 0, b = 0 -> loss = ${loss(0, 0).toFixed(3)}`);
  console.log(`predict(4) = ${predict(4, 0, 0).toFixed(1)}   (truth was 19.0)`);

  section('train');
  title('Training: nudge the numbers against the gradient, repeat');
  const [w, b] = train(1000, 0.01);

  section('after');
  title('After training: inference is just calling the function');
  console.log(`learned: y = ${w.toFixed(2)} * x + ${b.toFixed(2)}`);
  for (const x of [4, 7, 12]) {
    const note = x === 4 ? '   (truth 19.0)' : '   (never seen - extrapolating)';
    console.log(`predict(${String(x).padStart(2)}) = ${f(predict(x, w, b), 5, 1)}${note}`);
  }
  console.log('Inference does no learning. The numbers are frozen; it only evaluates the function.');

  section('learning-rate');
  title('The learning rate: too big and training diverges');
  for (const lr of [0.001, 0.01, 0.05]) {
    let w2 = 0;
    let b2 = 0;
    for (let i = 0; i < 50; i++) {
      const [dw, db] = gradient(w2, b2);
      w2 -= lr * dw;
      b2 -= lr * db;
    }
    const state = Math.abs(w2) < 1e6 ? `loss = ${loss(w2, b2).toFixed(3)}` : 'diverged (loss overflowed)';
    console.log(`  lr = ${String(lr).padEnd(5)} after 50 steps: ${state}`);
  }
  console.log('Hyperparameters like this are chosen by trying, measuring, and keeping what works.');
}

main();
