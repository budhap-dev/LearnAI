# Learn AI — for software engineers, from basics to production

A self-teaching AI course for working software professionals — senior developers, tech leads and architects — not a computer-science course: **what AI can and cannot do, how the pieces
work, and how to put them into real software responsibly.** Basic → Intermediate → Advanced,
66 lessons across 11 modules, with diagrams, interactive explorers, and runnable Python + TypeScript
examples whose output is verified in CI.

Sister project to [LearnCSharp](../LearnCSharp) — same React + TypeScript static site, same
"every claim is runnable" discipline, hosted on Azure Static Web Apps (Free).

**Status:** in delivery — walking skeleton built (lesson 2.2 *Tokens* end to end), Azure deploy
pending. Read the plan: **[STORIES.md](STORIES.md)**.

## Run it

```bash
cd web && npm install && npm run dev        # runs both example harnesses, then Vite
```

Run an example directly (Node 24+ runs TypeScript natively; Python 3.12+ stdlib only):

```bash
python3 examples/python/m02_llms/l02_tokens.py
node examples/ts/m02_llms/l02_tokens.ts
```

## The syllabus

| Module | Topic | Level | Lessons |
|---|---|---|---|
| 1 | Foundations — what AI is and where it fits | Basic | 6 |
| 2 | How LLMs actually work | Basic | 8 |
| 3 | Classic ML for engineers | Basic | 6 |
| 4 | Prompting & structured output | Intermediate | 6 |
| 5 | Building with LLM APIs | Intermediate | 7 |
| 6 | RAG & knowledge | Intermediate | 7 |
| 7 | Agents & orchestration | Intermediate | 7 |
| 8 | Evaluation & quality | Advanced | 6 |
| 9 | Production — architecture, security, operations | Advanced | 8 |
| 10 | Customising models — fine-tuning, distillation, local | Advanced | 5 |
| 11 | AI in the software lifecycle & capstones | Advanced | 4 |

## Layout

```
docs/module-N/<id>.md    lesson notes with typed frontmatter - the source of truth
docs/modules.json        module metadata
examples/python/         one runnable file per lesson; `python3 -m harness capture`
examples/ts/             one runnable file per lesson; `node harness.ts capture`
examples/shared/         fixtures, golden sets, recorded LLM responses (planned)
web/                     the React + Vite static site (see web/README.md)
.github/workflows/       CI: typecheck, run every example, validate content, build, deploy
```

Every code snippet on the site is a traced `# region:` of an example file, and every output
block was captured from running it. Python and TypeScript examples are twins - the build fails
if their output differs.
