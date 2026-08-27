---
id: coding-agent
title: "Capstone — the repo-aware coding agent"
summary: "An agent that works in a real repository — reads code, proposes changes, runs the tests — under least privilege, in a sandbox, behind a human gate. The agent loop hardened for the one place the blast radius is your codebase: bounded tools, a stop condition, and a diff a human approves before anything merges."
modules: [5, 7, 8, 9, 11]
diagram: agent-loop-stops
---

## What you are building

An agent that takes a scoped engineering task — "add validation to this endpoint", "migrate these
call sites" — and works in a **real repository**: it reads the relevant files, proposes an edit,
runs the tests, and iterates until the tests pass or it gives up. Then a **human reviews the
diff** before anything merges. It is the [agent loop](#/lesson/7.2) with the guardrails turned up,
because here the tools touch your code.

```diagram
agent-loop-stops
```

This capstone is [Lab 7](#/lesson/7.2) hardened for production, and it leans directly on
[AI-assisted engineering](#/lesson/11.1): the agent drafts, the human owns the merge.

## 1 · Problem and user

- **User:** an engineer who wants a scoped, verifiable change drafted and tested, not hand-typed.
- **Job:** produce a **correct, reviewed** diff — or stop cleanly — never an unreviewed push.
- **Why AI (and where not):** planning and writing the change is probabilistic; the tools, the
  sandbox, the test gate, and the merge decision are deterministic and human-owned
  ([11.1](#/lesson/11.1)).

## 2 · Architecture, box by box

| Box | What it does | Built in |
|---|---|---|
| Agent loop | observe → think → act, with a hard stop condition | [7.2](#/lesson/7.2) |
| Tools | read_file, search, write_file, run_tests — bounded, audited | [7.3](#/lesson/7.3) |
| Sandbox | edits and test runs happen in an isolated worktree, no prod access | [9.5](#/lesson/9.5) |
| Budget envelope | max steps, max tokens, wall-clock timeout | [7.7](#/lesson/7.7) |
| Human gate | the final diff is reviewed; the agent never merges | [7.6](#/lesson/7.6), [11.1](#/lesson/11.1) |
| Tracing | every tool call and every model turn is logged | [5.7](#/lesson/5.7) |

## 3 · The build, assembled

The core is the [agent loop](#/lesson/7.2): the model observes (the task, the files it has read,
the last test output), proposes a tool call, your code runs it, and the result feeds the next
turn — until the **stop condition** (tests pass) or the **budget** (max steps / timeout) is hit
([7.7](#/lesson/7.7)). The tools are the leverage and the risk, so each has a tight
[contract and least privilege](#/lesson/7.3): `run_tests` executes only the test command, in a
**sandboxed worktree** ([9.5](#/lesson/9.5)) with no network and no credentials, so the worst
case is a failed test, not a leaked secret or a touched production system.

The agent's output is a **diff**, not a merge. A [human reviews it](#/lesson/11.1) — reading every
line as they would a junior's PR — and owns the decision. That gate is not optional; it is what
makes the whole thing safe to run.

## 4 · Eval plan (decided before you ship)

- **Golden set** ([8.2](#/lesson/8.2)): a set of tasks in a fixture repo, each with a known-good
  outcome (the tests that should pass, the files that should change).
- **Scorers** ([8.3](#/lesson/8.3)): did the tests pass (code), did it stay within the intended
  files (code), and a diff-quality judge for the cases that pass but are ugly.
- **The bar** ([8.4](#/lesson/8.4)): success rate on the task set, plus a cap on steps/cost per
  task. Re-run it on every prompt or model change.

## 5 · Failure modes and guardrails

- **Runaway loop** → step, token, and time budgets that stop it ([7.7](#/lesson/7.7)).
- **Scope creep / unintended edits** → sandboxed worktree + a diff review that catches it
  ([9.5](#/lesson/9.5), [11.1](#/lesson/11.1)).
- **Destructive or exfiltrating tool use** → least privilege: no network, no secrets, an
  allow-list of commands ([7.3](#/lesson/7.3)).
- **Confidently wrong code that passes weak tests** → the human review, and treating the agent's
  own tests with suspicion ([11.1](#/lesson/11.1)).

## 6 · Cost, latency, and rollout

Cost is steps × tokens per step; long files blow the context, so retrieve the relevant code
rather than pasting the repo ([6.1](#/lesson/6.1)). Cap the budget per task hard. Roll it out on
low-stakes, reversible tasks first (a refactor with strong tests), widen only as the success rate
on the golden set earns it, and keep the merge human throughout ([11.1](#/lesson/11.1)).

## What to harden next

- Add retrieval over the codebase so the agent reads the *right* files, not all of them.
- Give it a "explain the diff" step so the reviewer gets the reasoning, not just the change.
- Track the escape rate — tasks where it edited outside the intended scope — and drive it to zero.
- Add a second agent as a reviewer ([7.6](#/lesson/7.6)) before the human, to filter the obvious misses.
