"""
Lesson 3.3 - Evaluating a model

A model gives every row a score. Evaluation answers two questions engineers keep merging:
  1. does the score rank things well? (independent of any threshold)
  2. at the threshold we will actually deploy, what happens? (precision, recall, false alarms)

Everything here is computed on a HELD-OUT set - rows the model never trained on. Accuracy on
training rows is a vanity metric; the point of a model is behaviour on rows it has not seen.

Run:  python3 m03_classic_ml/l03_evaluation.py
"""

from __future__ import annotations

from learnai import section, title

# region: heldout
# (score the model gave, true label). Imagine a fraud model scoring 20 held-out transactions.
# 6 are truly fraud (1). Notice the model is decent, not perfect - like every real model.
HELDOUT = [
    (0.96, 1), (0.91, 1), (0.88, 0), (0.85, 1), (0.77, 1), (0.71, 0), (0.66, 1),
    (0.60, 0), (0.55, 0), (0.49, 1), (0.42, 0), (0.38, 0), (0.31, 0), (0.27, 0),
    (0.22, 0), (0.18, 0), (0.15, 0), (0.11, 0), (0.07, 0), (0.03, 0),
]
# endregion


# region: confusion
def confusion(rows, threshold: float) -> tuple[int, int, int, int]:
    """Count the four outcomes at one threshold. Every metric below is arithmetic on these."""
    tp = sum(1 for s, y in rows if s >= threshold and y == 1)
    fp = sum(1 for s, y in rows if s >= threshold and y == 0)
    fn = sum(1 for s, y in rows if s < threshold and y == 1)
    tn = sum(1 for s, y in rows if s < threshold and y == 0)
    return tp, fp, fn, tn


def metrics(tp: int, fp: int, fn: int, tn: int) -> dict[str, float]:
    """precision: of what we flagged, how much was real?   recall: of the real, how much did we catch?
    F1 balances them. Accuracy is last for a reason: with 14 negatives out of 20, "always no"
    scores 70% and catches nothing."""
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    accuracy = (tp + tn) / (tp + fp + fn + tn)
    return {"precision": precision, "recall": recall, "f1": f1, "accuracy": accuracy}
# endregion


# region: auc
def auc(rows) -> float:
    """Area under the ROC curve = probability a random positive scores above a random negative.
    Threshold-free: it measures ranking quality, which is what you compare models on before
    anyone has chosen a threshold. 0.5 is coin-flip, 1.0 is perfect separation."""
    pos = [s for s, y in rows if y == 1]
    neg = [s for s, y in rows if y == 0]
    wins = sum((1.0 if p > n else 0.5 if p == n else 0.0) for p in pos for n in neg)
    return wins / (len(pos) * len(neg))
# endregion


def main() -> None:
    section("baseline")
    title("First, the baseline every model must beat")
    positives = sum(y for _, y in HELDOUT)
    print(f"{len(HELDOUT)} held-out rows, {positives} positive")
    print(f"'always predict 0' accuracy = {(len(HELDOUT) - positives) / len(HELDOUT):.0%}  -  and recall = 0%")
    print("Accuracy alone would call that model 'good'. It is useless.")

    section("threshold-sweep")
    title("The same scores, different thresholds, different products")
    print("  thr   TP FP FN TN   precision recall  F1   accuracy")
    for t in (0.9, 0.7, 0.5, 0.3, 0.1):
        tp, fp, fn, tn = confusion(HELDOUT, t)
        m = metrics(tp, fp, fn, tn)
        print(f"  {t:.1f}   {tp:>2} {fp:>2} {fn:>2} {tn:>2}     {m['precision']:.2f}    {m['recall']:.2f}  {m['f1']:.2f}   {m['accuracy']:.2f}")
    print("High threshold: few false alarms, misses fraud. Low: catches fraud, floods reviewers.")
    print("Nothing in the model picks the row - the cost of each error type does.")

    section("auc")
    title("Threshold-free: how well does the model rank?")
    print(f"AUC = {auc(HELDOUT):.3f}   (0.5 = random, 1.0 = perfect)")
    print("Compare models on AUC (or precision-recall AUC when positives are rare); pick the")
    print("threshold afterwards from the sweep, with the people who bear the cost of each error.")

    section("leakage")
    title("Why 'held-out' is not optional")
    train_scores = [(min(1.0, s + 0.05 * y), y) for s, y in HELDOUT]  # imagine the model saw these
    print(f"same model, scored on rows it trained on:   AUC = {auc(train_scores):.3f}")
    print(f"scored on rows it never saw (the real test): AUC = {auc(HELDOUT):.3f}")
    print("Training-set numbers flatter every model. Split first, evaluate on what was held out,")
    print("and never let information from the test rows leak into training or feature building.")


if __name__ == "__main__":
    main()
