---
id: document-pipeline
title: "Capstone — the document-processing pipeline"
summary: "A batch pipeline that turns a pile of messy documents — PDFs, scans, images — into validated structured records. Multimodal input, structured output with a schema, validate-and-retry, and the batch API for cost. The non-chat side of LLM engineering: no user waiting, just throughput and correctness at scale."
modules: [4, 5, 8]
diagram: modality-pipeline
---

## What you are building

A pipeline that ingests documents — invoices, forms, receipts, contracts — and emits **validated
structured records** into a database or queue. No one is chatting with it; it runs as a job over
thousands of files, and the whole game is **correctness at scale and cost per document.**

```diagram
modality-pipeline
```

This is the capstone that shows LLMs are not only chatbots. It composes multimodal input,
structured output, and the batch API.

## 1 · Problem and user

- **User:** a back-office process that today has people re-typing fields off documents.
- **Job:** extract the fields correctly, flag the ones the model is unsure about, and never
  silently emit a wrong record.
- **Why AI (and where not):** reading varied, unstructured layouts is the probabilistic part;
  the schema, the validation, the batching, and the routing of low-confidence records to a human
  are deterministic ([1.4](#/lesson/1.4)).

## 2 · Architecture, box by box

| Stage | What it does | Built in |
|---|---|---|
| Ingest | load files, detect type, page-split | ordinary code |
| Extract | multimodal call: image/PDF in, fields out | [5.4](#/lesson/5.4) |
| Structure | constrain the output to a JSON schema | [4.3](#/lesson/4.3) |
| Validate | schema + business rules; retry or flag on failure | [4.3](#/lesson/4.3), [5.1](#/lesson/5.1) |
| Batch | run the whole pile through the batch API for ~half price | [5.5](#/lesson/5.5) |
| Route | confident records land; unsure ones go to a human | [7.6](#/lesson/7.6) |

## 3 · The build, assembled

Each document is a [multimodal call](#/lesson/5.4): the image or PDF page goes in, and the prompt
asks for the fields. The output is **constrained to a schema** ([4.3](#/lesson/4.3)) so you get
valid JSON, not prose to parse. A [validate step](#/lesson/4.3) checks the schema *and* the
business rules (dates parse, totals add up, ids match a known format); a failure triggers one
retry with the error fed back, then flags the record if it still fails.

Because nothing is waiting on a response, run the pile through the [batch API](#/lesson/5.5) — the
single biggest cost win here, typically about half the price of online calls. The pipeline is
just Module 5's primitives arranged for throughput instead of latency.

## 4 · Eval plan (decided before you ship)

- **Golden set** ([8.2](#/lesson/8.2)): a labelled set of documents with the correct extracted
  fields, spanning the layouts and the hard cases (rotated scans, missing fields, two invoices
  on one page).
- **Scorers** ([8.3](#/lesson/8.3)): field-level exact/normalised match (code) — this is a
  measurable extraction task, so prefer deterministic scorers over a judge.
- **The bar** ([8.4](#/lesson/8.4)): per-field accuracy thresholds, plus a target for what
  fraction is auto-approved vs routed to a human. Track both — a model that flags everything is
  accurate and useless.

## 5 · Failure modes and guardrails

- **Confident wrong extraction** → business-rule validation catches what the schema cannot
  (a total that does not sum, an impossible date).
- **Malformed output** → schema constraint + validate-and-retry ([4.3](#/lesson/4.3)).
- **Low-confidence field** → the model returns a confidence or leaves it null; route to a human
  rather than guess ([7.6](#/lesson/7.6)).
- **Injection via document text** → treat extracted text as data, never as instructions
  ([4.6](#/lesson/4.6)).

## 6 · Cost, latency, and rollout

Cost per document = tokens per page × pages, and the [batch API](#/lesson/5.5) roughly halves it;
[cache](#/lesson/5.5) the extraction prompt across the run. Latency is throughput, not p95 — size
the batch and the concurrency. Roll out by running the pipeline in **shadow** against documents a
human already keyed, compare, and only then let it write ([8.5](#/lesson/8.5)).

## What to harden next

- Add a confidence-calibrated auto-approve threshold and tune it on the golden set.
- Keep a sample of auto-approved records in a human audit loop to catch drift ([9.8](#/lesson/9.8)).
- Split extraction by field group when one hard field drags the whole prompt's accuracy down.
- Add a cheaper first-pass model and escalate only the pages it is unsure about ([5.6](#/lesson/5.6)).
