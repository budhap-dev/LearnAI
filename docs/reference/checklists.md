---
id: checklists
title: "Checklists"
summary: "Production readiness, security, evaluation, incident review and data handling — as checklists you can paste into a review, each item pointing at the lesson that explains it."
---

Use these in design reviews and before launch. Each item is a question with a yes/no answer;
"not yet" is a fine answer as long as it is written down.

## Production readiness — for any feature with a model in it

**Design**
- [ ] The feature's shape is named: transform, extract/classify, or act ([1.4](#/lesson/1.4)).
- [ ] The sentence "When the model is wrong, …" is completed with a specific path ([1.6](#/lesson/1.6)).
- [ ] Judgement over meaning goes to the model; exactness, facts and side effects go to code ([1.4](#/lesson/1.4), [2.8](#/lesson/2.8)).
- [ ] Every side effect runs from code, under policy, with a human gate where the blast radius warrants.
- [ ] Facts the answer depends on are supplied in the prompt (retrieval, lookups) or verified afterwards — not recalled from the model ([2.1](#/lesson/2.1), [2.6](#/lesson/2.6)).
- [ ] The model has a first-class way to decline (`not_found`, a refusal path) and code handles it.

**Context and cost**
- [ ] The context window is budgeted: system, history, retrieved, answer reserve — with a truncation policy that logs what it dropped ([2.5](#/lesson/2.5)).
- [ ] Tokens per part per request are logged; p95 has an alert.
- [ ] Per-request and per-day token budgets exist; loops (retries, agents) are bounded.
- [ ] Sampler settings are chosen per task and documented ([2.7](#/lesson/2.7)).

**Evaluation**
- [ ] A golden set of real cases exists and runs on every prompt/model/index change ([3.3](#/lesson/3.3)).
- [ ] Results are rates over several runs, not single passes; per-slice, not one number.
- [ ] Someone has read a sample of failures.

**Operations**
- [ ] Prompt, model and index versions are pinned, logged with every request, and individually rollback-able ([3.5](#/lesson/3.5)).
- [ ] Every request has a trace: versions, tokens per part, `finish_reason`, retrieved sources, tool calls, validation outcome.
- [ ] Model-version changes from the vendor trigger the eval before adoption.
- [ ] Latency budget: time to first token and tokens/second are measured; timeouts have fallbacks.

## Security — OWASP LLM Top 10, mapped

| Risk | Question | Lesson |
|---|---|---|
| Prompt injection | Is everything the model reads (documents, emails, web pages, tool results) treated as untrusted? Are instructions and data separated in the prompt? | [1.6](#/lesson/1.6), 4.6, 9.5 |
| Insecure output handling | Is model output validated (schema, values, allow-lists) before any code acts on it or renders it? | [1.4](#/lesson/1.4), 4.3 |
| Training data poisoning | If you fine-tune, is the training data provenance controlled and reviewed? | 10.2 |
| Model denial of service | Are token budgets, request sizes and loop bounds enforced? | [2.5](#/lesson/2.5), 9.4 |
| Supply chain | Are model versions, weights (if self-hosted), and frameworks pinned and sourced deliberately? | [1.5](#/lesson/1.5), 9.8 |
| Sensitive information disclosure | Is PII kept out of prompts where possible, and out of logs always? Can the model be induced to reveal system prompts or other users' data? | 9.6 |
| Insecure plugin / tool design | Do tools have narrow contracts, least privilege, and validation of the model's arguments? | 7.3 |
| Excessive agency | Can the model take irreversible actions without a human gate? Is the blast radius of a wrong tool call bounded? | 7.6, 7.7 |
| Overreliance | Is model output presented as unverified where it is? Are people trained not to trust fluency? | [2.8](#/lesson/2.8) |
| Model theft | For self-hosted weights, are they protected like any other secret asset? | 10.4 |

Plus two that are not on that list but bite:
- [ ] Vector stores and embeddings have the same access controls as the source documents ([2.3](#/lesson/2.3)).
- [ ] The gateway holds the API keys; application code never sees them (9.2).

## Before launch — evaluation checklist

- [ ] The golden set is drawn from real traffic, covers the slices that matter, and includes the failure cases you know about ([3.3](#/lesson/3.3)).
- [ ] There is a baseline (the previous version, a rule, "always no") and the new thing beats it on the metric that matters.
- [ ] Precision and recall (or the task's equivalents) are reported at the deployed threshold, and the threshold was chosen with the people who bear the cost of each error.
- [ ] Results were run several times; variance is known.
- [ ] Twenty failures have been read by a human and are explainable.
- [ ] The eval runs in CI on every prompt/model/index change and blocks on regression.

## Incident review — questions for an AI-feature incident

1. Which source did the failure come from — model, input, system or organisation ([1.6](#/lesson/1.6))?
2. Which versions were live (prompt, model, index, artefact) and were they what we evaluated?
3. What did the model actually receive? (Trace: prompt, retrieved sources, tool results, tokens per part, truncation.)
4. What checked the output before it reached the user or a side effect — and why did that not catch it?
5. Would the golden set have caught it? If not, add the case.
6. Is the fix in the prompt, the input pipeline, the checks, the operations, or the process — and how will we know it worked?

## Data and privacy

- [ ] Where do prompts go — vendor, region, retention period? Is that in the data-processing agreement?
- [ ] Is PII minimised before it enters a prompt, and redacted in logs and traces?
- [ ] Are conversations and traces retained no longer than needed, with access controlled?
- [ ] If content is used to fine-tune, is that permitted by its licence and by user consent?
- [ ] For regulated decisions, is the decision of record made by something explainable, with the model as an aid ([3.1](#/lesson/3.1))?
- [ ] Are the model's known limitations and evaluation results documented (a model card for your feature)?
