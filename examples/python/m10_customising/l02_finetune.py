"""
Lesson 10.2 - Fine-tuning mechanics (SFT and LoRA)

Fine-tuning is Lesson 1.2's training loop, continued on your own examples. Full fine-tuning
updates every weight; LoRA (low-rank adaptation) freezes the base model and trains a tiny
add-on instead - so you get most of the benefit for a fraction of the trainable parameters,
and the base stays reusable across many adapters.

This example fine-tunes a small linear layer two ways on a domain-shifted task: full (train
every weight) and LoRA (freeze the base, train a low-rank adapter). Deterministic gradient
descent - the mechanics, not a real training run.

Run:  python3 m10_customising/l02_finetune.py
"""

from __future__ import annotations

from learnai import section, title

# region: base
# A "pretrained" linear layer: 4 outputs from 6 inputs (a 4x6 weight matrix), frozen. In a
# real model this is one of thousands of such matrices, each far larger.
IN, OUT, RANK = 6, 4, 2
W0 = [[((i * 7 + j * 3) % 11 - 5) / 10 for j in range(IN)] for i in range(OUT)]  # fixed "pretrained" weights

# The domain task: inputs -> a target the base does NOT already produce, so adaptation is needed.
DATA = [
    ([1, 0, 1, 0, 1, 0], [0.9, -0.4, 0.2, 0.6]),
    ([0, 1, 0, 1, 0, 1], [-0.3, 0.7, -0.5, 0.1]),
    ([1, 1, 0, 0, 1, 1], [0.5, 0.5, -0.2, 0.4]),
    ([0, 0, 1, 1, 0, 0], [-0.6, 0.2, 0.8, -0.3]),
]
# endregion


# region: forward
def matvec(w: list[list[float]], x: list[float]) -> list[float]:
    return [sum(w[i][j] * x[j] for j in range(len(x))) for i in range(len(w))]


def loss(weight: list[list[float]]) -> float:
    total = 0.0
    for x, y in DATA:
        pred = matvec(weight, x)
        total += sum((pred[k] - y[k]) ** 2 for k in range(OUT))
    return total / len(DATA)
# endregion


# region: full
def train_full(steps: int, lr: float) -> tuple[list[list[float]], float]:
    """Full fine-tuning: every weight is trainable. Trainable params = OUT * IN."""
    w = [row[:] for row in W0]
    for _ in range(steps):
        for i in range(OUT):
            for j in range(IN):
                grad = 0.0
                for x, y in DATA:
                    pred = matvec(w, x)
                    grad += 2 * (pred[i] - y[i]) * x[j]
                w[i][j] -= lr * grad / len(DATA)
    return w, loss(w)
# endregion


# region: lora
def train_lora(steps: int, lr: float, rank: int) -> tuple[list[list[float]], float]:
    """LoRA: freeze W0, learn a low-rank update dW = B @ A (B is OUT x r, A is r x IN).
    The effective weight is W0 + B@A. Trainable params = r*(OUT + IN), which for a big layer
    is a tiny fraction of OUT*IN - and W0 is untouched, so many adapters can share one base."""
    a = [[0.0 for _ in range(IN)] for _ in range(rank)]                 # r x IN, starts at 0
    b = [[(0.1 if k == r % OUT else 0.0) for r in range(rank)] for k in range(OUT)]  # OUT x r, small init

    def effective() -> list[list[float]]:
        return [[W0[i][j] + sum(b[i][r] * a[r][j] for r in range(rank)) for j in range(IN)] for i in range(OUT)]

    for _ in range(steps):
        w = effective()
        errs = [[(matvec(w, x)[i] - y[i]) for i in range(OUT)] for x, y in DATA]
        # gradient wrt A and B only (W0 frozen)
        for r in range(rank):
            for j in range(IN):
                g = sum(2 * errs[d][i] * b[i][r] * DATA[d][0][j] for d in range(len(DATA)) for i in range(OUT))
                a[r][j] -= lr * g / len(DATA)
            for i in range(OUT):
                g = sum(2 * errs[d][i] * sum(a[r][jj] * DATA[d][0][jj] for jj in range(IN)) for d in range(len(DATA)))
                b[i][r] -= lr * g / len(DATA)
    return effective(), loss(effective())
# endregion


def main() -> None:
    section("before")
    title("The frozen base does not solve the domain task")
    print(f"  base model: {OUT}x{IN} = {OUT * IN} weights,  loss on the domain data = {loss(W0):.3f}")

    section("full")
    title("Full fine-tuning: train every weight")
    _, full_loss = train_full(steps=400, lr=0.1)
    print(f"  trainable params = {OUT * IN:<4} (every weight)   final loss = {full_loss:.3f}")

    section("lora")
    title("LoRA: freeze the base, train a low-rank adapter")
    _, lora_loss = train_lora(steps=400, lr=0.1, rank=RANK)
    lora_params = RANK * (OUT + IN)
    print(f"  trainable params = {lora_params:<4} (rank {RANK} adapter)  final loss = {lora_loss:.3f}")
    print(f"  the base's {OUT * IN} weights were never touched - the adapter is a separate, swappable file")
    print(f"  (rank {RANK} nearly matches full fine-tuning here; a higher rank closes the gap at more params)")

    section("scale")
    title("Why LoRA matters at real model sizes")
    for d in (1024, 4096):
        full = d * d
        lora = 8 * (d + d)   # rank 8
        print(f"  a {d}x{d} layer: full = {full:>12,}   LoRA r=8 = {lora:>9,}   ({full // lora:>4}x fewer trainable)")
    print("  a real model has hundreds of such layers; LoRA turns a GPU-cluster job into a single-GPU one")

    section("rules")
    title("SFT and LoRA in practice")
    print("data format: (prompt, ideal completion) pairs - quality and consistency beat quantity")
    print("full fine-tune: best fit, but trains and stores a whole model copy per task")
    print("LoRA/PEFT: near-equal quality at an adequate rank, tiny adapters you can store many of and swap")
    print("overfitting is the risk: too many epochs on too little data memorises - hold out an eval set (3.3)")
    print("fine-tune for BEHAVIOUR (format, tone, domain); for FACTS, retrieve (6.1, 10.1)")


if __name__ == "__main__":
    main()
