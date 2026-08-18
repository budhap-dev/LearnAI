"""
Lesson 1.2 - How a model learns

"Training" is not magic and it is not programming. It is: guess some numbers, measure how
wrong they are on known examples, nudge the numbers to be less wrong, repeat. Every model
from a two-parameter line to a trillion-parameter LLM learns this way - the loop is the
same; only the size of the model and the shape of the "wrongness" differ.

This example fits a straight line to a handful of points using gradient descent, then uses
the fitted line to predict - so training and inference are visibly two different things.

Run:  python3 m01_foundations/l02_how_a_model_learns.py
"""

from __future__ import annotations

from learnai import section, title

# region: data
# Known examples: (input, correct output). Here: response time in ms for a payload size in KB.
# In an LLM the "input" is the text so far and the "correct output" is the actual next token;
# the idea is identical.
DATA = [(1, 12.0), (2, 14.5), (3, 16.0), (4, 19.0), (5, 20.5), (6, 23.0), (8, 27.0), (10, 32.0)]
# endregion


# region: model
def predict(x: float, w: float, b: float) -> float:
    """The model: two parameters, w and b. That is all a model is - a function with
    numbers in it that training will choose. Bigger models just have more numbers."""
    return w * x + b
# endregion


# region: loss
def loss(w: float, b: float) -> float:
    """How wrong is the model on the known examples? Mean squared error: average of the
    squared gaps between prediction and truth. Training exists to make this small."""
    return sum((predict(x, w, b) - y) ** 2 for x, y in DATA) / len(DATA)
# endregion


# region: gradient
def gradient(w: float, b: float) -> tuple[float, float]:
    """Which way is 'less wrong'? The gradient says how the loss changes if w or b nudges
    up. Move against it and the loss goes down. (Calculus gives these two lines; a deep
    learning framework computes the same thing automatically for millions of parameters.)"""
    n = len(DATA)
    dw = sum(2 * (predict(x, w, b) - y) * x for x, y in DATA) / n
    db = sum(2 * (predict(x, w, b) - y) for x, y in DATA) / n
    return dw, db
# endregion


# region: train
def train(steps: int, learning_rate: float) -> tuple[float, float]:
    """The training loop. Start from a bad guess; nudge against the gradient; repeat.
    `learning_rate` is how big each nudge is - too small and it crawls, too big and it
    overshoots and blows up (see the last section)."""
    w, b = 0.0, 0.0
    for step in range(steps):
        dw, db = gradient(w, b)
        w -= learning_rate * dw
        b -= learning_rate * db
        if step in (0, 1, 2, 5, 10, 50, 100, 500, steps - 1):
            print(f"  step {step:>4}: w = {w:6.3f}  b = {b:6.3f}  loss = {loss(w, b):8.3f}")
    return w, b
# endregion


def main() -> None:
    section("before")
    title("Before training: a model is just a guess")
    print(f"w = 0, b = 0 -> loss = {loss(0.0, 0.0):.3f}")
    print(f"predict(4) = {predict(4, 0.0, 0.0):.1f}   (truth was 19.0)")

    section("train")
    title("Training: nudge the numbers against the gradient, repeat")
    w, b = train(steps=1000, learning_rate=0.01)

    section("after")
    title("After training: inference is just calling the function")
    print(f"learned: y = {w:.2f} * x + {b:.2f}")
    for x in [4, 7, 12]:
        print(f"predict({x:>2}) = {predict(x, w, b):5.1f}" + ("   (truth 19.0)" if x == 4 else "   (never seen - extrapolating)"))
    print("Inference does no learning. The numbers are frozen; it only evaluates the function.")

    section("learning-rate")
    title("The learning rate: too big and training diverges")
    for lr in [0.001, 0.01, 0.05]:
        w2, b2 = 0.0, 0.0
        for _ in range(50):
            dw, db = gradient(w2, b2)
            w2 -= lr * dw
            b2 -= lr * db
        state = f"loss = {loss(w2, b2):.3f}" if abs(w2) < 1e6 else "diverged (loss overflowed)"
        print(f"  lr = {lr:<5} after 50 steps: {state}")
    print("Hyperparameters like this are chosen by trying, measuring, and keeping what works.")


if __name__ == "__main__":
    main()
