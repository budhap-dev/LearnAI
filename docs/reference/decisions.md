---
id: decisions
title: "Decision tables"
summary: "The recurring architecture choices in AI features, each as a table with a 'choose this when' line and the lesson that argues it. Written to be pasted into an ADR."
---

Every table has the same shape: the options across the top, the criteria down the side, and
a **choose this when** row. None of these choices is permanent — put a gateway in front of
model calls and a version on every prompt, index and artefact, and most of them are
reversible.

## Rules vs classic ML vs embeddings vs LLM

| | Rules / plain code | Classic ML | Embeddings + nearest neighbour | LLM |
|---|---|---|---|---|
| Input | known logic | tabular rows + labels | text (or anything embeddable) | free-form language, judgement |
| Latency | µs | ms | ms | hundreds of ms – seconds |
| Cost per call | ~0 | ~0 | tiny | metered per token |
| Explainability | read the code | feature contributions | "these were nearest" | weak; verify instead |
| Testing | assert | metrics on held-out rows | retrieval metrics | evals on rates |
| Failure shape | bug | miscalibrated score, drift | wrong neighbour | plausible wrong text |
| **Choose this when** | the rule can be written and exceptions are few | you have labelled tabular history and need speed/explainability | the task is similarity: search, dedup, routing, cheap classification | the input is language and the task is judgement over meaning — and the output can be checked |

**Usual composite:** LLM to turn language into structure → classic ML or rules on the structure. Argued in [3.1](#/lesson/3.1); see [1.1](#/lesson/1.1), [2.3](#/lesson/2.3).

## RAG vs fine-tuning vs long context

| | Retrieval (RAG) | Fine-tuning | Long context (send it all) |
|---|---|---|---|
| Adds | facts you supply per request, with citations | behaviour, format, style, domain vocabulary | nothing new — capacity to include more |
| Freshness | as fresh as the index | frozen at training | as fresh as what you send |
| Cost shape | embed once, retrieve per request; small prompts | a training project + eval; then normal inference | pay for every token every request |
| Failure | wrong or missing chunk retrieved | forgets, overfits, still hallucinates facts | lost in the middle; cost/latency |
| Explainability | citations to sources | none | weak |
| **Choose this when** | the answer depends on facts that change or are private — the default for knowledge | you need a consistent behaviour/format on your own data and have hundreds of good examples | one long document, low volume, high value — and you have measured that it works |

Almost never "instead of" RAG: fine-tuning changes *how* a model answers, retrieval changes *what it knows right now*. Argued in [2.5](#/lesson/2.5), [2.6](#/lesson/2.6); Module 6 and Module 10 in full.

## Workflow vs agent

| | Single call | Workflow (chain / router / parallel) | Agent (model in the loop) |
|---|---|---|---|
| Who decides the next step | nobody — one shot | your code, in a fixed graph | the model, from tool results |
| Predictability | high | high | low — bounded by budgets and stop conditions |
| Cost | one call | N known calls | unknown until it stops |
| Debugging | read the prompt | trace each step | trace a trajectory |
| **Choose this when** | transform / extract / classify | the steps are known: extract → decide → act; parallel fan-out; routing between models | the path genuinely depends on intermediate results (open-ended search, coding, multi-tool tasks) and errors are recoverable |

Start at the simplest tier that meets the need. Argued in [1.4](#/lesson/1.4); Module 7 in full.

## Hosted API vs cloud-platform hosted vs self-hosted

| | Vendor API | Same models via a cloud platform | Self-hosted open-weight |
|---|---|---|---|
| Model strength | strongest, newest first | same models, slight lag | usually weaker; improving fast |
| Data handling / region | vendor's terms and regions | your cloud's regions, contracts, identity | fully yours |
| Operations | none | none | GPUs, capacity, inference server, upgrades, on-call |
| Cost shape | per token | per token (often same rates) | fixed GPU cost; cheap at high, steady volume |
| Version control | pin, but versions retire | pin, but versions retire | pin forever |
| **Choose this when** | default; capability matters most | you need in-region processing, enterprise contracts, existing cloud billing | data cannot leave, or volume × price crosses the GPU line, or you must freeze a version |

Put a gateway in front so the choice is reversible. Argued in [1.5](#/lesson/1.5); Lessons 9.2, 9.6, 10.4.

## Synchronous vs streaming vs batch

| | Synchronous call | Streaming | Batch / async |
|---|---|---|---|
| User sees | the whole answer after the full latency | tokens as they arrive | results later |
| Fits | short outputs, machine-to-machine | chat, long answers, anything a person watches | offline processing, backfills, evals, nightly jobs |
| Cost | standard | standard | usually discounted; higher latency |
| Complexity | lowest | partial-JSON handling, cancellation | queueing, result collection |
| **Choose this when** | output is short and consumed by code | a human is waiting and the answer is more than a sentence | nobody is waiting and volume is large |

Lessons 5.2, 5.5.

## Vector database vs pgvector vs search engine

| | Dedicated vector DB | pgvector (Postgres) | Search engine (BM25 + vectors) |
|---|---|---|---|
| Scale | tens of millions+ vectors, ANN tuned | up to low millions comfortably | large; strong keyword + filters |
| Ops | one more system | your existing database | one more system, but familiar |
| Hybrid search | varies | joins with your data; BM25 via extensions | native |
| **Choose this when** | vectors are the product and scale is large | you already run Postgres and scale is moderate — the default start | you need keyword precision, filters and facets alongside vectors |

Lesson 6.4.

## Build vs buy (tooling)

| | Build | Buy / adopt |
|---|---|---|
| Gateways, tracing, evals, guardrails | thin, yours, fits your stack | faster start; vendor lock; features you do not use |
| **Choose to build when** | the component is small and central (a gateway, an eval runner over your golden set) | it is large and peripheral (observability UI, labelling tools) — but keep the data exportable |

Lesson 11.4 on frameworks: adopt for speed, but know what the framework abstracts and how to leave it.

## Model choice — the questions

Not a table of names (they change monthly — see [Model reference](#/reference/models)) but the questions that do not:

1. Does it do *my* task well on *my* data? — run a small eval before believing a leaderboard.
2. Context length, modality, tool calling, structured output — features you *need*.
3. Latency and cost at my volume — time to first token, tokens/second, price per million in and out.
4. Hosting, data handling, region.
5. Version pinning and deprecation policy.

Small models for classification, extraction and routing; large ones for judgement-heavy work; route between them. Lesson [2.8](#/lesson/2.8).
