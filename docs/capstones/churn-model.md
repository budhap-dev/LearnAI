---
id: churn-model
title: "Capstone — a churn model in production"
summary: "A classic-ML classifier, end to end: features, a gradient-boosted model, honest evaluation with a threshold chosen for the business cost, then registered, served, and monitored for drift. The capstone with no LLM in it — because the senior skill is knowing when the answer is not a language model."
modules: [3, 8, 9]
diagram: ml-lifecycle
---

## What you are building

A model that predicts which customers are about to churn, so the business can act. There is **no
LLM here** — this is a tabular classification problem, and a gradient-boosted tree
([3.2](#/lesson/3.2)) will beat an LLM on accuracy, cost, latency, and explainability. Including it
as a capstone is the point: the senior skill is [choosing the right tool](#/lesson/3.1), and often
it is not a language model.

```diagram
ml-lifecycle
```

This capstone is classic ML taken all the way to production: train → register → serve → monitor.

## 1 · Problem and user

- **User:** a retention team that can offer an incentive to customers likely to leave.
- **Job:** a calibrated risk score per customer, and the threshold that makes acting worthwhile.
- **Why NOT an LLM** ([3.1](#/lesson/3.1)): the input is structured tabular data, the target is
  labelled, you have history, and you need it cheap, fast, and explainable. That is exactly where
  classic ML wins.

## 2 · Architecture, box by box

| Stage | What it does | Built in |
|---|---|---|
| Features | turn raw events into model inputs; avoid leakage | [3.5](#/lesson/3.5) |
| Train | a gradient-boosted tree on a proper train/val/test split | [3.2](#/lesson/3.2), [3.3](#/lesson/3.3) |
| Evaluate | confusion matrix, precision/recall, AUC, calibration | [3.3](#/lesson/3.3), [8.1](#/lesson/8.1) |
| Threshold | choose the operating point for the business cost | [3.3](#/lesson/3.3) |
| Register | version the model artefact and its metrics | [3.5](#/lesson/3.5) |
| Serve + monitor | score in production; watch for drift | [3.5](#/lesson/3.5), [9.8](#/lesson/9.8) |

## 3 · The build, assembled

Start with [features](#/lesson/3.5): aggregate each customer's history into inputs, being ruthless
about leakage — no feature that encodes the future or the label. Train a gradient-boosted tree
([3.2](#/lesson/3.2)) on a clean [train/validation/test split](#/lesson/3.3); it handles mixed
feature types and non-linear boundaries with little tuning, and it is explainable enough to tell
the retention team *why* a customer scored high.

Evaluate honestly ([8.1](#/lesson/8.1)): the [confusion matrix, precision/recall, and
AUC](#/lesson/3.3) on the held-out test set — accuracy alone lies when churn is rare. Then
**choose the threshold for the business cost**: a missed churner and a wasted incentive are not
equally expensive, and that ratio, not 0.5, sets the operating point ([3.3](#/lesson/3.3)).

## 4 · Eval plan (decided before you ship)

- **Held-out test set** ([3.3](#/lesson/3.3)): never touched during training or tuning — the only
  honest estimate of production performance.
- **Metrics** ([8.1](#/lesson/8.1)): precision and recall at the chosen threshold, AUC for
  ranking quality, and a calibration check so the "risk score" means what it says.
- **The bar:** the operating point that beats the current process on the business metric (churn
  prevented per incentive spent), not on accuracy in the abstract.

## 5 · Failure modes and guardrails

- **Data leakage** → the classic killer: a feature that peeks at the label inflates offline
  scores and collapses in production. Audit every feature ([3.5](#/lesson/3.5)).
- **Training/serving skew** → the same feature computed differently in the pipeline and at serving
  time. Compute features one way ([3.5](#/lesson/3.5)).
- **Drift** → the world changes and the model silently rots. Monitor input and prediction
  distributions and retrain on a schedule ([9.8](#/lesson/9.8)).
- **Wrong threshold** → an accurate model at the wrong operating point wastes the whole budget
  ([3.3](#/lesson/3.3)).

## 6 · Cost, latency, and rollout

Serving is cheap and fast — milliseconds, no per-token bill — which is half the reason to prefer
it here. [Register](#/lesson/3.5) the model with its metrics and the data it was trained on so a
rollback is one version pin. Roll out by scoring in **shadow**, comparing predictions to what
actually happens, and only then wiring the score into the retention workflow ([8.5](#/lesson/8.5)).

## What to harden next

- Automate retraining on a schedule with a drift trigger, gated on the held-out metric ([9.8](#/lesson/9.8)).
- Add feature-importance output so the retention team gets a reason with each score.
- A/B the interventions — the model ranks risk; whether the incentive *works* is its own experiment.
- Only reach for an LLM if you add unstructured signals (support transcripts) the tree cannot use.
