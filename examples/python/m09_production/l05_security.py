"""
Lesson 9.5 - Security: the OWASP LLM Top 10 as executable controls

A security review of an LLM feature is not a vibe; it is a checklist of known risk classes
(the OWASP LLM Top 10) each mapped to a concrete control, evaluated against your system's
actual configuration. This example encodes that mapping and runs it against two configs - a
naive one and a hardened one - so "are we secure?" becomes a list of open risks with the
control that closes each.

Deterministic: the "system" is a config object; the controls are predicates over it.

Run:  python3 m09_production/l05_security.py
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from learnai import section, title


# region: config
@dataclass
class SystemConfig:
    """What a reviewer actually inspects: how the system is wired, not what the model says."""

    fences_untrusted_input: bool      # documents/emails/web marked as data, not instructions
    tools_least_privilege: bool       # tools scoped to the caller; write tools propose (7.3, 7.6)
    validates_output: bool            # schema + value checks before acting/rendering (4.3)
    secrets_in_context: bool          # (bad) system prompt / keys reachable by the model
    data_scoped_by_caller: bool       # retrieval/tools filter by the user's authorisation
    output_classifier: bool           # disallowed-content check on the way out (9.7)
    pins_model_version: bool          # supply chain: version pinned, not floating (9.8)
    logs_pii: bool                    # (bad) raw prompts with PII into the app log
    rate_limited: bool                # per-tenant quotas at the gateway (9.2)
    human_gate_on_actions: bool       # irreversible actions need approval (7.6)
# endregion


# region: controls
# Each OWASP LLM risk -> the control predicate that mitigates it. `ok(config) == True`
# means the control is present. This is your security review, as code.
CONTROLS: list[tuple[str, str, Callable[[SystemConfig], bool]]] = [
    ("LLM01 Prompt injection", "fence untrusted input; never let data act as instructions",
     lambda c: c.fences_untrusted_input),
    ("LLM02 Insecure output handling", "validate output before acting on or rendering it",
     lambda c: c.validates_output),
    ("LLM03 Supply chain", "pin the model version; vet third-party tools/servers",
     lambda c: c.pins_model_version),
    ("LLM04 Model denial of service", "rate-limit and budget every caller",
     lambda c: c.rate_limited),
    ("LLM06 Sensitive info disclosure", "no secrets in context; scope data to the caller",
     lambda c: (not c.secrets_in_context) and c.data_scoped_by_caller),
    ("LLM07 Insecure plugin/tool design", "least privilege; write tools propose only",
     lambda c: c.tools_least_privilege),
    ("LLM08 Excessive agency", "human gate on irreversible actions",
     lambda c: c.human_gate_on_actions),
    ("LLM09 Overreliance", "output classifier + validation catch bad output",
     lambda c: c.output_classifier and c.validates_output),
    ("(privacy) PII in logs", "redact PII before it reaches logs (9.6)",
     lambda c: not c.logs_pii),
]


def review(config: SystemConfig) -> list[tuple[str, bool, str]]:
    return [(risk, ok(config), fix) for risk, fix, ok in CONTROLS]
# endregion


NAIVE = SystemConfig(
    fences_untrusted_input=False, tools_least_privilege=False, validates_output=False,
    secrets_in_context=True, data_scoped_by_caller=False, output_classifier=False,
    pins_model_version=False, logs_pii=True, rate_limited=False, human_gate_on_actions=False,
)
HARDENED = SystemConfig(
    fences_untrusted_input=True, tools_least_privilege=True, validates_output=True,
    secrets_in_context=False, data_scoped_by_caller=True, output_classifier=True,
    pins_model_version=True, logs_pii=False, rate_limited=True, human_gate_on_actions=True,
)


def show(name: str, config: SystemConfig) -> int:
    open_risks = 0
    for risk, ok, fix in review(config):
        mark = "ok  " if ok else "OPEN"
        print(f"  [{mark}] {risk}")
        if not ok:
            open_risks += 1
            print(f"         fix: {fix}")
    print(f"  {name}: {open_risks} open risk(s)")
    return open_risks


def main() -> None:
    section("naive")
    title("The 'ship the demo' config, reviewed")
    show("naive", NAIVE)

    section("hardened")
    title("The same feature, wired with the controls")
    show("hardened", HARDENED)

    section("mindset")
    title("Why security is structural, not a prompt")
    print("every control is a property of the SYSTEM (fencing, scoping, gating, validation),")
    print("not an instruction to the model - a model can be steered; a code boundary cannot (8.6)")
    print("the review is executable: it runs in CI, so a regression that removes a control fails")
    print("map each finding to an OWASP LLM id so coverage is auditable and nothing is forgotten")

    section("boundary")
    title("The one-line test for any LLM feature")
    print("'if the model were actively malicious, what could it make my system DO?'")
    print("the answer must be bounded by code - least privilege, gates, validation, scoped data -")
    print("never by the model's good intentions. that is the whole of LLM security.")


if __name__ == "__main__":
    main()
