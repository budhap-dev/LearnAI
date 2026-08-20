"""
Lesson 10.3 - Distillation and small models

Distillation trains a small "student" model to imitate a large "teacher" on your task. You
run the expensive teacher once to label a pile of examples, then train the cheap student on
those labels. The student ends up nearly as good as the teacher on that one task, at a
fraction of the cost and latency - which is why a fine-tuned small model can beat a general
large one on a hot path (Lesson 9.4).

This example distils a simple teacher into a tiny student and shows the student closing the
gap. Deterministic; the "teacher" is a fixed function so the student has a stable target.

Run:  python3 m10_customising/l03_distillation.py
"""

from __future__ import annotations

from learnai import section, title

# region: teacher
# The teacher: an accurate but "expensive" scoring function over 4 features. Think of it as a
# large model that classifies support tickets; we only get to see its labels, not its weights.
def teacher(x: list[float]) -> float:
    return max(0.0, min(1.0, 0.6 * x[0] - 0.5 * x[1] + 0.9 * x[2] * x[3] + 0.1))


# A pile of unlabelled inputs (deterministic pseudo-data), which the teacher will label.
def inputs(n: int) -> list[list[float]]:
    out = []
    for i in range(n):
        out.append([((i * 3) % 5) / 4, ((i * 7) % 5) / 4, ((i * 2) % 5) / 4, ((i * 5) % 5) / 4])
    return out
# endregion


# region: student
# The student: a tiny linear model (4 weights + bias) - cheap to run, cheap to train.
def student_predict(w: list[float], x: list[float]) -> float:
    return max(0.0, min(1.0, sum(w[k] * x[k] for k in range(4)) + w[4]))


def train_student(data: list[tuple[list[float], float]], steps: int, lr: float) -> list[float]:
    """Train the student to match the TEACHER'S labels - not ground truth, the teacher's
    output. That is distillation: the student learns to imitate the teacher on your data."""
    w = [0.0, 0.0, 0.0, 0.0, 0.0]
    for _ in range(steps):
        for x, target in data:
            pred = student_predict(w, x)
            err = pred - target
            for k in range(4):
                w[k] -= lr * 2 * err * x[k]
            w[4] -= lr * 2 * err
    return w
# endregion


def agreement(w: list[float], xs: list[list[float]]) -> float:
    """How often the student's answer is within 0.1 of the teacher's - the metric that matters
    for distillation: not 'is the student right in the abstract' but 'does it match the teacher'."""
    close = sum(1 for x in xs if abs(student_predict(w, x) - teacher(x)) <= 0.1)
    return close / len(xs)


def main() -> None:
    train_xs = inputs(60)
    test_xs = inputs(200)[60:]                      # held out: never seen in training
    labelled = [(x, teacher(x)) for x in train_xs]  # the teacher labels the training pile

    section("label")
    title("Step 1: run the expensive teacher once to label the data")
    for x in train_xs[:4]:
        print(f"  teacher({x}) = {teacher(x):.3f}")
    print(f"  ... {len(labelled)} examples labelled by the teacher (a one-time cost)")

    section("distil")
    title("Step 2: train the tiny student to imitate those labels")
    w0 = [0.0, 0.0, 0.0, 0.0, 0.0]
    print(f"  before training: student agrees with teacher {agreement(w0, test_xs):.0%} of the time (held-out)")
    w = train_student(labelled, steps=300, lr=0.1)
    print(f"  after distillation: student agrees {agreement(w, test_xs):.0%} of the time (held-out)")
    print(f"  learned student weights: {[round(v, 2) for v in w]}")

    section("economics")
    title("Why this pays: the student is cheap, the teacher was one-time")
    print("  teacher: large model, high $/call, high latency  - run ONCE per training example")
    print("  student: 5 parameters, runs in microseconds       - runs on EVERY production request")
    for volume in (10_000, 1_000_000):
        print(f"  at {volume:>9,} requests/day: the student serves them all; the teacher labelled a few thousand, once")

    section("when")
    title("When to distil, and its limits")
    print("distil a HIGH-VOLUME, STABLE task where a small model can match the teacher's judgement")
    print("the student is only as good as the teacher's labels - and only on the distribution you labelled")
    print("it does not generalise beyond that task: a distilled ticket-classifier is not a chatbot")
    print("measure agreement on a HELD-OUT set (3.3); re-distil when the task or the teacher changes")
    print("distillation and LoRA compose: distil onto a small base, then LoRA-adapt per sub-task")


if __name__ == "__main__":
    main()
