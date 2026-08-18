"""
Lesson 2.7 - Sampling

The model outputs a probability for every token. Something has to turn that into *one*
token, and that something is the sampler. Temperature, top-p and top-k are all knobs on
the sampler - they never change what the model "knows", only how a token is picked from
the distribution it produced.

This example takes one fixed next-token distribution and shows exactly what each knob
does to it. The random numbers come from a tiny seeded generator implemented identically
in the Python and TypeScript versions, so both print the same "random" choices - which is
also the lesson about seeds: reproducible does not mean deterministic in production.

Run:  python3 m02_llms/l07_sampling.py
"""

from __future__ import annotations

import math

from learnai import section, title

# region: distribution
# The model's raw output for one step: a score ("logit") per candidate token. Higher = more
# likely. These are the last-layer numbers *before* they become probabilities.
LOGITS = {
    " the": 3.2,
    " a": 2.6,
    " an": 1.1,
    " this": 0.9,
    " every": 0.2,
    " purple": -1.5,
}
# endregion


# region: softmax
def softmax(logits: dict[str, float], temperature: float = 1.0) -> dict[str, float]:
    """Turn scores into probabilities that sum to 1. Temperature divides the scores first:

      < 1  sharpens the distribution (the favourite gets even more likely)
      = 1  the model's own distribution
      > 1  flattens it (rare tokens get a real chance)
      -> 0 becomes greedy: the top token gets probability 1
    """
    if temperature <= 0:
        top = max(logits, key=lambda t: (logits[t], t))
        return {t: (1.0 if t == top else 0.0) for t in logits}
    scaled = {t: math.exp(v / temperature) for t, v in logits.items()}
    total = sum(scaled.values())
    return {t: v / total for t, v in scaled.items()}
# endregion


# region: truncate
def top_k(probs: dict[str, float], k: int) -> dict[str, float]:
    """Keep only the k most likely tokens, then renormalise."""
    kept = sorted(probs.items(), key=lambda kv: (-kv[1], kv[0]))[:k]
    total = sum(p for _, p in kept)
    return {t: p / total for t, p in kept}


def top_p(probs: dict[str, float], p: float) -> dict[str, float]:
    """Nucleus sampling: keep the smallest set of tokens whose probability adds up to >= p.

    Unlike top-k this adapts: a confident step keeps one or two tokens, an open-ended step
    keeps many. It is the truncation most APIs expose alongside temperature.
    """
    kept: dict[str, float] = {}
    running = 0.0
    for t, prob in sorted(probs.items(), key=lambda kv: (-kv[1], kv[0])):
        kept[t] = prob
        running += prob
        if running >= p:
            break
    total = sum(kept.values())
    return {t: v / total for t, v in kept.items()}
# endregion


# region: sample
class Rng:
    """A tiny linear congruential generator - the same in Python and TypeScript, so both
    examples make identical picks. Never use this for anything but a demo."""

    def __init__(self, seed: int) -> None:
        self.state = seed % 2_147_483_647

    def next(self) -> float:
        self.state = (self.state * 48_271) % 2_147_483_647
        return self.state / 2_147_483_647


def sample(probs: dict[str, float], rng: Rng) -> str:
    """Pick one token: draw a number in [0, 1) and walk the cumulative distribution."""
    r = rng.next()
    running = 0.0
    for t, p in sorted(probs.items(), key=lambda kv: (-kv[1], kv[0])):
        running += p
        if r < running:
            return t
    return t  # floating-point slack: fall through to the last token
# endregion


def show(probs: dict[str, float]) -> None:
    for t, p in sorted(probs.items(), key=lambda kv: (-kv[1], kv[0])):
        print(f"  {t!r:10} {p:6.3f}  {'#' * int(p * 40 + 0.5)}")


def main() -> None:
    section("temperature")
    title("Temperature reshapes the distribution; it does not add knowledge")
    for temperature in [0.0, 0.5, 1.0, 2.0]:
        print(f"temperature = {temperature:.1f}")
        show(softmax(LOGITS, temperature))

    section("truncation")
    title("Top-k and top-p cut the tail before sampling")
    base = softmax(LOGITS)
    print("top-k, k = 3")
    show(top_k(base, 3))
    print("top-p, p = 0.8")
    show(top_p(base, 0.8))

    section("samples")
    title("The same prompt, sampled 20 times")
    for label, probs in [
        ("temperature 0.0 (greedy)", softmax(LOGITS, 0.0)),
        ("temperature 0.7        ", softmax(LOGITS, 0.7)),
        ("temperature 1.5        ", softmax(LOGITS, 1.5)),
    ]:
        rng = Rng(seed=42)
        picks = [sample(probs, rng).strip() for _ in range(20)]
        print(f"{label}: {' '.join(picks)}")

    section("seed")
    title("A seed makes the sampler repeatable - it does not make the system deterministic")
    for run in (1, 2):
        rng = Rng(seed=7)
        picks = [sample(softmax(LOGITS, 1.0), rng).strip() for _ in range(8)]
        print(f"seed 7, run {run}: {' '.join(picks)}")
    print("Same seed, same picks - here. In production the model, its version, batching and")
    print("hardware all change the numbers upstream of the sampler. Treat outputs as samples.")


if __name__ == "__main__":
    main()
