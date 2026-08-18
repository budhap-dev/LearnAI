# LearnAI — Product Stories & Delivery Plan

An interactive **static web app** that teaches AI — from first principles to production —
**for working software professionals: senior developers, tech leads and architects**. This is
not a computer-science course and not a "prompt tips" listicle: the aim is that an experienced
engineer finishes knowing *what AI can and cannot do, how the pieces work, and how to put them
into a real software system responsibly* — and can defend the design in a review. Three levels (Basic → Intermediate → Advanced),
~66 illustrated lessons, ~120 diagrams, ~20 interactive explorers, 660 quiz questions, and
runnable, verified code in Python and TypeScript. Sister project to
[LearnCSharp](../LearnCSharp/STORIES.md); same stack, same discipline.

**Status:** in delivery — walking skeleton built locally (lesson 2.2 end to end), not yet deployed · **Last updated:** 18 August 2026

---

## 0. Delivery status — at a glance

Legend: ✅ done · 🟡 partly done · ⬜ not started. Each story below carries the same tag.

| Area | State |
|---|---|
| **Deployed site** | 🟡 workflow written; Azure SWA resource + secret still to create |
| **Lesson notes** | 🟡 **20 / 66** — Modules 1, 2 and 3 complete (the whole Basic level) |
| **Example code (Python + TS)** | 🟡 10 / 48 — 1.2, 2.1, 2.2, 2.3, 2.5, 2.7, 3.2, 3.3, 3.4, 3.5 in both languages, byte-identical output enforced by the build |
| **Verified output pipeline** | ✅ harnesses capture regions + outputs → build validates every fence and that Python/TS agree → site (cassettes for LLM-dependent examples still to design) |
| **Diagrams** | 🟡 20 / ~120 — all of Modules 1–3 |
| **Interactive explorers** | 🟡 7 / ~20 — tokeniser, sampling, embeddings, attention, context-budget, gradient-descent, confusion-matrix |
| **Quizzes** | 🟡 200 / 660 — Modules 1–3, options shuffled; 40 check cards |
| **Site features** | 🟡 home with pathway chooser, syllabus (pathway-aware, route list), lesson page with Py/TS code tabs, output blocks, diagrams, explorers, check-yourself cards, quiz; **full-text search** (header + page); **progress dashboard** with export/import/reset; header progress ring; six themes |
| **Pathways** | 🟡 Orientation · Builder · Architect — chooser, syllabus route order, pathway-aware prev/next; no depth toggles or audience-tagged questions yet |

**M0 walking skeleton is built and verified locally** — lesson 2.2 *Tokens* renders end to end with
the tokeniser explorer, a diagram, traced Python + TypeScript code with captured output, a
10-question quiz and localStorage progress. **Remaining for M0:** create the Azure Static Web
App (Free) and add its token as a repo secret; the CI workflow is already in place.

---

## 1. The story

> **Dev, senior engineer, 12 years.** Dev is good at software. Last quarter the product team asked
> for "an AI feature". Dev wired a chat box to an LLM API in an afternoon and it demoed
> beautifully. Then it made up a refund policy in front of a customer, the bill tripled in a week,
> and nobody could say whether the new prompt was better than the old one. Dev has read four blog
> posts and a paper abstract and is no clearer on *what actually happened* or how to build it
> properly.

The app exists so that Dev's next six weeks go like this instead:

1. **Day one.** Dev opens the site, picks the **Builder** pathway, and is dropped into Module 2:
   *How LLMs actually work*. Lesson 2.2 shows the sentence they typed being split into tokens
   live in the browser — and why "strawberry" is three tokens and why that matters for cost, for
   counting letters, and for context limits.
2. **The lesson** is one scrollable page. Every mechanism is a diagram before it is a paragraph:
   the context window as a fixed-size buffer, attention as "which earlier tokens matter now",
   temperature as a dial on a probability distribution Dev can drag. Code is Python *and*
   TypeScript, side by side, and the output shown underneath is real — captured from a run, not
   typed.
3. **Halfway down**, a *Check yourself* card: "A model 'hallucinates' a fact. Is that a bug in
   the model?" Dev says yes; the card explains that a language model is a next-token sampler, not
   a database — and Dev finally understands why the refund policy happened.
4. **Week two.** Dev reaches Module 6 (*RAG*), builds the chunking → embed → retrieve → cite
   pipeline in the stepper, and realises the fix for the refund incident is retrieval with
   citations plus a refusal path — not a longer prompt.
5. **Week three.** Module 8 (*Evals*). Dev writes a 40-case golden set from real support
   tickets, runs it against two prompts, and can now say *"the new prompt is 12 points better on
   grounded-answer rate and 3 points worse on refusal precision"* to their product manager.
6. **Week five.** Module 9 (*Production*): a gateway, caching, token budgets, tracing, prompt
   injection defences, and a cost dashboard. The bill is predictable. The architecture diagram
   in the lesson becomes the one Dev draws on the whiteboard at work.
7. **Six weeks later**, Dev is reviewing a colleague's agent design and asks the right questions
   — *what's the tool contract, where's the human checkpoint, how do we eval it, what happens when
   the model returns garbage* — because every step from "what is a token" to here was one small
   increment with a picture and a checkpoint.

**The product promise:** *every mechanism is drawn, every claim is runnable, and never more than
one screen of theory before something to do.*

---

## 2. Who it is for

| Persona | Level | Needs | Success looks like |
|---|---|---|---|
| **Dev** — senior engineer, 12 yrs, no ML background | Basic → Advanced | Mental models, honest limits, production patterns, "what do I actually need to know" | Ships an LLM feature with evals, guardrails, cost control and observability, and can defend the design |
| **Priya** — tech lead / architect | Intermediate → Advanced | Decision frameworks: build vs buy, RAG vs fine-tune, agent vs workflow, hosted vs local; risk, cost, security, compliance | Chooses and justifies an architecture; writes the ADR |
| **Marcus** — experienced developer, mid-career, new to AI work | Basic → Intermediate | Fast orientation, vocabulary, a working mental model in a week, small end-to-end wins | Explains RAG and tool calling correctly to their team; builds a small assistant end to end |
| **Alex** — senior engineer moving towards ML/platform work | Advanced | Fine-tuning, local models, deeper transformer internals, research reading | Fine-tunes a small model on their own data and measures the gain |
| **Jordan** — engineering manager / staff engineer | Basic + decision aids | What is realistic, what it costs, what can go wrong, how to judge a demo or a design | Asks "how are we evaluating this?" and understands the answer |

All five are **working professionals**. There is no student pathway, no exam framing, and no
"beginner programmer" content — the course assumes fluency in software engineering and teaches
only the AI.

### 2.1 One body of content, three pathways

The same 66 lessons, entered three ways. The pathway changes **route, framing and emphasis**,
never the ceiling. Nobody sees a stripped-down version.

| | 🟢 **Orientation** — "I need the mental models, fast" | 🔵 **Builder** — "I have to ship a feature" | 🟣 **Architect** — "I own the system and the risk" |
|---|---|---|---|
| **Entry point** | 1.1 What AI actually is | 2.1 What an LLM is (Module 1 refresher offered) | 9.1 Reference architecture, then backwards by need |
| **Route** | Modules 1 → 2 → 3, then 4 lightly | Modules 2 → 3 → 4 → 5 → 6 → 8, then 9 | 2 (skim) → 6 → 7 → 8 → 9 → 10, plus 11 |
| **Pace shown** | ~3 weeks | ~6 weeks | ~4 weeks |
| **Framing** | mental models, analogies to systems you already build | "here is the code, here is what breaks" | trade-offs, decision tables, failure modes, ADR templates |
| **Extras surfaced** | glossary chips, "in one sentence" cards, "what to tell your team" | code in both languages, gotchas, cost notes | decision matrices, threat models, capacity/cost maths, checklists |
| **Depth toggles** | collapsed | expanded | expanded, plus "for the ADR" boxes |
| **Tone** | concise, jargon defined on first use, no hand-holding | direct, practical | terse, assumes engineering fluency |

**Level bands** (used for badges and filtering, independent of pathway):
**Basic** = Modules 1–3 · **Intermediate** = Modules 4–7 · **Advanced** = Modules 8–11.

---

## 3. Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| **Hosting** | **Azure Static Web Apps — Free tier** | £0; free SSL, CDN, GitHub Actions built in. Same rules as LearnCSharp §3.2: no Functions, no Insights, no storage, £0 budget alert |
| **Stack** | **React 19 + TypeScript (Vite)**, HashRouter, **npm** | Reuse the LearnCSharp shell, components, theme system and progress store — proven, and the owner knows React |
| **Example languages** | **Python and TypeScript, side by side** | Python is the lingua franca of AI; TypeScript is what most product engineers ship. Every code lesson shows both |
| **Provider stance** | **Provider-neutral concepts; a thin `llm` adapter in the examples** | Concepts (tokens, tools, RAG, evals) outlive any vendor. Examples run against one default provider through an adapter, and lessons say what differs elsewhere |
| **Model execution in-browser** | **None for real models.** Explorers use tiny client-side simulations or pre-computed data | Keeps the site static, fast, key-free. A JS BPE tokeniser is the one "real" component (it is small and deterministic) |
| **API calls from the browser** | **Optional, BYO-key playground only** (US-1207); key held in `sessionStorage`, never sent anywhere but the provider | Lets a reader experiment without us running a backend or paying for tokens |
| **Output shown** | **Captured from real runs** — deterministic examples run in CI; LLM-dependent examples run against **recorded responses** (cassettes) that are refreshed deliberately | Output is real, never hand-typed; CI does not need a key or spend money |
| **Progress storage** | `localStorage` + JSON export/import | No accounts, no backend, no personal data leaves the device |
| **Content source** | `docs/module-N/*.md` notes + `examples/python/`, `examples/ts/` | Same single-source discipline as LearnCSharp |
| **Maths depth** | Intuition first, formula second, always optional | The audience is engineers, not researchers. Vectors, dot product, gradient, probability — no more than that in the main line |
| **Example toolchain** | **Python 3.12+ stdlib, plain `python3`; TypeScript run natively by Node 24 (`node file.ts`)** — no uv, no pnpm, no tsx | Zero install for a reader who clones the repo; CI is two setup actions. Third-party packages only when a lesson genuinely needs them |

### 3.1 The examples project is the correctness harness

There is no .NET console app this time; the equivalent is an `examples/` workspace that CI runs.

```
examples/
  python/            plain python3 - one file per lesson, e.g. m02_llms/l02_tokens.py
  ts/                Node 24 runs .ts directly - one file per lesson, e.g. m02_llms/l02_tokens.ts
  shared/            fixtures: sample docs, golden eval sets, recorded LLM responses (cassettes)
        |
        |  build step: python3 -m harness capture  /  node harness.ts capture  -> web/public/data/captures/{python,ts}/<id>.json
        v
web/src/content/     Markdown + captured real output
        |
        |  vite build
        v
dist/                the static site
```

Rules:

1. **Deterministic examples** (tokenising, chunking, cosine similarity, eval scoring, cost
   maths, an agent loop over fake tools) run for real in CI on every build.
2. **LLM-dependent examples** run against **recorded responses**. A `RECORD=1` run with a key
   refreshes the cassettes; the diff is reviewed like code. The lesson shows the model and date
   the response was recorded.
3. A failing example fails the build. **No lesson can show output the code did not produce.**
4. Every snippet on the site is a **traced extract** of an example file — a ```` ```code
   region-name ```` fence in the notes pulls the `# region: region-name` / `// region:` block
   out of both example files — so a snippet can never drift from the code that ran.
5. Python and TypeScript examples are **twins**: same regions, same `section()` markers, and the
   build **fails if their captured output differs**. One `<Output>` block therefore serves both
   language tabs.

### 3.2 What we are deliberately *not* teaching

| Not in the main line | Why | Where it lives instead |
|---|---|---|
| Deriving backprop, linear algebra proofs | not needed to build well; scares off the target reader | 2.4 optional "under the hood" fold, appendix reading list |
| Training a foundation model from scratch | nobody in the audience will | one lesson of intuition (2.6), no more |
| Every framework (LangChain, LlamaIndex, Semantic Kernel, DSPy…) | churn; concepts first | 11.4 *Frameworks — what they abstract and when to use one*, plus a comparison table |
| A specific vendor's console/UI | changes monthly | never; the adapter isolates it |
| Kaggle-style notebook data science | different job | 3.x classic ML is "for engineers who will *use* it", not "become a data scientist" |

---

## 4. Scope

**In scope (v1)**

- 66 lessons across 11 modules, Basic → Intermediate → Advanced (§8)
- Three pathways over one body of content
- ~120 diagrams; ~20 client-side interactive explorers
- Runnable Python + TypeScript examples for every code lesson, with verified output
- One quiz per lesson, one test per module, inline check-yourself cards
- Worksheets/labs per module with model solutions (build-it-yourself, offline)
- Progress, streaks, weak-topic revision
- Reference: glossary, decision tables, checklists (production readiness, security), model-choice
  cheat sheet, cost calculator, reading list, prompt pattern library
- Dark mode, mobile, keyboard, screen reader

**Out of scope (v1)** — recorded in §11

- Running real models in the browser (WebGPU/ONNX) — revisit
- Accounts, cloud sync, team dashboards
- Video, certificates
- Anything requiring a server (the BYO-key playground is client → provider only)

---

## 5. Site map

```
/                          home - choose a pathway, or continue where you left off
/pathway/orientation           mental-model route, ~3 weeks
/pathway/builder           ship-a-feature route, ~6 weeks
/pathway/architect         own-the-system route, ~4 weeks
/syllabus                  11 modules, 66 lessons, level badges, progress per lesson
/module/6                  module overview: lessons, lab, module test
/module/6/6.3              a lesson page
/module/6/6.3/quiz         the lesson quiz
/module/6/test             end-of-module test
/module/6/lab              the module lab (worksheet) and model solution
/explore                   index of all interactive explorers (also embedded in lessons)
/explore/tokeniser         paste text -> tokens, count, cost
/explore/sampling          temperature / top-p / top-k on a live distribution
/explore/embeddings        similarity between phrases in 2-D
/explore/attention         which tokens attend to which (pre-computed)
/explore/context-budget    system + history + retrieved + output on one bar
/explore/chunking          chunk strategies over a real document
/explore/rag-stepper       query -> embed -> retrieve -> rerank -> answer with citations
/explore/agent-loop        observe -> think -> act -> tool result, step by step
/explore/cost              tokens x price x traffic = monthly bill
/explore/eval-runner       golden set x two prompts -> scorecard
/progress                  dashboard, streak, weak topics
/revise                    mixed quiz from weak topics
/reference/glossary        every term, defined, linked
/reference/decisions       RAG vs fine-tune vs long context; agent vs workflow; hosted vs local ...
/reference/checklists      production readiness, security (OWASP LLM Top 10), eval, launch
/reference/patterns        prompt & architecture pattern library
/reference/models          how to choose a model: capability, cost, latency, context, licence
/reference/reading         papers and posts worth your time, by lesson
/search                    full-text search
/about                     how to use the site, how to run the examples
```

---

## 6. Content model

Each lesson is one Markdown file with typed frontmatter, validated by a build script (Zod).
A malformed lesson breaks the build, not the site.

```yaml
---
id: "6.3"
module: 6
title: "Chunking - splitting documents so retrieval works"
level: intermediate            # basic | intermediate | advanced
summary: "Why chunk size and overlap decide RAG quality more than the model does."
objectives:
  - "Choose a chunking strategy for a given document type"
  - "Explain the retrieval trade-off between small and large chunks"
  - "Measure retrieval hit-rate on a golden set"
prerequisites: ["6.1", "6.2"]
estimatedMinutes: 30
audiences: [builder, architect]     # orientation sees it in the syllabus but not on the route
pathwayOrder: { orientation: skip, builder: 27, architect: 12 }
languages: [python, ts]             # which example languages exist for this lesson
examples:
  python: "examples/python/m06_rag/l03_chunking.py"
  ts: "examples/ts/m06_rag/l03_chunking.ts"
explorers: ["chunking"]
diagrams: ["chunk-overlap", "chunk-size-vs-recall"]
tags: [rag, retrieval, embeddings]
---
```

### 6.1 Code and output blocks

````markdown
<Code lesson="6.3" region="chunk-by-tokens" />         <!-- renders Python and TS tabs -->

<Output lesson="6.3" marker="chunk-stats" />           <!-- captured; shows recorded-on date if LLM-dependent -->
````

`<Code>` pulls a `# region:` / `// region:` marked extract from the example file. `<Output>` pulls
from the JSON the harness captured. Nothing is typed by hand.

### 6.2 Question schema

```yaml
- id: "6.3-q4"
  type: multiple-choice
  difficulty: 2
  topic: "chunk size"
  stem: "Retrieval returns the right document but the answer misses the key fact. Most likely cause?"
  options:
    - "Chunks are too large, so the fact is diluted in the embedding"
    - "The model's temperature is too high"
    - "The vector store is not indexed"
    - "The system prompt is too short"
  answer: 0
  explanation: "A big chunk embeds the average of many ideas; the specific fact stops standing out. Smaller chunks (with overlap) or a parent-child scheme fix this."
  reviewLink: "6.3#chunk-size"
```

### 6.3 Diagrams

Diagrams are **content, not decoration**. Almost everything in this course is a *pipeline, a
buffer, a loop or a distribution* — the exact things a paragraph explains badly and a picture
explains well.

**Rule:** if a concept involves *structure, flow, time or probability*, it gets a diagram.

```markdown
<Diagram src="context-window-budget"
         caption="One fixed buffer: system prompt, history, retrieved context and the answer all share it"
         alt="A horizontal bar split into four labelled segments; the output segment shrinks as retrieved context grows" />
```

| Approach | Used for | Client JS |
|---|---|---|
| **Inline SVG** (authored, themed) | pipelines, buffers, memory layouts, vector spaces, architecture | none |
| **Mermaid at build time** | sequence diagrams (client → gateway → model → tool), flowcharts, decision trees | none |
| **Explorers** (React islands) | anything with a dial or a step: sampling, attention, RAG, agent loop, gradient descent | lazy, ≤15 KB each |

All must: use site colour tokens, work light and dark, carry a real `alt`, be legible at 320px.

### 6.4 Explorers — the interactive layer

Client-side only, no keys, no network. Each is a small React component with a typed props
contract, embeddable in a lesson (`<Explorer id="sampling" preset="low-temp" />`) and standalone
under `/explore`.

| Explorer | Teaches | Data source |
|---|---|---|
| `tokeniser` | tokens, count, cost, why letters ≠ tokens | JS BPE tokeniser (bundled, lazy) |
| `sampling` | temperature, top-p, top-k, greedy vs sampled | synthetic next-token distribution |
| `embeddings` | similarity, nearest neighbours, "meaning as geometry" | ~200 pre-computed 2-D projected vectors |
| `attention` | which tokens attend to which | pre-computed heatmaps for 6 sentences |
| `context-budget` | the fixed window; what gets truncated | interactive sliders |
| `chunking` | fixed / sentence / recursive / semantic; overlap | one bundled sample document |
| `rag-stepper` | retrieve → rerank → assemble → answer → cite | tiny bundled corpus, cosine in-browser |
| `agent-loop` | observe/think/act; tool call → result → next step | scripted trace, step through |
| `cost` | tokens × price × traffic; caching effect | user inputs |
| `eval-runner` | golden set, scorer, two prompts, scorecard | bundled 20-case set |
| `gradient-descent` | loss surface, learning rate | 2-parameter toy |
| `nn-playground` | layers, activations, decision boundary | tiny in-browser network |
| `confusion-matrix` | precision/recall/F1 with a threshold slider | synthetic scores |
| `injection-lab` | prompt injection: see the payload, see the defence | scripted |
| `hybrid-search` | keyword vs vector vs hybrid ranking | bundled corpus |
| `finetune-vs-rag` | decision matrix, weighted by your answers | rules |

### 6.5 Question types

Same nine as LearnCSharp (`multiple-choice`, `multi-select`, `true-false`, `predict-output`,
`spot-the-bug`, `fill-the-blank`, `ordering`, `matching`, `short-answer`) plus one new one:

| Type | Looks like | Best for |
|---|---|---|
| `design-choice` | scenario + 3–4 architectures, pick and justify against a rubric | Architect pathway; RAG vs fine-tune, agent vs workflow, sync vs async |

`predict-output` here means "what does this pipeline / tokeniser / scorer produce", not "what
does the LLM say" — we never quiz on non-deterministic model output.

---

## 7. Epics

| # | Epic | Goal |
|---|---|---|
| **E1** | Foundation & shell | Deployed, navigable skeleton reusing the LearnCSharp shell |
| **E2** | Lesson content pipeline | 66 lessons from Markdown with traced code and verified output |
| **E3** | Navigation & discovery | Nobody is lost; search, syllabus, continue |
| **E4** | Quizzes & assessment | Every lesson ends in a checkpoint; module tests |
| **E5** | Labs & worksheets | Build-it-yourself practice with model solutions |
| **E6** | Progress & motivation | Dashboard, streaks, weak-topic revision |
| **E7** | Reference & decision aids | Glossary, decision tables, checklists, patterns, model chooser |
| **E8** | Quality & accessibility | Fast, accessible, mobile, offline |
| **E9** | Authoring, examples & CI | Adding a lesson is easy; the harness cannot silently break |
| **E10** | Diagrams & visualisation | Every pipeline, buffer, loop and distribution is *drawn* |
| **E11** | Audience pathways | One site for an engineer new to AI and a principal architect |
| **E12** | Explorers | Interactive, key-free, in-browser mechanisms |

---

## E1 — Foundation & shell

### US-101 · Project skeleton *(Must, M)* · ✅ done
**As a** developer **I want** a typed, buildable web project **so that** content can be built
into a static site.
- [x] `web/` created with Vite + React 19 + TypeScript strict; `dev`, `build`, `preview`, `lint`
- [x] Shell components (header, footer, theme picker, progress store, Markdown renderer,
      diagram registry, quiz player) **ported from LearnCSharp** — copied per component, not a shared package (open question 7)
- [x] README documents setup for `web/` and `examples/`

### US-102 · Site shell and layout *(Must, M)* · 🟡 partial — *header/nav/footer/theme picker/search box/progress ring; no sidebar or level filter*
- [ ] Header: logo, search, level filter (Basic/Intermediate/Advanced), progress ring, theme
- [ ] Sidebar: current module's lessons; collapses to a drawer < 768px
- [ ] Footer: prev/next, "edit this page", "run this example" link to GitHub

### US-103 · Deploy pipeline to Azure *(Must, S)* · 🟡 partial — *workflow written and gated on examples + content build; SWA resource, token secret, budget alert outstanding*
- [x] `azure-static-web-apps.yml` typechecks + runs both harnesses + builds `web/`; deploy step skips cleanly until the token secret exists
- [ ] Azure SWA **Free** created and linked
- [ ] Build fails ⇒ no deploy; PRs get a staging URL
- [ ] No API/Functions folder · £0 budget alert · custom domain (later)

### US-104 · Design system *(Should, M)* · 🟡 partial — *tokens/six themes/level colours/language tabs in; callout components not yet*
- [ ] Tokens, type scale, six themes reused; new **level colours** (green/blue/purple) and
      **language tabs** (Python/TS) styling
- [ ] Callouts: Note · Careful · Production tip · For the ADR · Try it · Myth vs reality

---

## E2 — Lesson content pipeline

### US-201 · Content schema and validation *(Must, M)* · ✅ done
- [x] Zod schema for §6 frontmatter, run in `scripts/build-content.mjs`
- [x] Missing/malformed field ⇒ build error naming the file
- [x] `explorers`, `diagrams`, `languages` and every fence must resolve; unknown `prerequisites` warn (they will be written later)

### US-202 · Lesson page template *(Must, M)* · 🟡 partial — *title/level/time/prereqs/summary/objectives/body/quiz/run-it-yourself note; no TOC*
- [ ] Renders: title · level badge · time · objectives · prerequisites chips · body · lab link ·
      quiz CTA · "recorded on" note where output came from a cassette
- [ ] Auto TOC; language tab preference (Python/TS) remembered

### US-203 · Traced code blocks *(Must, M)* · ✅ done
**As an** author **I want** `<Code lesson region>` to extract from the example file **so that** a
snippet can never drift from the code that ran.
- [x] Region markers in `.py` and `.ts`; extractor emits per-lesson JSON
- [x] Both languages shown as tabs; language choice remembered and synced across every block
- [x] Missing region ⇒ build error

### US-204 · Verified output blocks *(Must, M)* · ✅ done — *deterministic capture in both languages with Py/TS agreement enforced; cassette replay/record for LLM-dependent examples via the `llm` adapter*
- [x] Python and TS harnesses run every lesson's example, capture stdout per marker to JSON
- [x] LLM-dependent examples run through the adapter in **replay** mode against cassettes
- [x] `LEARNAI_LLM_MODE=record` refreshes cassettes with a real key; cassette diff reviewed in PR
- [x] Output block shows model + recorded date when it came from a cassette

### US-205 · Write the 66 lessons *(Must, XL)* · 🟡 20 / 66 — *Modules 1–3 complete; Basic level done*
- [ ] Notes for all lessons in §8, each with objectives, body, diagrams, exercises
- [ ] Every code lesson has a Python and a TS example
- [ ] Every lesson read for tone by pathway (Orientation ↔ Architect framing both work)

### US-206 · Syntax highlighting *(Must, S)* · 🟡 partial — *highlight.js core with Python + TypeScript only, client-side, copy button; Shiki-at-build later*
- [ ] Shiki at build time (Python, TS, JSON, YAML, bash, Mermaid)
- [x] Copy button

### US-207 · Inline check-yourself cards *(Should, M)* · ✅ done
- [x] ```` ```check ```` fence → `<Check>` component: one question, instant explanation, not scored; shape validated at build
- [x] Every Module 2 lesson has 2, placed at the misconception point

---

## E3 — Navigation & discovery

### US-301 · Syllabus page *(Must, M)* · ✅ done — accordion per module, level badges, progress bars, "has explorer / has lab" icons
### US-302 · Continue where you left off *(Must, S)* · ✅ done
### US-303 · Previous / next with pathway awareness *(Must, S)* · ✅ done — *follows the chosen route when the lesson is on it; syllabus order otherwise* — next = next *on your pathway*, with the "off-route" lesson still one click away
### US-304 · Full-text search *(Should, M)* · 🟡 mostly done — *build-time index over titles, tags, summary, objectives, body; weighted AND scorer; header autocomplete + /search page*; explorers/reference pages not indexed yet
### US-305 · Module overview pages *(Must, S)* · ⬜ — lessons, lab, test, "what you can build after this module"

---

## E4 — Quizzes & assessment

### US-401 · Quiz data model and loader *(Must, M)* · 🟡 partial — *JSON per lesson, lazy-loaded; no build-time validation yet*
### US-402 · Quiz player *(Must, L)* · 🟡 partial — *one at a time, instant explanation, results with misses, leave-warning; no back-nav or review links*
### US-403 · Question type components *(Must, L)* · ⬜ — all nine LearnCSharp types ported + `design-choice`
### US-404 · Results screen *(Must, M)* · ⬜ — score, misses with links, per-topic breakdown, 80% rule
### US-405 · End-of-module tests *(Must, M)* · ⬜ — 20–40 questions per module, mixed types
### US-406 · Question bank *(Must, XL)* · 🟡 200 / 660 — 660 questions (10 per lesson), each with explanation and review link
### US-407 · Topic exams with marks *(Should, L)* · ⬜ — Foundation / Standard / Challenge sets from `difficulty`; graded, per-topic review

---

## E5 — Labs & worksheets

### US-501 · Module labs *(Should, L)* · ⬜
**As a** builder **I want** a hands-on lab per module **so that** I build the thing, not just read
about it.
- [ ] One lab per module (§8), specified as a printable page + starter files in `examples/labs/`
- [ ] Each lab: goal, constraints, acceptance checks, stretch goals
- [ ] Labs needing a key say so and give a cassette-based fallback

### US-502 · Model solutions *(Should, M)* · ⬜ — Python and TS solutions in `examples/labs/`, run by CI
### US-503 · Capstone projects *(Could, L)* · ⬜ — Module 11: support assistant with RAG + evals + guardrails; document pipeline; coding agent over a repo; a classic-ML classifier in production

---

## E6 — Progress & motivation

### US-601 · Progress store *(Must, M)* · ✅ done — versioned localStorage, ported; also remembers last lesson and preferred language
### US-602 · Progress dashboard *(Must, M)* · ✅ done — completion per module and per level, quiz scores table, lessons worth another look, pathway position; no streak (US-604)
### US-603 · Export / import *(Must, S)* · ✅ done — JSON download, file import with validation, reset with confirm
### US-604 · Streaks and milestones *(Could, S)* · ⬜ — "Basic complete", "Builder route complete" badges
### US-605 · Weak-topic revision *(Should, M)* · ⬜ — mixed quiz from topics scoring < 70%

---

## E7 — Reference & decision aids

### US-701 · Glossary *(Must, M)* · ⬜ — every term defined in one line, linked to its lesson; hover chips in lessons
### US-702 · Decision tables *(Must, M)* · ⬜
**As an** architect **I want** the trade-offs on one page **so that** I can decide and write it down.
- [ ] RAG vs fine-tune vs long context · agent vs workflow vs single call · hosted vs
      self-hosted vs local · sync vs streaming vs async/batch · vector DB vs pgvector vs search
      engine · classic ML vs LLM · build vs buy
- [ ] Each: criteria rows, a "choose this when" line, and a link to the lesson that argues it
- [ ] Downloadable ADR template per decision

### US-703 · Checklists *(Must, M)* · ⬜ — production readiness · security (OWASP LLM Top 10 mapped to lessons) · eval before launch · incident review for an AI feature · data/privacy
### US-704 · Prompt & architecture pattern library *(Should, M)* · ⬜ — pattern name, when, template, anti-pattern, lesson link
### US-705 · Model chooser *(Should, M)* · ⬜ — capability tiers, context, modality, cost band, latency band, licence, "date checked"; **no hard-coded prices in lessons — the reference page is the one place, dated**
### US-706 · Cost calculator *(Should, S)* · ⬜ — the `cost` explorer, standalone, with shareable URL state
### US-707 · Reading list *(Could, S)* · ⬜ — curated papers/posts per lesson with a one-line "why read this"

---

## E8 — Quality & accessibility

### US-801 · Responsive *(Must, M)* · ⬜ — explorers usable at 320px (stack, not shrink)
### US-802 · Accessibility *(Must, L)* · ⬜ — explorers keyboard-operable with live-region announcements; axe clean
### US-803 · Performance *(Must, M)* · ⬜ — < 60 KB gz initial; explorers and tokeniser lazy; Lighthouse ≥ 95
### US-804 · Themes *(Should, S)* · ✅ done — six professional themes (system/light/dark/slate/midnight/paper); playful LearnCSharp themes deliberately dropped; diagrams and explorers themed via tokens
### US-805 · Offline / installable *(Could, M)* · ⬜

---

## E9 — Authoring, examples & CI

### US-901 · Examples workspace *(Must, M)* · ✅ done — *layout, `section()` helpers, both harnesses, and the `llm` adapter (replay/record/live) in both languages*
- [x] `examples/python` (stdlib, `python3 -m harness`) and `examples/ts` (Node 24 native TS, `node harness.ts`) with a shared
      layout: `mNN_topic/lNN_name.{py,ts}`
- [x] `llm` adapter in both languages: `complete()` with replay/record/live modes, shared cassettes keyed by a cross-language canonical-request hash, token accounting, recorded model + date surfaced to the site
- [ ] `stream()`, `embed()`, `tools()` — added when the first lesson needs each (5.2, 2.3-style real embeddings in Module 6, 5.3)
- [x] Every example runnable standalone: `python3 examples/python/m02_llms/l02_tokens.py` / `node examples/ts/m02_llms/l02_tokens.ts`

### US-902 · Continuous integration *(Must, M)* · 🟡 partial — *typecheck + run all examples + capture + content validate + site build on every PR; no link/axe/Lighthouse* — lint + run all examples (replay mode) + capture + content validate + site build on every PR; link check; axe; Lighthouse budget
### US-903 · Cassette discipline *(Must, S)* · ✅ done — cassettes carry request, model, date, recorder; stale (> 183 days) cassettes warn in the build; `LEARNAI_LLM_MODE=record` workflow documented in README and examples/shared/cassettes/README.md; adapter smoke test (both languages, diffed) runs in CI
### US-904 · Content authoring guide *(Should, S)* · ⬜ — how to add a lesson, region markers, diagram, explorer, questions, cassette

---

## E10 — Diagrams & visualisation

### US-1001 · Diagram component and registry *(Must, M)* · ✅ done — ported; typed registry + ```diagram fences, validated against frontmatter
### US-1002 · Mermaid at build time *(Should, S)* · ⬜ — sequence diagrams are the workhorse here (client → gateway → model → tool)
### US-1003 · Core diagram set *(Must, XL)* · 🟡 20 / ~120 — all Module 1–3 diagrams; tranche 1 = the 25 marked ★
### US-1004 · Printable diagrams *(Could, S)* · ⬜

---

## E11 — Audience pathways

### US-1101 · Pathway chooser *(Must, M)* · 🟡 mostly done — three cards on home (route, pace, lessons written), stored in progress; no "not sure?" quiz yet
### US-1102 · Pathway-aware ordering *(Must, M)* · ✅ done — syllabus shows the route in order and dims off-route lessons; prev/next and progress follow the route; switchable from the syllabus
### US-1103 · Depth toggles *(Should, M)* · ⬜ — "Under the hood" (maths, internals) and "For the ADR" (trade-off boxes) fold by pathway default
### US-1104 · Level filter *(Should, S)* · ⬜ — Basic / Intermediate / Advanced filter everywhere lessons are listed
### US-1105 · Audience-tagged questions *(Should, M)* · ⬜ — `design-choice` weighted to Architect; vocabulary to Orientation
### US-1106 · "For your role" framing *(Could, M)* · ⬜ — Manager/PM one-page summaries per module

---

## E12 — Explorers

### US-1201 · Explorer framework *(Must, M)* · 🟡 partial — *registry, ```explorer fence, lazy islands, `/explore` index + standalone pages, themed; no presets, shared controls or URL state yet*
### US-1202 · Tokeniser explorer *(Must, M)* · ✅ done — gpt-tokenizer cl100k lazy-loaded (~450 KB gz — see open question 3); coloured tokens, ids toggle, counts, chars/token, user-entered price → cost; language/JSON/code/strawberry samples
### US-1203 · Sampling explorer *(Must, M)* · ✅ done — distribution bars (raw vs after truncation); temperature/top-p/top-k; presets; sample ×20
### US-1204 · Embeddings & similarity *(Must, M)* · ✅ done — 24 phrases with 6 toy dimensions, real cosine, 2-D projection, click-to-query, nearest/furthest lists
### US-1205 · Context-budget & chunking *(Must, M)* · 🟡 partial — *context-budget done (sliders, policy applied, dropped counts); chunking explorer with Module 6*
### US-1206 · RAG stepper and agent-loop stepper *(Must, L)* · ⬜ — step-through with state panel; "what would break here" hints
### US-1207 · BYO-key playground *(Could, M)* · ⬜ — key in sessionStorage; direct browser → provider call; shows tokens/cost/latency; clearly labelled optional; CSP allows only the provider host
### US-1208 · Remaining explorers *(Should, L)* · 🟡 — *attention, gradient-descent and confusion-matrix done*; cost, eval-runner, nn-playground (deferred — 3.6 uses the neural-net diagram + gradient-descent explorer), injection-lab, hybrid-search, finetune-vs-rag

---

## 8. Syllabus — 11 modules, 66 lessons

**Level:** 🟢 Basic · 🔵 Intermediate · 🟣 Advanced. **Code** = has Python + TS example.
**Ex** = explorer. **Lab** = the module's hands-on lab.

### Module 1 — Foundations: what AI is and where it fits 🟢 *(6 lessons)*
| # | Lesson | Code | Ex | Key diagram |
|---|---|---|---|---|
| 1.1 | What AI actually is — AI ⊃ ML ⊃ DL ⊃ GenAI; rules vs learned behaviour | | | the nested-sets map ★ |
| 1.2 | How a model learns — data, features, labels, loss, "fit"; training vs inference | ✓ | gradient-descent | training loop vs inference path ★ |
| 1.3 | The three kinds of learning — supervised, unsupervised, reinforcement (and self-supervised) | | | one picture each |
| 1.4 | Software vs models — deterministic code vs probabilistic components; where each belongs | | | the "AI as a component" architecture ★ |
| 1.5 | The landscape in 2026 — foundation models, APIs, open weights, local models, agents; who does what | | | the stack, bottom to top |
| 1.6 | What can go wrong — hallucination, bias, drift, prompt injection, cost blow-up; the honest limits card | | | failure-mode taxonomy |
**Lab 1:** classify 50 real feature requests as "rules", "classic ML", "LLM" or "not AI" — with reasons.

### Module 2 — How LLMs actually work 🟢 *(8 lessons)*
| # | Lesson | Code | Ex | Key diagram |
|---|---|---|---|---|
| 2.1 | What an LLM is — a next-token predictor; why that explains almost everything | | sampling | text → tokens → probabilities → token ★ |
| 2.2 | Tokens — BPE, why "strawberry" is 3 tokens, counting, cost, multilingual cost | ✓ | tokeniser | token boundaries over text ★ |
| 2.3 | Embeddings — meaning as geometry; similarity; what they are *not* | ✓ | embeddings | 2-D vector space with clusters ★ |
| 2.4 | Attention & the transformer — intuition only; "which earlier tokens matter now"; the optional maths fold | | attention | attention heatmap; one transformer block ★ |
| 2.5 | Context windows — the fixed buffer; truncation; "lost in the middle"; long context ≠ memory | ✓ | context-budget | the budget bar ★ |
| 2.6 | How they are trained — pretraining, SFT, RLHF/DPO in one page; why the model "wants" to answer | | | three-stage pipeline |
| 2.7 | Sampling — temperature, top-p, top-k, seeds, why "the same prompt" differs | ✓ | sampling | distribution reshaping ★ |
| 2.8 | Capabilities & limits — reasoning, code, multimodal, knowledge cut-off, hallucination mechanics, calibration | | | "knows vs guesses" |
**Lab 2:** build a token counter and cost estimator CLI for a folder of documents (both languages).

### Module 3 — Classic ML for engineers 🟢 *(6 lessons)*
| # | Lesson | Code | Ex | Key diagram |
|---|---|---|---|---|
| 3.1 | When classic ML beats an LLM — tabular data, latency, cost, explainability | | | decision flow |
| 3.2 | Regression & classification — linear/logistic, trees, gradient boosting; intuition + sklearn | ✓ | nn-playground | decision boundary |
| 3.3 | Evaluating a model — train/test split, overfitting, precision/recall/F1, ROC, the confusion matrix | ✓ | confusion-matrix | threshold slider ★ |
| 3.4 | Clustering & anomaly detection — k-means, DBSCAN, isolation forest, where they show up | ✓ | | clusters |
| 3.5 | Feature pipelines & serving — pipelines, versioning, model registry, batch vs online, drift | ✓ | | train → register → serve → monitor ★ |
| 3.6 | Neural networks in one lesson — layers, activations, backprop intuition; why deep learning won | | nn-playground | a 3-layer net |
**Lab 3:** churn classifier: train, evaluate, threshold, serve behind an endpoint, detect drift with a shifted batch.

### Module 4 — Prompting & structured output 🔵 *(6 lessons)*
| # | Lesson | Code | Ex | Key diagram |
|---|---|---|---|---|
| 4.1 | Anatomy of a prompt — system/user/assistant roles, instructions, context, examples, output spec | ✓ | | prompt as a layered document ★ |
| 4.2 | Patterns that work — few-shot, role, step-by-step, decomposition, self-check; and what is folklore | ✓ | | pattern cards |
| 4.3 | Structured output — JSON mode, schemas, validation, retries; never parse prose | ✓ | | schema → model → validate → retry loop ★ |
| 4.4 | Prompts as code — templates, versioning, tests, review; a prompt registry | ✓ | | prompt lifecycle |
| 4.5 | Reasoning models & thinking budgets — when more thinking helps, cost/latency trade | ✓ | | accuracy vs tokens curve |
| 4.6 | Prompt injection 101 — untrusted text in the prompt; why "just tell it not to" fails | ✓ | injection-lab | trust boundary in the prompt ★ |
**Lab 4:** extract structured tickets from 30 messy support emails with a schema, validation and a retry policy; measure the parse-success rate.

### Module 5 — Building with LLM APIs 🔵 *(7 lessons)*
| # | Lesson | Code | Ex | Key diagram |
|---|---|---|---|---|
| 5.1 | Your first call, properly — the adapter, messages, errors, retries, timeouts, idempotency | ✓ | | request/response sequence ★ |
| 5.2 | Streaming — SSE, partial JSON, UI patterns, cancellation | ✓ | | streaming timeline ★ |
| 5.3 | Tool / function calling — schemas, the loop, parallel tools, tool errors | ✓ | agent-loop | the tool-call round trip ★ |
| 5.4 | Multimodal — images, documents, audio in; when to OCR first | ✓ | | modality pipeline |
| 5.5 | Prompt caching & batch APIs — what is cacheable, cost effect, when batch fits | ✓ | cost | cache hit vs miss ★ |
| 5.6 | Token budgeting & cost control — per-request budgets, truncation strategies, model routing | ✓ | cost, context-budget | router |
| 5.7 | Observability from day one — tracing a request, logging prompts safely, metrics that matter | ✓ | | a trace waterfall ★ |
**Lab 5:** a streaming chat backend with two tools (weather-like fake API + calculator), retries, per-user token budget and traces.

### Module 6 — RAG & knowledge 🔵 *(7 lessons)*
| # | Lesson | Code | Ex | Key diagram |
|---|---|---|---|---|
| 6.1 | Why RAG — knowledge cut-off, private data, citations, freshness; RAG vs fine-tune vs long context | | finetune-vs-rag | decision matrix ★ |
| 6.2 | The pipeline — ingest → chunk → embed → store → retrieve → assemble → answer → cite | ✓ | rag-stepper | the full pipeline ★ |
| 6.3 | Chunking — strategies, size, overlap, parent-child, metadata | ✓ | chunking | chunk overlap ★ |
| 6.4 | Vector stores & hybrid search — ANN indexes, pgvector vs dedicated, BM25 + vectors, filters | ✓ | hybrid-search | HNSW graph; hybrid rank fusion |
| 6.5 | Reranking, query rewriting, HyDE — precision on top of recall | ✓ | | two-stage retrieval |
| 6.6 | Grounding & citations — answer only from context, refusal path, citation rendering | ✓ | | grounded vs ungrounded |
| 6.7 | Evaluating RAG — retrieval hit-rate, faithfulness, answer relevance; a golden set | ✓ | eval-runner | RAG eval triad ★ |
**Lab 6:** RAG over your own docs folder with hybrid search, citations, a refusal path and a 30-question golden set with scores.

### Module 7 — Agents & orchestration 🔵 *(7 lessons)*
| # | Lesson | Code | Ex | Key diagram |
|---|---|---|---|---|
| 7.1 | Workflow vs agent — chains, routers, parallelisation, orchestrator-workers, evaluator-optimiser; when to give the model the loop | | | the pattern gallery ★ |
| 7.2 | The agent loop — observe, think, act; termination; state | ✓ | agent-loop | the loop with a stop condition ★ |
| 7.3 | Tools done well — contracts, idempotency, least privilege, sandboxing, error surfaces | ✓ | | tool boundary |
| 7.4 | MCP & tool ecosystems — servers, resources, prompts; when a protocol beats bespoke tools | ✓ | | host ↔ client ↔ server |
| 7.5 | Memory — short-term (context), long-term (store), summarisation, what to forget | ✓ | | memory tiers ★ |
| 7.6 | Multi-agent & human-in-the-loop — hand-offs, supervisors, approval gates, checkpoints | ✓ | | supervisor + workers; approval gate |
| 7.7 | Agent failure modes — loops, tool misuse, drift from goal, cost runaways; guardrails and budgets | ✓ | | the failure taxonomy |
**Lab 7:** a coding agent that reads a small repo, plans, edits behind an approval gate, runs tests, and stops on a budget.

### Module 8 — Evaluation & quality 🟣 *(6 lessons)*
| # | Lesson | Code | Ex | Key diagram |
|---|---|---|---|---|
| 8.1 | Why "it looks good" is not evidence — the eval mindset; offline vs online | | | the eval loop ★ |
| 8.2 | Golden sets — sourcing, sizing, labelling, versioning; from real traffic | ✓ | eval-runner | dataset lifecycle |
| 8.3 | Scorers — exact, rubric, code-based, model-graded (LLM-as-judge) and its biases | ✓ | | scorer types |
| 8.4 | Regression testing for prompts and models — CI gates, thresholds, flakiness | ✓ | | eval in CI ★ |
| 8.5 | Online evaluation — A/B, shadow, canary, user feedback loops | | | rollout ladder |
| 8.6 | Red-teaming & safety evals — jailbreaks, injection, harmful output, PII leakage | ✓ | injection-lab | attack → defence matrix |
**Lab 8:** put Lab 6's RAG under a CI eval gate: golden set, two scorers, a threshold, a failing PR.

### Module 9 — Production: architecture, security, operations 🟣 *(8 lessons)*
| # | Lesson | Code | Ex | Key diagram |
|---|---|---|---|---|
| 9.1 | Reference architecture — gateway, router, cache, retriever, tools, evals, tracing, guardrails | | | the reference architecture ★ |
| 9.2 | The LLM gateway — auth, rate limits, quotas, routing, fallbacks, key hygiene | ✓ | | gateway sequence |
| 9.3 | Latency & throughput — TTFT, tokens/sec, parallelism, streaming, speculative patterns | ✓ | | latency budget waterfall ★ |
| 9.4 | Cost engineering — routing, caching, distillation, budgets, showback | ✓ | cost | cost breakdown |
| 9.5 | Security — OWASP LLM Top 10; injection, data exfiltration, tool abuse, supply chain, secrets | ✓ | injection-lab | threat model ★ |
| 9.6 | Privacy, compliance & governance — PII, retention, regional hosting, audit, model cards, EU AI Act basics | | | data flow with controls |
| 9.7 | Guardrails — input/output classifiers, allow-lists, schema enforcement, human escalation | ✓ | | guardrail layers |
| 9.8 | Running it — SLOs, incident playbook, drift, model deprecations, change management for prompts | | | on-call view |
**Lab 9:** production-readiness review of Lab 5/6/7 against the checklist; write the ADR and the incident playbook.

### Module 10 — Customising models 🟣 *(5 lessons)*
| # | Lesson | Code | Ex | Key diagram |
|---|---|---|---|---|
| 10.1 | When to fine-tune — and when not; the decision revisited with data | | finetune-vs-rag | decision matrix |
| 10.2 | Fine-tuning mechanics — SFT, LoRA/PEFT intuition, data format, overfitting, eval | ✓ | | LoRA adapters on a frozen model ★ |
| 10.3 | Distillation & small models — teacher → student; task-specific small models | ✓ | | teacher/student |
| 10.4 | Local & open-weight models — running locally, quantisation, licences, when it is worth it | ✓ | | quantisation size/quality |
| 10.5 | Embedding models & domain adaptation — choosing, fine-tuning embeddings, evaluating retrieval gain | ✓ | | before/after retrieval curves |
**Lab 10:** fine-tune a small open model on Lab 4's ticket data; compare against the prompted baseline on the golden set.

### Module 11 — AI in the software lifecycle & capstones 🟣 *(4 lessons)*
| # | Lesson | Code | Ex | Key diagram |
|---|---|---|---|---|
| 11.1 | AI-assisted engineering — coding assistants and agents; spec-first prompting; reviewing generated code; what to never delegate | | | the review loop |
| 11.2 | Designing an AI feature — from problem statement to eval plan; the one-page design doc | | | design doc skeleton ★ |
| 11.3 | Team, process & skills — who owns prompts, evals, cost; roles; how to run an AI project | | | RACI |
| 11.4 | Frameworks & the ecosystem — what LangChain/LlamaIndex/SK/DSPy/etc. abstract; when a framework helps; how to leave one | ✓ | | layers of abstraction |
**Capstones:** support assistant (RAG + tools + evals + guardrails) · document-processing pipeline
(multimodal + structured output + batch) · repo-aware coding agent (Lab 7 hardened) · churn model
in production (classic ML end to end).

**Totals:** 66 lessons · 11 labs · 4 capstones · Basic 20 · Intermediate 27 · Advanced 19.

### 8.1 What every senior engineer should walk away knowing

The 30 things this course guarantees, each mapped to the lesson that teaches it:

| # | You should be able to… | Lesson(s) |
|---|---|---|
| 1 | Say what an LLM is in one sentence and derive its limits from that | 2.1, 2.8 |
| 2 | Estimate tokens and cost for a workload before building it | 2.2, 5.6, 9.4 |
| 3 | Explain why the same prompt gives different answers, and control it | 2.7 |
| 4 | Budget a context window and know what gets dropped | 2.5, 5.6 |
| 5 | Choose classic ML vs LLM vs rules for a problem | 1.4, 3.1 |
| 6 | Evaluate a classifier with precision/recall and pick a threshold | 3.3 |
| 7 | Write a prompt as a versioned, tested artefact | 4.1, 4.4 |
| 8 | Get reliable JSON out of a model | 4.3 |
| 9 | Call an LLM API with retries, timeouts, streaming and tracing | 5.1, 5.2, 5.7 |
| 10 | Implement tool calling and reason about its failure modes | 5.3, 7.3 |
| 11 | Use prompt caching and batch to cut cost | 5.5 |
| 12 | Build a RAG pipeline and explain each stage's trade-off | 6.2–6.6 |
| 13 | Decide RAG vs fine-tune vs long context, and defend it | 6.1, 10.1 |
| 14 | Measure a RAG system (retrieval + faithfulness) | 6.7 |
| 15 | Choose workflow vs agent, and name the orchestration pattern | 7.1 |
| 16 | Build a bounded agent loop with tools, memory and a stop condition | 7.2, 7.5, 7.7 |
| 17 | Put a human approval gate where it belongs | 7.6 |
| 18 | Build a golden set and an eval harness, and gate CI on it | 8.2–8.4 |
| 19 | Use LLM-as-judge and know its biases | 8.3 |
| 20 | Draw the reference architecture for an LLM feature | 9.1 |
| 21 | Put a gateway in front of every model call | 9.2 |
| 22 | Reason about latency (TTFT, tokens/sec) and set an SLO | 9.3, 9.8 |
| 23 | Threat-model an LLM feature against OWASP LLM Top 10 | 4.6, 8.6, 9.5 |
| 24 | Design guardrails in layers, not one prompt line | 9.7 |
| 25 | Handle PII, retention and regional constraints | 9.6 |
| 26 | Explain fine-tuning/LoRA well enough to decide, and run one | 10.2 |
| 27 | Run an open model locally and know the licence implications | 10.4 |
| 28 | Use a coding agent well and review its output critically | 11.1 |
| 29 | Write the one-page AI feature design doc with an eval plan | 11.2 |
| 30 | Pick or skip a framework knowingly | 11.4 |

### 8.2 Diagram inventory (~120)

★ = tranche 1 (25 diagrams — the ones the walking skeleton and Module 2/6/7/9 depend on).

| Module | Diagrams | Type |
|---|---|---|
| **1 Foundations** | AI ⊃ ML ⊃ DL ⊃ GenAI nested sets ★ · rules vs learned function · training loop vs inference path ★ · supervised/unsupervised/RL one-picture-each · "AI as a component" in a system architecture ★ · the 2026 stack (hardware → models → APIs → apps) · failure-mode taxonomy · hallucination as sampling off-distribution | SVG |
| **2 LLMs** | text → tokens → ids → probabilities → next token ★ · token boundaries over real text ★ · why letters ≠ tokens · embedding vector space with clusters ★ · cosine similarity as angle · one transformer block · attention heatmap ★ · context window budget bar ★ · truncation strategies · lost-in-the-middle curve · pretrain → SFT → RLHF pipeline · temperature reshaping a distribution ★ · top-p cut · greedy vs sampled path · knowledge cut-off timeline · calibration curve | SVG + explorers |
| **3 Classic ML** | classic-vs-LLM decision flow · linear fit and residuals · logistic curve · decision tree · gradient boosting stacking · decision boundary · train/validation/test split · overfitting curves · confusion matrix with threshold ★ · ROC/PR curves · k-means iterations · isolation forest · train → register → serve → monitor ★ · drift over time · a 3-layer network · activation functions · gradient descent on a surface | SVG + explorers |
| **4 Prompting** | prompt as layered document ★ · few-shot structure · decomposition tree · schema → model → validate → retry loop ★ · prompt lifecycle (author → test → version → deploy) · accuracy vs thinking tokens · trust boundary inside a prompt ★ · injection payload path | SVG |
| **5 APIs** | request/response sequence with retries ★ · streaming timeline (TTFT, chunks) ★ · tool-call round trip ★ · parallel tool calls · multimodal pipeline · cache hit vs miss ★ · batch vs online · token budget allocation · model router · trace waterfall ★ | Mermaid + SVG |
| **6 RAG** | RAG vs fine-tune vs long-context matrix ★ · full pipeline ★ · chunk overlap ★ · chunk size vs recall · parent-child chunks · HNSW graph · BM25 vs vector vs hybrid ranking · reciprocal rank fusion · two-stage retrieve → rerank · query rewriting · grounded vs ungrounded answer · citation rendering · RAG eval triad ★ | SVG + steppers |
| **7 Agents** | orchestration pattern gallery ★ (chain, router, parallel, orchestrator-workers, evaluator-optimiser) · agent loop with stop condition ★ · tool boundary & least privilege · MCP host/client/server · memory tiers ★ · supervisor + workers · approval gate · failure taxonomy · budget/timeout envelope | SVG + steppers |
| **8 Evals** | the eval loop ★ · offline vs online · golden set lifecycle · scorer types · judge bias · eval in CI ★ · rollout ladder (shadow → canary → A/B) · attack → defence matrix | SVG + Mermaid |
| **9 Production** | reference architecture ★ · gateway sequence · latency waterfall ★ · cost breakdown · threat model ★ · OWASP LLM Top 10 map · data flow with controls · guardrail layers · SLO dashboard sketch · deprecation timeline | SVG + Mermaid |
| **10 Customising** | LoRA adapters on frozen weights ★ · SFT data format · overfitting on small data · teacher → student · quantisation size/quality · local inference stack · embedding fine-tune before/after | SVG |
| **11 Lifecycle** | AI-assisted review loop · design-doc skeleton ★ · RACI · abstraction layers of frameworks · each capstone's architecture | Mermaid |

---

## 9. Content inventory

Nothing exists yet. This is the target.

| Module | Title | Level | Lessons | Code (py+ts) | Explorers | Quiz Qs | Test Qs |
|---|---|---|---|---|---|---|---|
| 1 | Foundations | 🟢 | 6 | 1 | 1 | 60 | 20 |
| 2 | How LLMs work | 🟢 | 8 | 4 | 5 | 80 | 30 |
| 3 | Classic ML for engineers | 🟢 | 6 | 4 | 2 | 60 | 25 |
| 4 | Prompting & structured output | 🔵 | 6 | 6 | 1 | 60 | 25 |
| 5 | Building with LLM APIs | 🔵 | 7 | 7 | 3 | 70 | 30 |
| 6 | RAG & knowledge | 🔵 | 7 | 6 | 5 | 70 | 30 |
| 7 | Agents & orchestration | 🔵 | 7 | 6 | 1 | 70 | 30 |
| 8 | Evaluation & quality | 🟣 | 6 | 4 | 2 | 60 | 25 |
| 9 | Production | 🟣 | 8 | 5 | 2 | 80 | 30 |
| 10 | Customising models | 🟣 | 5 | 4 | 1 | 50 | 20 |
| 11 | Lifecycle & capstones | 🟣 | 4 | 1 | 0 | 40 | 15 |
| | **Total** | | **66** | **48** | **~20** | **660** | **280** |

---

## 10. Milestones

### M0 — Walking skeleton *(2 weeks)* · 🟡 **built locally; deploy pending**
US-101, 102, 103, 201–204, 1001, 1201, 1202, 401, 402, 601 · **Done when:** lesson **2.2 Tokens**
is live on Azure: traced Python + TS code, captured output, one diagram, the tokeniser explorer,
a 10-question quiz and localStorage progress — deploying on every merge.
Everything renders and builds locally (verified in a headless browser); the only outstanding
item is creating the Azure Static Web App and adding its token.

### M1 — Module 2 vertical slice *(3 weeks)* · 🟡 **content complete; site features outstanding**
US-104, 205 (Module 2 only), 206, 207, 301–303, 305, 403, 404, 602, 901–903, 1002, 1101, 1102,
1203–1205 · **Done when:** all eight Module 2 lessons, with explorers and quizzes, can be
completed on any pathway and progress shows it. Put it in front of two real engineers.
**All eight lessons, five explorers, eight diagrams, 80 questions and 16 check cards are written
and build; search, pathways and the progress dashboard are live.** Outstanding for M1: callout
components (104), question types beyond multiple choice (403). **Ready to put in front of two
engineers now.**

### M2 — Builder route complete *(6 weeks)* · ⬜
US-205 (Modules 4–8), 405, 406 (Modules 2, 4–8), 501, 502, 702, 703, 1003 (tranche 1 + 2),
1206 · **Done when:** the Builder pathway (2 → 3 → 4 → 5 → 6 → 8 → 9) is fully readable, every
code lesson runs in CI in both languages, and Labs 4–8 exist with solutions.

### M3 — Full content *(5 weeks)* · ⬜
US-205 (Modules 1, 3, 9–11), 406 (rest), 407, 503, 701, 704–707, 1003 (rest), 1208 ·
**Done when:** 66 lessons, 660 questions, ~120 diagrams, all explorers, all labs and capstones
are live.

### M4 — Retention, reference & polish *(3 weeks)* · ⬜
US-304, 603–605, 801–805, 904, 1004, 1103–1106, 1207 · **Done when:** Lighthouse ≥ 95, zero axe
violations, offline-capable, weak-topic revision, export/import, BYO-key playground.

**Total: ~19 weeks.** M0 and M1 are the critical milestones — they prove the pipeline (traced
code, cassettes, explorers) that every later lesson repeats.

---

## 11. Deferred to v2

| Idea | Why later |
|---|---|
| Real models in the browser (WebGPU / ONNX / transformers.js) | 50–500 MB downloads; concept explorers teach the same thing at 1% of the size |
| A hosted "try it" backend with our key | needs a server, a bill and abuse controls — violates the £0 rule |
| Accounts, team dashboards, cohort tracking | out of scope for a self-study site |
| Notebook (Jupyter) exports of examples | nice, but the `.py` files already run standalone |
| Vendor-specific deep dives (Azure OpenAI, Bedrock, Vertex setup) | churn; the adapter + reference table cover the differences |
| Certificates / badges beyond localStorage milestones | needs identity |

---

## 12. Definition of done

A **story** is done when: acceptance criteria pass · keyboard and screen-reader tested ·
responsive 320–1920px · light and dark verified · no new CI failures · Lighthouse not regressed.

A **lesson** is done when: frontmatter validates · every snippet is a traced region of an
example that runs in CI (replay mode where a model is involved) · output captured from a real
run, with model + date shown for cassettes · **every pipeline, buffer, loop or distribution has a
diagram with a real `alt`, correct in both themes** · every claim about a vendor, price or model
points at the dated reference page rather than being inlined · ≥10 quiz questions with
explanations · ≥2 check-yourself cards · exercises with model answers · read end-to-end in
Orientation *and* Architect framing.

An **explorer** is done when: works with keyboard only · announces state changes · state in URL ·
themed · ≤15 KB gz lazy chunk · has a "what am I looking at" caption and a "try this" prompt.

---

## 13. Open questions

1. **Default provider for the examples** — one vendor through the adapter, or two (one hosted,
   one local/open) so every LLM lesson also runs key-free against a small local model in CI?
2. **Cassette freshness** — refresh on a schedule, or only when a lesson changes? Six-month
   staleness warning is the current proposal.
3. **Tokeniser bundle** — which JS BPE tokeniser, and do we ship one vocabulary or several?
   Size matters (US-803).
4. **Reference prices** — hand-maintained dated table only, or a JSON in the repo that a scheduled
   PR refreshes for review?
5. **Framework lesson (11.4)** — name specific frameworks with a "checked on" date, or keep it to
   categories?
6. **Manager view** — is US-1106's per-module summary enough for Jordan, or does the
   Architect route need a lighter "decision-maker" lens? (No non-technical mode is planned.)
7. **Shared shell with LearnCSharp** — copy the components, or extract a small shared package
   both repos depend on? Copy first; extract when the third course appears.

---

## 14. Next actions

1. ~~Sign off this plan~~ · ~~scaffold `web/` and both example harnesses~~ · ~~lesson 2.2 end to
   end~~ — **done, builds and renders locally**.
2. Create the Azure Static Web App (Free), add `AZURE_STATIC_WEB_APPS_API_TOKEN`, set the £0
   budget alert (US-103). **M0 done.**
3. ~~Module 2 in full with the four new explorers~~ — **done.** Put it in front of two
   engineers before writing more.
4. ~~M1 site features: check cards, pathways, progress dashboard, search~~ — **done.**
5. ~~Module 1 (Foundations)~~ — **done**; the Orientation route is now complete through
   Module 2.
6. ~~Design the `llm` adapter + cassette record/replay~~ — **done** (replay verified in both
   languages; no cassette has been recorded against the real API yet — that needs credentials).
7. ~~Module 3 (Classic ML)~~ — **done**; the Basic level (Modules 1–3) is complete.
8. Module 4 (Prompting): write the examples, then **record the cassettes with a real key**
   (one-off, reviewed diff — needs the owner's credentials), then notes/quizzes.
