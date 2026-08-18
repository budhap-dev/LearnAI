"""
Lesson 3.5 - Feature pipelines and serving

A trained model is not a service. Between "the notebook says AUC 0.9" and "it answers requests
at 3am" sit four things this example does in miniature:

  1. a *pipeline* - the same feature preparation at training time and at request time
  2. an *artefact* - the fitted numbers serialised with a version, so serving loads exactly
     what was evaluated
  3. *serving* - load once, predict per request, log what you predicted
  4. *monitoring* - notice when the incoming data no longer looks like the training data (drift)

Run:  python3 m03_classic_ml/l05_pipeline.py
"""

from __future__ import annotations

import json
import math

from learnai import section, title

# region: data
# (payment amount, minutes since last payment, is new device) -> flagged for review?
TRAIN = [
    ((20.0, 1440, 0), 0), ((35.5, 720, 0), 0), ((12.0, 60, 0), 0), ((250.0, 30, 1), 1),
    ((980.0, 5, 1), 1), ((45.0, 300, 0), 0), ((610.0, 2, 1), 1), ((15.0, 2000, 0), 0),
    ((330.0, 15, 0), 1), ((70.0, 90, 1), 0), ((1200.0, 1, 1), 1), ((28.0, 500, 0), 0),
]
# endregion


# region: pipeline
class Scaler:
    """Fit on training data, apply everywhere else - with the *training* statistics.
    Fitting a scaler on request data would make every request look 'average'."""

    def __init__(self) -> None:
        self.mean: list[float] = []
        self.sd: list[float] = []

    def fit(self, rows: list[list[float]]) -> "Scaler":
        cols = list(zip(*rows))
        self.mean = [sum(c) / len(c) for c in cols]
        self.sd = [math.sqrt(sum((v - m) ** 2 for v in c) / len(c)) or 1.0 for c, m in zip(cols, self.mean)]
        return self

    def transform(self, x: list[float]) -> list[float]:
        return [(v - m) / s for v, m, s in zip(x, self.mean, self.sd)]


def raw_features(x: tuple[float, float, int]) -> list[float]:
    """Feature engineering lives in ONE function used by both training and serving.
    log-amount because money is skewed; the rest as-is."""
    amount, minutes, new_device = x
    return [math.log10(amount + 1), math.log10(minutes + 1), float(new_device)]
# endregion


# region: train
def sigmoid(z: float) -> float:
    return 1.0 / (1.0 + math.exp(-z))


def train(rows, steps: int = 2000, lr: float = 0.3) -> dict:
    """Fit scaler, then logistic regression (Lesson 3.2). Return an *artefact*: everything
    serving needs, as plain data, with a version. No code objects, no pickles of surprises."""
    scaler = Scaler().fit([raw_features(x) for x, _ in rows])
    feats = [scaler.transform(raw_features(x)) for x, _ in rows]
    w, b = [0.0, 0.0, 0.0], 0.0
    for _ in range(steps):
        gw, gb = [0.0, 0.0, 0.0], 0.0
        for f, (_, y) in zip(feats, rows):
            err = sigmoid(sum(wi * xi for wi, xi in zip(w, f)) + b) - y
            gw = [g + err * xi for g, xi in zip(gw, f)]
            gb += err
        w = [wi - lr * g / len(rows) for wi, g in zip(w, gw)]
        b -= lr * gb / len(rows)
    return {
        "version": "review-model@2026-08-18.1",
        "features": ["log10_amount", "log10_minutes_since", "new_device"],
        "scaler": {"mean": scaler.mean, "sd": scaler.sd},
        "weights": w,
        "bias": b,
        "threshold": 0.5,
    }
# endregion


# region: serve
class Model:
    """What runs in the service: load the artefact once, predict per request, log."""

    def __init__(self, artefact_json: str) -> None:
        a = json.loads(artefact_json)
        self.version = a["version"]
        self.scaler = Scaler()
        self.scaler.mean, self.scaler.sd = a["scaler"]["mean"], a["scaler"]["sd"]
        self.w, self.b, self.threshold = a["weights"], a["bias"], a["threshold"]

    def predict(self, x: tuple[float, float, int]) -> dict:
        f = self.scaler.transform(raw_features(x))
        p = sigmoid(sum(wi * xi for wi, xi in zip(self.w, f)) + self.b)
        return {"score": p, "review": p >= self.threshold, "model": self.version}
# endregion


# region: drift
def drift(scaler: Scaler, recent: list[list[float]]) -> list[float]:
    """Compare recent inputs with the training distribution: how many training standard
    deviations has each feature's mean moved? > 1 is worth an alert; the model was not
    trained on this world."""
    cols = list(zip(*recent))
    return [(sum(c) / len(c) - m) / s for c, m, s in zip(cols, scaler.mean, scaler.sd)]
# endregion


def main() -> None:
    section("artefact")
    title("Training produces an artefact: numbers plus a version, nothing else")
    artefact = train(TRAIN)
    blob = json.dumps(artefact, sort_keys=True)
    print(f"{artefact['version']}  (a small JSON document with {len(artefact)} keys)")
    print("features:", ", ".join(artefact["features"]))
    print("weights: ", ", ".join(f"{w:+.2f}" for w in artefact["weights"]), f" bias {artefact['bias']:+.2f}")

    section("serve")
    title("Serving loads the artefact and applies the SAME pipeline per request")
    model = Model(blob)
    for x in [(18.0, 900, 0), (450.0, 4, 1), (95.0, 40, 1)]:
        r = model.predict(x)
        print(f"  amount {x[0]:>6.1f}  minutes {x[1]:>4}  new_device {x[2]}  ->  score {r['score']:.3f}  review={str(r['review']).lower()}  ({r['model']})")
    print("Every prediction is logged with the model version, so a bad decision can be traced")
    print("to the exact artefact - and the artefact can be rolled back like any deploy.")

    section("drift")
    title("Monitoring: does today's traffic still look like the training data?")
    scaler = Scaler()
    scaler.mean, scaler.sd = artefact["scaler"]["mean"], artefact["scaler"]["sd"]
    normal_day = [raw_features(x) for x in [(22.0, 800, 0), (40.0, 400, 0), (300.0, 20, 1), (15.0, 1500, 0)]]
    odd_day = [raw_features(x) for x in [(2200.0, 3, 1), (1800.0, 2, 1), (2500.0, 1, 1), (1900.0, 4, 1)]]
    for label, day in [("normal day", normal_day), ("odd day   ", odd_day)]:
        shifts = drift(scaler, day)
        flag = "  <- ALERT: inputs no longer look like training data" if any(abs(s) > 1 for s in shifts) else ""
        print(f"  {label}: feature-mean shift (in training SDs) = {', '.join(f'{s:+.2f}' for s in shifts)}{flag}")
    print("Drift does not say the model is wrong; it says you can no longer assume it is right.")
    print("Retrain, re-evaluate on fresh labels, and redeploy - the same loop as any release.")


if __name__ == "__main__":
    main()
