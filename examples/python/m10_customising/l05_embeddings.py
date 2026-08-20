"""
Lesson 10.5 - Embedding models and domain adaptation

Retrieval (Module 6) is only as good as the embedding model: if two texts your users treat as
the same land far apart in vector space, no reranker downstream saves you. A general model does
not know your domain. Two fixes: pick a stronger base model, or ADAPT one to your domain using
(query, relevant-passage) pairs so the things that should match move closer.

This example measures the gain honestly. It embeds a small support corpus with a general model,
scores baseline retrieval, learns a tiny domain adapter from a handful of TRAINING pairs (tuned
by leave-one-out on those pairs), and re-measures on a HELD-OUT eval set - the only number that
counts. Embeddings are real recordings from a local model (nomic-embed-text); the adapter is
deterministic.

Run:  python3 m10_customising/l05_embeddings.py
"""

from __future__ import annotations

import math

from learnai import section, title
from learnai.llm import embed
from learnai.rag import cosine

# region: corpus
# A support corpus written in house style: terse, jargon-y instructions. The docs are what we
# retrieve; the ids are the labels a query should hit.
DOCS = [
    ("deploy",      "Shipping a release: run Skyline promote to push the new build to production."),
    ("rollback",    "Reverting a release: hit Skyline demote to restore the last known-good build."),
    ("rotate_key",  "Credential rotation: Vaultkeeper reissues service tokens and revokes the old ones."),
    ("oncall_page", "Incident response: Sentry-duty pages the on-call engineer and opens a bridge."),
    ("scale_up",    "Load handling: Autopilot adds worker replicas when the request queue grows."),
    ("trace_debug", "Debugging errors: Tracehub aggregates request traces to find the failing span."),
    ("cdn_flush",   "Purging the CDN: run Edgewipe to invalidate cached assets at the edge."),
    ("alert_mute",  "Silencing alerts: mute a noisy monitor in the alert console during maintenance."),
    ("api_limit",   "Rate limits: each API token is capped at 100 requests per second by the gateway."),
    ("queue_dlq",   "Dead-letter queue: messages that fail processing land in the DLQ for replay."),
]

# Held-out eval: plain-language questions a user types. NEVER used to fit the adapter - they are
# how we grade it. Users do not speak in the docs' jargon, which is exactly where retrieval slips.
EVAL = [
    ("get my new feature out to users",     "deploy"),
    ("go back to the version that worked",  "rollback"),
    ("refresh the API tokens",              "rotate_key"),
    ("get a person on the incident",        "oncall_page"),
    ("handle a sudden surge of users",      "scale_up"),
    ("locate the slow span",                "trace_debug"),
    ("stop users seeing the old assets",    "cdn_flush"),
    ("stop the pager during planned work",  "alert_mute"),
]

# Training pairs: (query, relevant doc id) - a DIFFERENT set of phrasings from EVAL. This is the
# labelled data you collect from click logs or annotation to adapt an embedding model.
TRAIN = [
    ("put the latest version in front of users",        "deploy"),
    ("release my changes so customers get them",        "deploy"),
    ("return to the previous working state",            "rollback"),
    ("undo the last release and go back",               "rollback"),
    ("replace the credentials the services hold",       "rotate_key"),
    ("cycle the secrets the app uses",                  "rotate_key"),
    ("notify the responsible engineer about an outage", "oncall_page"),
    ("get someone alerted when production is down",      "oncall_page"),
    ("keep up when demand suddenly jumps",              "scale_up"),
    ("add capacity for a rush of traffic",              "scale_up"),
    ("find the failing part of a slow request",         "trace_debug"),
    ("see where a request is going wrong",              "trace_debug"),
    ("clear what people are seeing from the cache",     "cdn_flush"),
    ("stop serving the stale files at the edge",        "cdn_flush"),
    ("quiet the notifications during a maintenance window", "alert_mute"),
    ("turn off paging while we do planned work",        "alert_mute"),
]
# endregion


# region: normalise
def unit(v: list[float]) -> list[float]:
    n = math.sqrt(sum(x * x for x in v))
    return [x / n for x in v] if n else v
# endregion


# region: metrics
def rank_of(query_vec: list[float], doc_vecs: list[list[float]], target: int) -> int:
    """1-based rank of the target doc when docs are sorted by similarity to the query."""
    order = sorted(range(len(doc_vecs)), key=lambda i: (-round(cosine(query_vec, doc_vecs[i]), 6), i))
    return order.index(target) + 1


def score(query_vecs: list[list[float]], doc_vecs: list[list[float]], targets: list[int]) -> tuple[int, float]:
    """Return (# ranked first, MRR) over an eval set. recall@1 is the count / total; MRR is the
    mean reciprocal rank, which also rewards moving a near-miss from rank 2 to rank 1."""
    ranks = [rank_of(q, doc_vecs, t) for q, t in zip(query_vecs, targets)]
    return sum(1 for r in ranks if r == 1), sum(1.0 / r for r in ranks) / len(ranks)
# endregion


# region: adapt
def augment(doc_vecs: list[list[float]], train_vecs: list[list[float]], targets: list[int], beta: float) -> list[list[float]]:
    """The adapter: nudge each passage toward the centroid of the TRAINING queries that should
    hit it, by beta. This closes the systematic gap between how users phrase questions and how
    the docs are written - a light-weight cousin of fine-tuning the embedding model itself, and
    the same idea behind attaching generated queries to a passage (doc expansion)."""
    dim = len(doc_vecs[0])
    out = []
    for j, dv in enumerate(doc_vecs):
        qs = [train_vecs[k] for k in range(len(train_vecs)) if targets[k] == j]
        if not qs:
            out.append(dv)
            continue
        centroid = [sum(q[i] for q in qs) / len(qs) for i in range(dim)]
        out.append(unit([dv[i] + beta * centroid[i] for i in range(dim)]))
    return out


def tune_beta(doc_vecs: list[list[float]], train_vecs: list[list[float]], targets: list[int]) -> float:
    """Pick the adapter strength by LEAVE-ONE-OUT on the training pairs: hold each pair out,
    build the adapter from the rest, and see if the held-out query still retrieves its doc.
    Never touches the eval set. Prefers the strongest beta among equally-good settings."""
    best_beta, best_mrr = 0.0, -1.0
    for step in range(1, 16):
        beta = round(step * 0.2, 1)
        total = 0.0
        for k in range(len(train_vecs)):
            others = [m for m in range(len(train_vecs)) if m != k]
            adapted = augment(doc_vecs, [train_vecs[m] for m in others], [targets[m] for m in others], beta)
            total += 1.0 / rank_of(train_vecs[k], adapted, targets[k])
        mrr = total / len(train_vecs)
        if mrr >= best_mrr:  # >= keeps the largest beta on a tie
            best_mrr, best_beta = mrr, beta
    return best_beta
# endregion


def f3(x: float) -> str:
    """Round-half-up to 3 decimals, identically in Python and TypeScript (no locale rounding)."""
    m = int(x * 1000 + 0.5)
    return f"{m // 1000}.{m % 1000:03d}"


def main() -> None:
    ids = [d[0] for d in DOCS]
    doc_vecs = [unit(v) for v in embed([f"{i}: {t}" for i, t in DOCS]).vectors]
    eval_vecs = [unit(v) for v in embed([q for q, _ in EVAL]).vectors]
    train_vecs = [unit(v) for v in embed([q for q, _ in TRAIN]).vectors]
    eval_targets = [ids.index(lbl) for _, lbl in EVAL]
    train_targets = [ids.index(lbl) for _, lbl in TRAIN]
    n = len(EVAL)

    section("baseline")
    title("Baseline retrieval with a general embedding model")
    b_hits, b_mrr = score(eval_vecs, doc_vecs, eval_targets)
    print(f"  held-out eval: recall@1 = {b_hits}/{n}   MRR = {f3(b_mrr)}")
    base_ranks = [rank_of(q, doc_vecs, t) for q, t in zip(eval_vecs, eval_targets)]
    for (q, lbl), r in zip(EVAL, base_ranks):
        print(f"    [{'ok ' if r == 1 else 'MISS'}] rank {r}  \"{q[:38]}\" -> want [{lbl}]")

    section("adapt")
    title("Learn a domain adapter from the TRAINING pairs only")
    beta = tune_beta(doc_vecs, train_vecs, train_targets)
    print(f"  {len(TRAIN)} labelled (query, passage) pairs; adapter strength beta = {beta:.1f}")
    print("  beta chosen by leave-one-out on the training pairs - the eval set is untouched")
    adapted_docs = augment(doc_vecs, train_vecs, train_targets, beta)

    section("gain")
    title("Re-measure on the SAME held-out eval - the only number that counts")
    a_hits, a_mrr = score(eval_vecs, adapted_docs, eval_targets)
    print(f"  before:  recall@1 = {b_hits}/{n}   MRR = {f3(b_mrr)}")
    print(f"  after:   recall@1 = {a_hits}/{n}   MRR = {f3(a_mrr)}")
    for (q, lbl), before in zip(EVAL, base_ranks):
        after = rank_of(eval_vecs[EVAL.index((q, lbl))], adapted_docs, ids.index(lbl))
        if before != 1 and after == 1:
            print(f"    fixed:  \"{q[:38]}\" -> [{lbl}]  (was rank {before}, now 1)")
        elif after != 1:
            print(f"    still:  \"{q[:38]}\" -> [{lbl}]  (rank {after}) - a jargon collision one adapter can't close")
    print(f"  a real, bounded gain from {len(TRAIN)} pairs; the rest wants a better base or more data")

    section("rules")
    title("Choosing and adapting embeddings in practice")
    print("choose the BASE model first: dimension, language/domain coverage, cost - a stronger base")
    print("  often beats adapting a weak one, and it is far less work")
    print("adapt with (query, relevant-passage) pairs from YOUR traffic - click logs, annotations")
    print("always grade on a HELD-OUT set with recall@k / MRR (6.7); training-set gains are a mirage")
    print("re-embed EVERYTHING when you change or adapt the model - query and corpus must share one space")
    print("the gain is real but bounded: adaptation aligns a domain, it does not fix a wrong base model")


if __name__ == "__main__":
    main()
