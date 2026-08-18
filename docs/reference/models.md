---
id: models
title: "Model reference"
summary: "How to choose a model, and the one dated place this course keeps concrete model names and prices. Everything here goes stale; the questions do not."
---

> **Checked: 24 June 2026.** Prices are USD per million tokens from the vendor's own list; every
> vendor changes these several times a year, and cached, batch and long-context rates differ.
> Treat this page as a snapshot to be re-checked, never as the source for a cost estimate.

## How to choose

1. **Does it do my task well on my data?** Run a small eval on real cases before believing a
   leaderboard ([3.3](#/lesson/3.3), Module 8).
2. **Features you need**, not features it has: context length, image/document input, tool
   calling, structured output, streaming, batch, prompt caching.
3. **Latency and cost at your volume**: time to first token, tokens per second, price per
   million input and output tokens ([2.2](#/lesson/2.2), 9.3, 9.4).
4. **Hosting, data handling, region** — where the prompt goes ([1.5](#/lesson/1.5), 9.6).
5. **Version pinning and deprecation policy** — can it change under you (9.8)?

Then: **small models for classification, extraction and routing; large models for
judgement-heavy work; route between them** (5.6).

## Capability tiers — how to read any vendor's line-up

| Tier | Typical use | What you pay for |
|---|---|---|
| Frontier / flagship | hardest reasoning, agents, code, long multi-step work | highest per-token price and latency; the ceiling |
| Mid | most product features: assistants, RAG answers, drafting | a fraction of frontier cost; usually the default |
| Small / fast | classification, extraction, routing, high-volume transforms | cheapest and fastest; less judgement |
| Embedding | text → vector for search, RAG, clustering | tiny per-token cost; different pricing unit |
| Open-weight | self-hosting, data residency, customisation | GPU time instead of tokens; ops |

Every vendor's catalogue maps onto this table; only the names change.

## Snapshot — one vendor's current line-up (as of the date above)

The course's examples run through the `llm` adapter with a default model from this family
(see [README](https://github.com/budhap-dev/LearnAI#model-calls-the-llm-adapter-and-cassettes)).
Listed only because these are the models the recorded responses on this site come from; other
vendors offer equivalent tiers — consult their pricing pages, not this table.

| Model ID | Tier | Context | Input $/M | Output $/M | Notes |
|---|---|---|---|---|---|
| `claude-opus-5` | frontier | 1M | 5.00 | 25.00 | adaptive thinking on by default; the adapter's default |
| `claude-sonnet-5` | mid | 1M | 3.00 (2.00 intro to 2026-08-31) | 15.00 (10.00 intro) | strong default for product features |
| `claude-haiku-4-5` | small / fast | 200K | 1.00 | 5.00 | classification, extraction, routing |
| `claude-fable-5` | frontier+ | 1M | 10.00 | 50.00 | most capable; different API behaviour (thinking always on); higher retention requirements |

Rows for older versions (Opus 4.6–4.8, Sonnet 4.6) exist at similar prices; prefer current
IDs. Cloud-platform resales of the same models may price differently.

## What "price per token" hides

- **Input vs output** — output tokens usually cost ~5× input. A chatty answer costs more than
  a long prompt.
- **Cached input** — an unchanged prompt prefix can be served from cache at a fraction of the
  input price (5.5). Design prompts prefix-stable.
- **Batch** — asynchronous batch endpoints are commonly ~50% off. Use them for anything
  nobody is waiting for.
- **Long context** — some vendors step the price up above a context threshold. Sending less
  is cheaper twice over ([2.5](#/lesson/2.5)).
- **Thinking / reasoning tokens** — billed as output; can dominate cost on hard tasks (4.5).
- **Tokeniser differences** — the same text is a different number of tokens on different
  vendors ([2.2](#/lesson/2.2)). Measure with each vendor's counter before comparing.

## Keeping this page honest

This is the only place in the course where prices and model IDs appear. When the numbers
change, this page changes; the lessons do not. Re-check the date at the top before using it,
and file an issue if it is more than a few months old.
