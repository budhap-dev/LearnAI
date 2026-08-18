"""
Lesson 2.1 - What an LLM is

A language model is a function from "the text so far" to "a probability for every possible
next token". Generation is a loop: predict, pick, append, repeat. That is the whole thing.

This example builds the smallest possible language model - a bigram model that only looks
at the previous word - so the loop is visible with nothing hidden. A real LLM replaces the
counting table with a neural network that looks at thousands of previous tokens, but the
loop is identical.

Run:  python3 m02_llms/l01_next_token.py
"""

from __future__ import annotations

from collections import Counter, defaultdict

from learnai import section, title

# region: corpus
CORPUS = """
the model predicts the next token
the model reads the prompt
the prompt is a list of tokens
a token is a fragment of text
the next token is chosen from a distribution
the distribution comes from the model
"""
END = "<end>"  # a special token that marks where a line stopped
# endregion


# region: train
def train(text: str) -> dict[str, Counter[str]]:
    """Count, for every word, which word followed it. That table *is* the model."""
    following: dict[str, Counter[str]] = defaultdict(Counter)
    for line in text.strip().splitlines():
        words = line.split() + [END]
        for current, nxt in zip(words, words[1:]):
            following[current][nxt] += 1
    return following


def next_token_distribution(model: dict[str, Counter[str]], current: str) -> dict[str, float]:
    """Turn raw counts into probabilities: this is what a real model outputs at every step."""
    counts = model.get(current, Counter())
    total = sum(counts.values())
    return {tok: n / total for tok, n in sorted(counts.items())} if total else {}
# endregion


# region: generate
def generate(model: dict[str, Counter[str]], prompt: str, max_tokens: int = 12) -> list[str]:
    """The autoregressive loop: predict a distribution, pick the most likely token, append,
    and feed the longer text back in. Stops at <end> or when the budget runs out.

    Picking the single most likely token is called *greedy decoding*. Lesson 2.7 replaces
    this line with sampling, which is where temperature and randomness come from.
    """
    tokens = prompt.split()
    for _ in range(max_tokens):
        dist = next_token_distribution(model, tokens[-1])
        if not dist:
            break
        chosen = max(dist, key=lambda t: (dist[t], t))  # highest probability; ties -> alphabetical
        if chosen == END:
            break
        tokens.append(chosen)
    return tokens
# endregion


def main() -> None:
    model = train(CORPUS)

    section("distribution")
    title("What the model outputs: a distribution over the next token")
    for word in ["the", "model", "token"]:
        dist = next_token_distribution(model, word)
        print(f"after {word!r}:")
        for tok, p in sorted(dist.items(), key=lambda kv: (-kv[1], kv[0])):
            print(f"  {tok:14} {p:.3f}  {'#' * int(p * 20 + 0.5)}")

    section("generate")
    title("Generation is a loop: predict, pick, append, repeat")
    for prompt in ["the", "a token", "the next"]:
        out = generate(model, prompt)
        print(f"{prompt!r:14} -> {' '.join(out)}")

    section("no-lookup")
    title("There is no lookup - the model continues text it has never seen")
    print(" ".join(generate(model, "the prompt predicts")))
    print("'prompt predicts' never appears in the corpus; the model does not notice - it just")
    print("continues from the last word it recognises. Fluent, plausible, and not checked.")


if __name__ == "__main__":
    main()
