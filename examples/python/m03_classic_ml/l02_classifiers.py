"""
Lesson 3.2 - Regression and classification

Two classic models built from scratch, on the same tiny dataset, so you can see what a
"classifier" actually is: a function from features to a score, learned from labelled rows.

  - logistic regression: a weighted sum pushed through a squashing function; the workhorse
    for "probability that X" - trained by the same gradient descent as Lesson 1.2
  - a decision stump: the smallest decision tree - one question, two answers; the unit that
    gradient-boosted trees stack thousands of

Neither needs a framework to understand. In practice you would use scikit-learn or a boosting
library, and the concepts carry over unchanged.

Run:  python3 m03_classic_ml/l02_classifiers.py
"""

from __future__ import annotations

import math

from learnai import section, title

# region: data
# Rows: (requests per minute, error rate %) -> is this service instance unhealthy? (1 = yes)
# Deliberately small so the model is inspectable; the shape is what matters.
ROWS = [
    ((120, 0.5), 0), ((150, 0.8), 0), ((90, 0.2), 0), ((200, 1.0), 0), ((110, 0.4), 0),
    ((300, 2.5), 1), ((320, 4.0), 1), ((250, 3.1), 1), ((280, 1.9), 1), ((400, 5.2), 1),
    ((180, 2.8), 1), ((210, 0.6), 0), ((230, 1.4), 1), ((260, 1.2), 0), ((170, 1.6), 0),
    ((240, 1.7), 1),
]
# endregion


# region: features
def features(x: tuple[float, float]) -> list[float]:
    """Scale the raw columns to similar ranges. Models learn faster and weights become
    comparable when features are on the same scale - the first thing every pipeline does."""
    rpm, err = x
    return [rpm / 400.0, err / 5.0]
# endregion


# region: logistic
def sigmoid(z: float) -> float:
    return 1.0 / (1.0 + math.exp(-z))


def predict_proba(feats: list[float], w: list[float], b: float) -> float:
    """Logistic regression: a weighted sum, squashed into (0, 1). The output is a *score*
    you can read as a probability - which is why it is the default first classifier."""
    return sigmoid(sum(wi * xi for wi, xi in zip(w, feats)) + b)


def train_logistic(rows, steps: int = 3000, lr: float = 0.5) -> tuple[list[float], float]:
    """Gradient descent on log-loss - the same loop as Lesson 1.2 with a different loss."""
    w, b = [0.0, 0.0], 0.0
    n = len(rows)
    for _ in range(steps):
        gw, gb = [0.0, 0.0], 0.0
        for x, y in rows:
            f = features(x)
            err = predict_proba(f, w, b) - y      # derivative of log-loss wrt the score
            gw = [g + err * xi for g, xi in zip(gw, f)]
            gb += err
        w = [wi - lr * g / n for wi, g in zip(w, gw)]
        b -= lr * gb / n
    return w, b
# endregion


# region: stump
def train_stump(rows) -> tuple[int, float, int, int]:
    """The smallest decision tree: try every (feature, threshold) split, keep the one that
    separates the labels best. Trees ask questions; boosting stacks thousands of stumps,
    each correcting the last - which is why boosted trees dominate on tabular data."""
    best = None
    for feature in (0, 1):
        values = sorted({x[feature] for x, _ in rows})
        for lo, hi in zip(values, values[1:]):
            threshold = (lo + hi) / 2
            left = [y for x, y in rows if x[feature] <= threshold]
            right = [y for x, y in rows if x[feature] > threshold]
            # majority label on each side; error = rows on the wrong side of their majority
            l_label = int(sum(left) * 2 > len(left))
            r_label = int(sum(right) * 2 > len(right))
            errors = sum(y != l_label for y in left) + sum(y != r_label for y in right)
            if best is None or errors < best[0]:
                best = (errors, feature, threshold, l_label, r_label)
    _, feature, threshold, l_label, r_label = best
    return feature, threshold, l_label, r_label


def stump_predict(x, stump) -> int:
    feature, threshold, l_label, r_label = stump
    return l_label if x[feature] <= threshold else r_label
# endregion


def main() -> None:
    section("logistic")
    title("Logistic regression: learned weights, and a score per row")
    w, b = train_logistic(ROWS)
    print(f"weights: rpm {w[0]:+.2f}  error-rate {w[1]:+.2f}  bias {b:+.2f}")
    print("  rpm  err%   p(unhealthy)  label")
    for x, y in ROWS:
        p = predict_proba(features(x), w, b)
        print(f"  {x[0]:>3}  {x[1]:>4.1f}     {p:.2f}          {y}")

    section("threshold")
    title("A score becomes a decision only when you choose a threshold")
    for t in (0.3, 0.5, 0.7):
        flagged = sum(predict_proba(features(x), w, b) >= t for x, _ in ROWS)
        wrong = sum((predict_proba(features(x), w, b) >= t) != bool(y) for x, y in ROWS)
        print(f"  threshold {t}: flags {flagged:>2} of {len(ROWS)}, {wrong} wrong")
    print("Lower threshold = catch more, false alarms up. The right value is a product decision (Lesson 3.3).")

    section("stump")
    title("A decision stump: one question")
    stump = train_stump(ROWS)
    name = ["rpm", "error rate"][stump[0]]
    print(f"if {name} <= {stump[1]:.2f} then {stump[2]} else {stump[3]}")
    wrong = sum(stump_predict(x, stump) != y for x, y in ROWS)
    print(f"  {wrong} of {len(ROWS)} wrong on the training rows")
    print("A real tree keeps asking; a boosted ensemble asks thousands of small questions in turn.")

    section("new-rows")
    title("Inference: both models score rows they never saw")
    for x in ((160, 0.7), (260, 2.2), (500, 0.3)):
        p = predict_proba(features(x), w, b)
        s = stump_predict(x, stump)
        print(f"  rpm {x[0]:>3}, err {x[1]:>3.1f}%  ->  logistic p={p:.2f}   stump={s}")
    print("(500, 0.3) is unlike anything in training - both models answer anyway. See Lesson 3.3.")


if __name__ == "__main__":
    main()
