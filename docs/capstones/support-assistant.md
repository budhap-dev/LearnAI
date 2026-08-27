---
id: support-assistant
title: "Capstone — the support assistant"
summary: "A grounded customer-support assistant that answers from your knowledge base, can take a small set of approved actions, refuses what it cannot ground, and is measured on a golden set before every change. The reference LLM feature end to end: RAG + tools + guardrails + evals, assembled from the building blocks you already have."
modules: [4, 5, 6, 7, 8, 9]
diagram: reference-architecture
---

## What you are building

A support assistant that a customer (or a support agent) asks a question, and that answers
**only from your documented knowledge**, with citations, escalating anything it cannot ground or
is not allowed to do. It can take a few **approved actions** (look up an order, start a return)
behind a human gate. It is not a chatbot bolted onto a docs site; it is the [reference
architecture](#/lesson/9.1) with every box filled in.

```diagram
reference-architecture
```

This capstone composes six modules. Nothing here is new — it is the assembly, and the assembly
is the skill.

## 1 · Problem and user

- **User:** a customer with a question your docs already answer, or a support agent who wants
  the answer faster and cited.
- **Job:** get a correct, grounded answer, or a clean handoff to a human — never a confident
  guess.
- **Why AI (and where not):** the language understanding and synthesis is genuinely
  probabilistic; the retrieval, the action approvals, and the guardrails are ordinary,
  deterministic software ([1.4](#/lesson/1.4)). Half the system is not the model.

## 2 · Architecture, box by box

| Box | What it does | Built in |
|---|---|---|
| Gateway | auth, rate limit, request id, one place all calls flow through | [9.1](#/lesson/9.1) |
| Retrieval | embed the question, hybrid search the KB, rerank, assemble cited context | [6.2](#/lesson/6.2), [6.4](#/lesson/6.4), [6.5](#/lesson/6.5) |
| Model call | grounded answer with citations, structured when acting | [5.1](#/lesson/5.1), [4.3](#/lesson/4.3), [6.6](#/lesson/6.6) |
| Tools | look-up-order, start-return — contracts, least privilege, audit | [5.3](#/lesson/5.3), [7.3](#/lesson/7.3) |
| Guardrails | input and output checks the model cannot argue past | [9.7](#/lesson/9.7) |
| Human gate | any action, and any low-confidence answer, escalates | [7.6](#/lesson/7.6) |
| Tracing / evals / cost | every request traced; the golden set gates changes; a budget cap | [5.7](#/lesson/5.7), [8.4](#/lesson/8.4), [5.6](#/lesson/5.6) |

## 3 · The build, assembled

The happy path is the [RAG pipeline](#/lesson/6.2): ingest the knowledge base once (embed each
doc), and per request embed the question, retrieve the top passages with [hybrid
search](#/lesson/6.4) and a [reranker](#/lesson/6.5), then ask the model to answer **only from
those passages, with citations** ([6.6](#/lesson/6.6)). If the passages do not contain the
answer, the model returns `NOT_COVERED` and the request escalates.

Actions are [tool calls](#/lesson/5.3) with tight contracts and [least privilege](#/lesson/7.3):
`lookup_order(order_id)` is read-only and safe; `start_return(order_id)` mutates, so it never
executes on the model's say-so — it emits a proposed action that a [human approves](#/lesson/7.6),
and the [output guard](#/lesson/9.7) blocks any action lacking an approval token.

## 4 · Eval plan (decided before you ship)

- **Golden set** ([8.2](#/lesson/8.2)): 50–100 real questions with a verified expected answer
  and the passage that grounds it, including the "we don't cover that" cases.
- **Scorers** ([8.3](#/lesson/8.3)): grounded-citation check (code), `NOT_COVERED` behaviour
  (code), and an LLM-as-judge for answer quality — paired with the deterministic checks.
- **The bar** ([8.4](#/lesson/8.4)): a threshold on the golden set that every prompt, model, or
  retrieval change must clear in CI before it ships. Also measure retrieval on its own
  ([6.7](#/lesson/6.7)) — a bad answer is usually bad retrieval.

## 5 · Failure modes and guardrails

- **Hallucinated answer** → grounding + citations, and refuse when not covered ([6.6](#/lesson/6.6)).
- **Prompt injection via a KB doc or the question** → input guards and treating retrieved text
  as untrusted ([4.6](#/lesson/4.6), [9.7](#/lesson/9.7)).
- **Unapproved or wrong action** → approval token gate + audit log ([7.3](#/lesson/7.3)).
- **PII or secret in the answer** → output guard on the bytes ([9.7](#/lesson/9.7)).

## 6 · Cost, latency, and rollout

Budget the tokens: retrieval context dominates input cost, so cap passages and cache the system
prompt ([5.5](#/lesson/5.5), [5.6](#/lesson/5.6)). Set a p95 target and watch it ([9.3](#/lesson/9.3)).
Roll out shadow → canary → on ([8.5](#/lesson/8.5), [9.8](#/lesson/9.8)), and name the owners of
the prompt, the golden set, and the cost line ([11.3](#/lesson/11.3)).

## What to harden next

- Add per-tenant KB isolation so retrieval can never cross customers.
- Feed every escalation and every thumbs-down back into the golden set ([8.5](#/lesson/8.5)).
- Add a second output guard: block any answer that makes a claim without a citation.
- Put a cheaper model on the easy questions and route ([5.6](#/lesson/5.6)) the hard ones up.
