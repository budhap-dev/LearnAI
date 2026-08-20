"""
Lesson 9.2 - The LLM gateway

Every model call in a serious system goes through one internal service: the gateway. It is
the single place that holds the API keys, enforces per-tenant quotas and rate limits, routes
to the right model (and falls back when one is down), and logs every call. Without it, keys
leak into a dozen services, one tenant starves the rest, and swapping a vendor is a
codebase-wide edit.

This example builds a tiny gateway and drives fake traffic through it - deterministic on
purpose: the point is the policy, not a model.

Run:  python3 m09_production/l02_gateway.py
"""

from __future__ import annotations

from dataclasses import dataclass, field

from learnai import section, title


# region: request
@dataclass
class Call:
    tenant: str
    task: str          # classify | answer | reason
    tokens: int


class Upstream:
    """A fake model endpoint that is sometimes down. The gateway must not care which vendor
    this is - it speaks one internal interface."""

    def __init__(self, name: str, healthy: bool = True) -> None:
        self.name = name
        self.healthy = healthy

    def send(self, call: Call) -> str:
        if not self.healthy:
            raise ConnectionError(f"{self.name} unavailable")
        return f"{self.name}: answered {call.task}"
# endregion


# region: gateway
@dataclass
class Gateway:
    """One door for every model call. It owns four concerns application code should never
    touch: credentials, routing, limits, and the audit log."""

    # routing: task -> ordered preference of upstreams (first healthy one wins)
    routes: dict[str, list[str]]
    upstreams: dict[str, Upstream]
    per_tenant_rpm: int = 3            # requests per minute per tenant (tiny, to show the limit)
    _counts: dict[str, int] = field(default_factory=dict)
    log: list[str] = field(default_factory=list)

    def handle(self, call: Call) -> str:
        # 1. rate limit per tenant - one noisy tenant cannot starve the others
        used = self._counts.get(call.tenant, 0)
        if used >= self.per_tenant_rpm:
            self.log.append(f"{call.tenant} {call.task} -> 429 rate limited")
            return "429 rate_limited"
        self._counts[call.tenant] = used + 1

        # 2. route by task, 3. fall back through the preference list on failure
        for name in self.routes.get(call.task, self.routes["default"]):
            upstream = self.upstreams[name]
            try:
                result = upstream.send(call)
                self.log.append(f"{call.tenant} {call.task} -> {name} ok")
                return result
            except ConnectionError:
                self.log.append(f"{call.tenant} {call.task} -> {name} DOWN, failing over")
                continue
        self.log.append(f"{call.tenant} {call.task} -> 503 no upstream")
        return "503 all_upstreams_down"
# endregion


def main() -> None:
    upstreams = {
        "small": Upstream("small-model"),
        "large": Upstream("large-model"),
        "large-backup": Upstream("large-backup"),
    }
    gw = Gateway(
        routes={"classify": ["small"], "answer": ["small"], "reason": ["large", "large-backup"], "default": ["small"]},
        upstreams=upstreams,
    )

    section("routing")
    title("One door routes each task to the right model")
    for call in [Call("acme", "classify", 200), Call("acme", "reason", 1500), Call("acme", "answer", 400)]:
        print(f"  {call.task:9} -> {gw.handle(call)}")

    section("rate-limit")
    title("Per-tenant rate limit: one tenant cannot starve the rest")
    gw2 = Gateway(routes={"answer": ["small"], "default": ["small"]}, upstreams=upstreams, per_tenant_rpm=3)
    for i in range(5):
        r = gw2.handle(Call("noisy", "answer", 300))
        print(f"  noisy request {i + 1} -> {r}")
    print(f"  quiet tenant still served -> {gw2.handle(Call('quiet', 'answer', 300))}")

    section("failover")
    title("The primary is down; the gateway fails over automatically")
    upstreams["large"].healthy = False
    gw3 = Gateway(routes={"reason": ["large", "large-backup"], "default": ["small"]}, upstreams=upstreams)
    print(f"  reason -> {gw3.handle(Call('acme', 'reason', 1500))}")
    for line in gw3.log:
        print(f"    log: {line}")

    section("why")
    title("What the gateway buys you")
    print("keys live in ONE service; application code never sees a vendor credential")
    print("routing and fallback are config, so swapping or adding a model is not a code change")
    print("per-tenant quotas and rate limits are enforced centrally, not hoped for per service")
    print("every call is logged in one place - the trace, cost and audit all start here (5.7, 9.4)")
    print("stay off Azure Functions etc.: the gateway is your service, not a per-call serverless bill")


if __name__ == "__main__":
    main()
