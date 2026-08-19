"""
Lesson 5.5 - Prompt caching and batch APIs

Two price levers that need no cleverness, only arrangement:

  * Prompt caching: the attention state for an unchanged PREFIX of the prompt can be reused
    across requests (Lesson 2.4's KV cache). Providers bill cached input at a fraction of the
    normal price - but only for the prefix, and only if it is byte-identical. So put the
    stable parts first and the changing parts last.
  * Batch: if nobody is waiting, send requests in bulk to an asynchronous endpoint at a
    discount (commonly ~50%) with results in minutes to hours.

No model is called here: the arithmetic is the lesson. Prices are parameters.

Run:  python3 m05_apis/l05_caching_batch.py
"""

from __future__ import annotations

from learnai import section, title

# region: prices
# USD per million tokens - illustrative parameters, see the model reference for real ones.
INPUT = 3.00
CACHED_INPUT = 0.30      # a typical cached-read price: ~10% of input
OUTPUT = 15.00
BATCH_DISCOUNT = 0.5     # typical
# endregion


# region: layouts
# The same request two ways. Token counts per part are illustrative.
SYSTEM = 1_200          # persona, rules, tool descriptions - identical on every request
FEW_SHOT = 2_500        # examples - identical on every request
DOCS = 3_000            # retrieved context - differs per request
USER = 150              # the question - differs per request
OUTPUT_TOKENS = 400

# layout A: cache-friendly - stable prefix first, variable suffix last
CACHE_FRIENDLY = ["system", "few_shot", "docs", "user"]
# layout B: cache-hostile - something variable appears before the stable parts
CACHE_HOSTILE = ["user", "system", "few_shot", "docs"]

SIZES = {"system": SYSTEM, "few_shot": FEW_SHOT, "docs": DOCS, "user": USER}
STABLE = {"system", "few_shot"}


def cacheable_prefix(layout: list[str]) -> int:
    """Caching applies to the longest prefix that is identical across requests. The first
    variable part ends it - everything after is full price even if it never changes."""
    total = 0
    for part in layout:
        if part not in STABLE:
            break
        total += SIZES[part]
    return total
# endregion


# region: cost
def request_cost(layout: list[str], cache_hit: bool) -> float:
    total_in = sum(SIZES.values())
    cached = cacheable_prefix(layout) if cache_hit else 0
    return (cached * CACHED_INPUT + (total_in - cached) * INPUT + OUTPUT_TOKENS * OUTPUT) / 1_000_000


def daily(layout: list[str], requests: int, hit_rate: float) -> float:
    hits = int(requests * hit_rate)
    return hits * request_cost(layout, True) + (requests - hits) * request_cost(layout, False)
# endregion


def main() -> None:
    section("prefix")
    title("Only the unchanged prefix is cacheable")
    for name, layout in [("cache-friendly", CACHE_FRIENDLY), ("cache-hostile", CACHE_HOSTILE)]:
        print(f"{name:15} order={' > '.join(layout):40} cacheable prefix = {cacheable_prefix(layout):>5} of {sum(SIZES.values())} tokens")
    print("same content, same model, same answer - one layout is cacheable and one is not")

    section("cost")
    title("What it does to the bill (50k requests/day, 90% cache hit rate)")
    for name, layout in [("cache-friendly", CACHE_FRIENDLY), ("cache-hostile", CACHE_HOSTILE)]:
        print(f"{name:15} per request: hit ${request_cost(layout, True):.4f}  miss ${request_cost(layout, False):.4f}   "
              f"per day ${daily(layout, 50_000, 0.9):>9,.2f}")
    saved = daily(CACHE_HOSTILE, 50_000, 0.9) - daily(CACHE_FRIENDLY, 50_000, 0.9)
    print(f"re-ordering the prompt saves ${saved:,.2f}/day - a refactor, not a model change")

    section("batch")
    title("Batch: when nobody is waiting, take the discount")
    online = daily(CACHE_FRIENDLY, 50_000, 0.9)
    print(f"online, cache-friendly:        ${online:>9,.2f}/day")
    print(f"batch (x{BATCH_DISCOUNT}), cache-friendly:  ${online * BATCH_DISCOUNT:>9,.2f}/day   (results in minutes to hours)")
    print("candidates: nightly classification, backfills, evals, report generation, re-indexing")

    section("rules")
    title("Rules that fall out of the arithmetic")
    print("1. stable first, variable last: system + tools + examples, then context, then the question")
    print("2. byte-identical means byte-identical: a timestamp or a user name in the system prompt kills the cache")
    print("3. measure the hit rate from the API's usage fields; alert when it drops (someone edited the prefix)")
    print("4. route anything nobody is waiting for to batch; keep online for humans and latency-bound calls")


if __name__ == "__main__":
    main()
