"""
Lesson 10.4 - Local and open-weight models

An open-weight model is one whose weights you can download and run yourself. That buys three
things a hosted API cannot: data never leaves your machine, there is no per-token bill, and
nothing breaks when a vendor deprecates a model. The costs are the ones the API was hiding -
you now own the hardware, the quantisation trade-off, and the licence.

This example runs a real local model (the same one the whole course records with, served by
Ollama - no API key, no network egress), then works the numbers that decide whether local is
worth it: how big the weights are at each quantisation, and what the licence actually permits.

Run:  python3 m10_customising/l04_local_models.py
"""

from __future__ import annotations

from learnai import section, title
from learnai.llm import DEFAULT_MODEL, complete

# region: run-local
def ask_local(question: str) -> str:
    """A normal complete() call - but the provider is a model running on THIS machine (Ollama).
    Same adapter, same code as every hosted call in Module 5; only the endpoint is local. No
    API key is read, and no bytes leave the host."""
    reply = complete(question, system="Answer in one or two plain sentences.", max_tokens=120, temperature=0)
    return reply.text.strip()
# endregion


# region: quantise
# Quantisation stores each weight in fewer bits. Fewer bits -> smaller file and less memory,
# at some quality cost. These are the standard formats; bytes-per-weight is the whole story
# for how much RAM/VRAM the weights need.
FORMATS = [
    ("fp32", 4.0,  "full precision - training / reference"),
    ("fp16", 2.0,  "half precision - the usual server default"),
    ("int8", 1.0,  "8-bit - ~half the memory, tiny quality loss"),
    ("int4", 0.5,  "4-bit - fits big models on one consumer GPU"),
]

def footprint_gb(params_billions: float, bytes_per_weight: float) -> float:
    """Weight memory in GB = params * bytes-per-weight. (Runtime also needs the KV cache and
    activations on top; this is the weights alone, which dominate for a chat model.)"""
    return params_billions * 1e9 * bytes_per_weight / 1024**3
# endregion


def main() -> None:
    section("run")
    title(f"A real answer from a LOCAL model ({DEFAULT_MODEL}, served by Ollama)")
    q = "In one sentence, what is model quantisation?"
    print(f"  Q: {q}")
    print(f"  A: {ask_local(q)}")
    print("  no API key was read; no request left this machine")

    section("size")
    title("Quantisation: the same 8B model at four precisions")
    params = 8.0  # an 8-billion-parameter model
    print(f"  a {params:.0f}B-parameter model, weights only:")
    for name, bpw, note in FORMATS:
        gb = footprint_gb(params, bpw)
        fits = "one 24GB GPU" if gb <= 24 else "needs >24GB / multi-GPU"
        print(f"    {name:5} {bpw:>4} B/wt  {gb:6.1f} GB  -> {fits:22}  {note}")
    print("  rule of thumb: int4 ~= params/2 GB, so an 8B model in 4-bit is ~4GB")

    section("worth")
    title("When local is worth it - and when the API still wins")
    print("LOCAL wins when: data cannot leave (privacy/regulation), volume is high and steady")
    print("  (no per-token bill), latency must be predictable, or you need offline / air-gapped")
    print("HOSTED wins when: you want the frontier model, spiky/low volume (pay per use), no")
    print("  ops team for GPUs, or you need the newest model the day it ships")
    print("the honest cost of local is the GPU, the quantisation tuning, and the on-call - not $0")

    section("licence")
    title("'Open weights' is not one licence - read it before you ship")
    rows = [
        ("Apache-2.0 / MIT", "commercial use, modify, redistribute - the permissive default"),
        ("Llama Community",  "permissive UNTIL you cross a large-user threshold, then negotiate"),
        ("Gemma terms",      "commercial OK, but a use-policy you must pass through to users"),
        ("research-only",    "evaluation / non-commercial - NOT for production, a common trap"),
    ]
    for name, terms in rows:
        print(f"    {name:18} {terms}")
    print("  'open weights' != open source and != unrestricted: the licence decides what you may ship")


if __name__ == "__main__":
    main()
