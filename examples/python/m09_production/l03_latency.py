"""
Lesson 9.3 - Latency and throughput

A model call's latency is not one number. It is time-to-first-token (TTFT) plus
output_tokens / generation_rate. Streaming changes which part the user feels; batching and
parallelism change throughput. And you report percentiles, never the mean - the p95 is what
your SLO is about, because it is the experience of your worst-served one-in-twenty requests.

Deterministic: a simple latency model over synthetic requests. No real calls (their timings
would not be reproducible - Lesson 2.7).

Run:  python3 m09_production/l03_latency.py
"""

from __future__ import annotations

from learnai import section, title


# region: model
def latency_ms(prompt_tokens: int, output_tokens: int, ttft_ms: float, tokens_per_s: float) -> tuple[float, float]:
    """The two numbers that make up a response time:
      TTFT  - grows with the prompt (it must be read before the first token) plus a fixed base
      total - TTFT + the time to generate the output at the model's token rate
    Returns (ttft, total) in ms."""
    ttft = ttft_ms + prompt_tokens * 0.05          # ~0.05ms/token to process the prompt
    generate = output_tokens / tokens_per_s * 1000
    return ttft, ttft + generate
# endregion


# region: percentiles
def percentile(values: list[float], p: float) -> float:
    """The p-th percentile by the nearest-rank method (deterministic, no interpolation)."""
    s = sorted(values)
    k = max(0, min(len(s) - 1, round(p / 100 * len(s) + 0.5) - 1))
    return s[k]


def summarise(values: list[float]) -> str:
    mean = sum(values) / len(values)
    r = lambda x: int(x + 0.5)  # round half up, matching JS toFixed(0)  # noqa: E731
    return (f"mean={r(mean):6d}  p50={r(percentile(values, 50)):6d}  "
            f"p95={r(percentile(values, 95)):6d}  p99={r(percentile(values, 99)):6d}  (ms)")
# endregion


# region: traffic
def traffic() -> list[tuple[int, int]]:
    """A day's requests as (prompt_tokens, output_tokens). Mostly small, a heavy tail of
    long ones - which is exactly why the mean lies and the p95 matters."""
    reqs = []
    for i in range(950):
        reqs.append((400 + (i % 5) * 100, 120 + (i % 4) * 40))     # the common case
    for i in range(50):
        reqs.append((6000 + (i % 5) * 1000, 900 + (i % 3) * 300))  # the heavy tail
    return reqs
# endregion


def main() -> None:
    reqs = traffic()

    section("two-numbers")
    title("Latency is TTFT plus generation time")
    for label, (pt, ot) in [("short", (500, 150)), ("long", (8000, 1200))]:
        ttft, total = latency_ms(pt, ot, ttft_ms=200, tokens_per_s=60)
        print(f"  {label:6} prompt={pt:>5} out={ot:>4}: TTFT={ttft:5.0f}ms  total={total:6.0f}ms  (generation={total - ttft:5.0f}ms)")
    print("  output dominates total; prompt size dominates TTFT - they are tuned separately")

    section("percentiles")
    title("Report percentiles, not the mean - the tail is the SLO")
    totals = [latency_ms(pt, ot, 200, 60)[1] for pt, ot in reqs]
    print(f"  non-streaming total:  {summarise(totals)}")
    print("  the mean hides the 50 heavy requests; p95/p99 are the experience you promise against")

    section("streaming")
    title("Streaming moves the number the user feels to TTFT")
    ttfts = [latency_ms(pt, ot, 200, 60)[0] for pt, ot in reqs]
    print(f"  streaming (TTFT):     {summarise(ttfts)}")
    print("  same total work, but the user starts reading at p95 TTFT, not p95 total - a 10x better feel")

    section("throughput")
    title("Throughput is a separate axis from latency")
    concurrency = 8
    per_req_s = sum(totals) / len(totals) / 1000
    rps = concurrency / per_req_s
    print(f"  avg latency {per_req_s * 1000:.0f}ms, concurrency {concurrency} -> ~{rps:.1f} req/s capacity")
    print("  to serve more: raise concurrency (needs provider headroom), shorten outputs, or batch offline")

    section("levers")
    title("The latency levers, in order of effect")
    print("stream: cut perceived latency to TTFT (biggest UX win, no quality cost) - Lesson 5.2")
    print("shorten output: total scales with output tokens; cap max_tokens, ask for terse answers")
    print("shrink prompt: TTFT scales with prompt; retrieve less, cache the stable prefix (5.5)")
    print("route by task: a small model has lower TTFT and higher tokens/s for easy work (5.6)")
    print("measure p95/p99 continuously; alert on the tail, not the mean (9.8)")


if __name__ == "__main__":
    main()
