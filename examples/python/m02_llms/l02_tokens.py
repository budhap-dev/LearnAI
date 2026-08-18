"""
Lesson 2.2 - Tokens

A language model never sees your text. It sees a list of integers - token ids - produced by
a tokeniser. This example builds a tiny byte-pair-encoding (BPE) tokeniser from scratch,
trains it on a small corpus, and uses it to show the three things that matter in practice:

  1. tokens are not characters and not words - they are learned fragments
  2. the same idea in a different language (or spelling) can cost many more tokens
  3. cost and context limits are counted in tokens, so you must be able to estimate them

Real tokenisers (tiktoken, SentencePiece, HuggingFace tokenizers) are the same algorithm at
scale: ~100k merges learned from terabytes of text instead of 60 merges from a paragraph.

Run:  python3 m02_llms/l02_tokens.py
"""

from __future__ import annotations

from collections import Counter

from learnai import section, title

# region: corpus
# A deliberately tiny, English-only training corpus. Real ones are terabytes.
CORPUS = """
the model reads tokens not letters
a token is a fragment of text learned from data
common words become one token rare words split into pieces
the tokeniser is trained once and then reused
strawberry raspberry blueberry berry berries
lower cost means fewer tokens fewer tokens means less context used
"""
# endregion


# region: pre-tokenise
def pre_tokenise(text: str) -> list[str]:
    """Split on whitespace and mark the start of each word with a leading space.

    Real BPE tokenisers keep the space attached to the word that follows it, which is why
    " the" and "the" are different tokens - the first is far more common in running text.
    """
    return [" " + word for word in text.split()]
# endregion


# region: train-bpe
def train_bpe(text: str, merges: int) -> list[tuple[str, str]]:
    """Learn `merges` merge rules: repeatedly join the most frequent adjacent pair.

    Every word starts as a list of characters. Each round we count adjacent pairs across
    the whole corpus, pick the commonest, and merge it everywhere. The merge order is the
    entire trained model - apply the same merges in the same order at encode time and you
    get the same tokens.
    """
    words: list[list[str]] = [list(word) for word in pre_tokenise(text)]
    rules: list[tuple[str, str]] = []

    for _ in range(merges):
        pairs: Counter[tuple[str, str]] = Counter()
        for word in words:
            for left, right in zip(word, word[1:]):
                pairs[(left, right)] += 1
        if not pairs:
            break

        best, count = pairs.most_common(1)[0]
        if count < 2:
            break  # nothing repeats any more - further merges would just memorise words

        rules.append(best)
        words = [merge_pair(word, best) for word in words]

    return rules


def merge_pair(symbols: list[str], pair: tuple[str, str]) -> list[str]:
    """Replace every adjacent occurrence of `pair` in `symbols` with the joined symbol."""
    merged: list[str] = []
    i = 0
    while i < len(symbols):
        if i + 1 < len(symbols) and (symbols[i], symbols[i + 1]) == pair:
            merged.append(symbols[i] + symbols[i + 1])
            i += 2
        else:
            merged.append(symbols[i])
            i += 1
    return merged
# endregion


# region: encode
def encode(text: str, rules: list[tuple[str, str]]) -> list[str]:
    """Tokenise new text by replaying the learned merges, in order, on each word."""
    tokens: list[str] = []
    for word in pre_tokenise(text):
        symbols = list(word)
        for pair in rules:
            symbols = merge_pair(symbols, pair)
        tokens.extend(symbols)
    return tokens


def show(text: str, rules: list[tuple[str, str]]) -> None:
    tokens = encode(text, rules)
    pretty = "|".join(t.replace(" ", "␣") for t in tokens)  # ␣ marks a leading space
    print(f"{text!r}")
    print(f"  {len(text):>3} chars -> {len(tokens):>2} tokens : {pretty}")
# endregion


# region: cost
def estimate_cost(tokens: int, price_per_million: float) -> float:
    """Token pricing is quoted per million tokens; the maths is that simple.

    The price is a parameter on purpose. Prices change and differ per model and per
    direction (input vs output) - look them up, never hard-code them in a lesson.
    """
    return tokens / 1_000_000 * price_per_million
# endregion


def main() -> None:
    section("train")
    title("Training a tiny BPE tokeniser")
    rules = train_bpe(CORPUS, merges=60)
    print(f"learned {len(rules)} merge rules; the first ten:")
    for i, (left, right) in enumerate(rules[:10], 1):
        print(f"  {i:>2}. {left!r:>8} + {right!r:<8} -> {(left + right)!r}")

    section("encode")
    title("Tokens are learned fragments, not letters or words")
    for text in ["the token", "strawberry", "raspberry", "cranberry", "tokenisation"]:
        show(text, rules)

    section("letters")
    title("Why a model struggles to count the r's in strawberry")
    tokens = encode("strawberry", rules)
    print("the model sees these units, not individual letters:")
    for t in tokens:
        print(f"  {t.replace(' ', '␣')!r:12} contains {t.count('r')} r(s)")
    print(f"total r's: {'strawberry'.count('r')} - but no single token 'knows' that")

    section("multilingual")
    title("Text unlike the training data costs more tokens")
    for text in ["the model reads tokens", "das modell liest token", "le modele lit des jetons"]:
        show(text, rules)
    print("an English-trained vocabulary fragments other languages into many small tokens")

    section("cost")
    title("Estimating tokens and cost for a workload")
    document = CORPUS * 40  # pretend this is a 40-page report
    n_tokens = len(encode(document, rules))
    price = 3.00  # example input price, USD per million tokens - a parameter, not a fact
    print(f"document: {len(document):,} chars -> {n_tokens:,} tokens "
          f"({len(document) / n_tokens:.1f} chars per token)")
    print(f"one read at ${price:.2f}/M input tokens = ${estimate_cost(n_tokens, price):.4f}")
    print(f"10,000 reads a day = ${estimate_cost(n_tokens * 10_000, price):,.2f}/day")


if __name__ == "__main__":
    main()
