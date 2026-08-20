/**
 * Lesson 11.4 - Frameworks and the ecosystem
 *
 * A framework (LangChain, LlamaIndex, Semantic Kernel, DSPy, ...) is a composition layer: it
 * packages the plumbing you would otherwise write - prompt templating, retry-and-parse, tool
 * orchestration, memory, tracing - behind named abstractions. That is genuinely useful, and it
 * is also thin: everything it does, you can do with the primitives from Modules 4-9. This example
 * builds a tiny "framework" (a Chain of steps), runs a task through it, then does the SAME task
 * with raw primitives to identical output - so you can see exactly what the abstraction buys, and
 * that you can always drop below it or leave it.
 *
 * Deterministic: the "model" is a stub, so the framework mechanics are the whole show.
 *
 * Run:  node m11_lifecycle/l04_frameworks.ts
 */

import { section, title } from '../src/learnai/index.ts';

/**
 * Render a value for output identically in Python and TypeScript: strings raw, objects as
 * compact key-sorted JSON. Keeps the twin examples byte-identical.
 */
function show(x: unknown): string {
  if (typeof x === 'string') return x;
  const sorted = Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  return JSON.stringify(sorted);
}

// region: model
// A stub stand-in for a real model call (Module 5). It answers the classify task, but - like a
// real model - it wraps the JSON in a markdown fence and some chatter, so SOMETHING has to parse
// it. That parsing is one of the things a framework abstracts.
function fakeModel(prompt: string): string {
  if (prompt.includes('URGENT')) {
    return 'Sure! Here you go:\n```json\n{"category": "billing", "priority": "high"}\n```\nHope that helps!';
  }
  return '```json\n{"category": "general", "priority": "low"}\n```';
}
// endregion

// region: primitives
// The primitives you already have from Modules 4-9: a prompt template, a model call, a JSON
// extractor, a schema check. Nothing framework-specific.
function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k]);
}

/** Pull the JSON out of a fenced/chatty response - the un-glamorous glue a framework hides. */
function extractJson(text: string): Record<string, unknown> {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return JSON.parse(text.slice(start, end + 1));
}

function validate(obj: Record<string, unknown>, required: string[]): Record<string, unknown> {
  const missing = required.filter((k) => !(k in obj));
  if (missing.length) throw new Error(`missing keys: ${missing}`);
  return obj;
}
// endregion

// region: framework
// A minimal "framework": a Chain is just an ordered list of named steps, each a function of the
// previous result. This is the essence of what the big libraries generalise - composition, plus
// a place to hang cross-cutting concerns like tracing.
class Chain {
  private steps: [string, (x: unknown) => unknown][] = [];
  private trace: boolean;
  constructor(trace = false) {
    this.trace = trace;
  }

  step(name: string, fn: (x: unknown) => unknown): Chain {
    this.steps.push([name, fn]);
    return this;
  }

  run(x: unknown): unknown {
    for (const [name, fn] of this.steps) {
      x = fn(x);
      if (this.trace) console.log(`    [trace] ${name} -> ${show(x)}`);
    }
    return x;
  }
}
// endregion

/**
 * The task expressed declaratively: four named steps, composed. Concise, and you get tracing
 * for free - but the steps are the SAME primitives, just wrapped.
 */
function classifyWithFramework(note: string): Record<string, unknown> {
  const template = 'Classify this note as JSON with category and priority.\nNote: {note}';
  return new Chain(true)
    .step('render', (n) => render(template, { note: n as string }))
    .step('call', (p) => fakeModel(p as string))
    .step('parse', (r) => extractJson(r as string))
    .step('validate', (o) => validate(o as Record<string, unknown>, ['category', 'priority']))
    .run(note) as Record<string, unknown>;
}

/**
 * The identical task with no framework: the four steps inline. More lines, zero indirection,
 * nothing to learn or upgrade. This is what the Chain compiles down to.
 */
function classifyRaw(note: string): Record<string, unknown> {
  const template = 'Classify this note as JSON with category and priority.\nNote: {note}';
  const prompt = render(template, { note });
  const reply = fakeModel(prompt);
  const obj = extractJson(reply);
  return validate(obj, ['category', 'priority']);
}

function main(): void {
  const note = 'URGENT: charged twice for my subscription this month';

  section('framework');
  title('The task through a tiny framework (a Chain of named steps)');
  const resultFw = classifyWithFramework(note);
  console.log(`  result: ${show(resultFw)}`);

  section('raw');
  title('The identical task with raw primitives - no framework');
  const resultRaw = classifyRaw(note);
  console.log(`  result: ${show(resultRaw)}`);
  console.log(`  same output as the framework: ${show(resultFw) === show(resultRaw) ? 'True' : 'False'}`);

  section('abstracts');
  title('What a framework actually abstracts');
  console.log('prompt templating      - render(template, **vars)         (Module 4)');
  console.log('call + retry + parse   - the glue around one model call   (Module 5)');
  console.log('tool orchestration     - the observe/act loop             (Module 7)');
  console.log('memory & retrieval     - history and RAG wiring           (Modules 6, 7)');
  console.log('tracing & callbacks    - the cross-cutting hooks           (Module 5.7)');
  console.log('...each is a few lines of the primitives you already have; the framework packages them');

  section('choose');
  title('When a framework helps - and when it gets in the way');
  console.log("HELPS:  a fast start, standard patterns, integrations you'd otherwise write and maintain");
  console.log('HURTS:  a leaky abstraction over a thing you must debug; version churn; hidden prompts');
  console.log('        and hidden costs; a ceiling when your case is not the one it was designed for');
  console.log('the test: can you see and control the exact prompt, the exact tokens, and the exact');
  console.log('          control flow? if the framework hides those, you will fight it in production');

  section('leave');
  title('How to leave one (so you always can)');
  console.log('keep DOMAIN logic framework-free - the framework calls your code, not the reverse');
  console.log('wrap model access behind YOUR adapter seam (the llm module) - swap providers or libs there');
  console.log("depend on interfaces you own, not the framework's types, at your module boundaries");
  console.log('the framework should be a dependency you can delete in a day, not the shape of your system');
}

main();
