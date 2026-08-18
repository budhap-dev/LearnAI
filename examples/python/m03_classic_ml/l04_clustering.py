"""
Lesson 3.4 - Clustering and anomaly detection

No labels, just rows. Two questions you can still answer:
  - "what groups are in here?"       -> clustering (k-means, from scratch)
  - "which rows are unlike the rest?" -> anomaly detection (a z-score, the simplest kind)

Both show up constantly in ordinary systems - ticket themes, user segments, weird
transactions, misbehaving hosts - and neither needs an LLM.

Run:  python3 m03_classic_ml/l04_clustering.py
"""

from __future__ import annotations

import math

from learnai import section, title

# region: data
# Per-host metrics: (cpu %, p95 latency ms). Three kinds of host are hiding in here,
# plus one that is just wrong. Nobody labelled anything.
HOSTS = [
    (12, 40), (15, 45), (10, 38), (18, 50), (14, 42),          # idle-ish
    (55, 120), (60, 130), (52, 115), (58, 125), (63, 140),     # busy
    (85, 300), (90, 320), (88, 310), (92, 340),                # saturated
    (20, 900),                                                 # ??? low cpu, huge latency
]
# endregion


# region: kmeans
def dist(a: tuple[float, float], b: tuple[float, float]) -> float:
    return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)


def kmeans(points, k: int, steps: int = 10):
    """Pick k starting centres, then repeat: assign each point to its nearest centre, move
    each centre to the mean of its points. It converges in a few steps and finds *some*
    grouping - which one depends on k and the start, so always look at the result."""
    centres = [points[i * len(points) // k] for i in range(k)]   # deterministic start
    for _ in range(steps):
        groups: list[list[tuple[float, float]]] = [[] for _ in range(k)]
        for p in points:
            nearest = min(range(k), key=lambda i: (dist(p, centres[i]), i))
            groups[nearest].append(p)
        centres = [
            (sum(p[0] for p in g) / len(g), sum(p[1] for p in g) / len(g)) if g else c
            for g, c in zip(groups, centres)
        ]
    return centres, groups
# endregion


# region: anomaly
def z_scores(values: list[float]) -> list[float]:
    """How many standard deviations from the mean each value is. |z| > 3 is the classic
    'this is not normal' line - crude, explainable, and often all you need."""
    mean = sum(values) / len(values)
    sd = math.sqrt(sum((v - mean) ** 2 for v in values) / len(values)) or 1.0
    return [(v - mean) / sd for v in values]
# endregion


def main() -> None:
    section("kmeans")
    title("k-means: find k groups without being told what they are")
    for k in (2, 3):
        centres, groups = kmeans(HOSTS, k)
        print(f"k = {k}:")
        for c, g in sorted(zip(centres, groups), key=lambda cg: cg[0][0]):
            print(f"  centre cpu {c[0]:5.1f}%, p95 {c[1]:6.1f}ms  <- {len(g)} hosts")
    print("k is yours to choose - the algorithm will happily split 3 kinds into 2 or 4.")
    print("Look at the groups and name them; if you cannot, the clustering is not useful yet.")

    section("anomaly")
    title("Anomaly detection: which rows do not belong?")
    latencies = [h[1] for h in HOSTS]
    zs = z_scores(latencies)
    for h, z in zip(HOSTS, zs):
        flag = "  <- anomaly" if abs(z) > 2.5 else ""
        print(f"  cpu {h[0]:>2}%, p95 {h[1]:>4}ms  z = {z:+.2f}{flag}")
    print("The (20, 900) host is 3+ standard deviations out. z-scores need a roughly bell-shaped")
    print("baseline; for anything else use isolation forests, robust stats or a learned model.")

    section("scale")
    title("Scale your features first - k-means uses distance")
    _, groups = kmeans(HOSTS, 3)
    sizes = "/".join(str(len(g)) for g in groups)
    print(f"raw units:  latency spans ~860, cpu spans ~80 -> distance is almost all latency; group sizes {sizes}")
    scaled = [(c / 100.0, l / 1000.0) for c, l in HOSTS]
    _, groups_scaled = kmeans(scaled, 3)
    sizes_scaled = "/".join(str(len(g)) for g in groups_scaled)
    print(f"scaled 0-1: both features count                                            -> group sizes {sizes_scaled}")
    print("Different groups from the same data. Neither is 'right' - the scaling decides what")
    print("'close' means, so choose it on purpose (Lesson 3.2) before any distance-based method.")


if __name__ == "__main__":
    main()
