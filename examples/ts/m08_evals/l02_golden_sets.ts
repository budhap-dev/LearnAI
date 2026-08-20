/**
 * Lesson 8.2 - Golden sets
 *
 * A golden set is the held-out set (Lesson 3.3) for an LLM feature: real cases with
 * known-good outcomes, curated, versioned, and run on every change. Its value comes from
 * where the cases come from and how they are kept - not from its size alone. This example
 * builds one from (fake) production traffic and shows the three disciplines: sample to match
 * reality, label with rules you can audit, version like code.
 *
 * Deterministic on purpose: building the set involves no model at all.
 *
 * Run:  node m08_evals/l02_golden_sets.ts
 */

import { createHash } from 'node:crypto';
import { section, title } from '../src/learnai/index.ts';

type Row = [string, string, number];

// region: traffic
// A month of support questions as (question, category, frequency-weight). The mix is the
// point: billing dominates, security is rare but high-stakes - your golden set must mirror
// the first fact and refuse to let the second disappear.
const TRAFFIC: Row[] = [
  ...Array(34).fill(['How do I get a refund on my annual plan?', 'billing', 1]),
  ...Array(27).fill(['Why was I charged twice this month?', 'billing', 1]),
  ...Array(14).fill(['Can I move the billing date?', 'billing', 1]),
  ...Array(21).fill(['How do I export all our data?', 'how-to', 1]),
  ...Array(18).fill(['How do I add a seat?', 'how-to', 1]),
  ...Array(12).fill(['The reports tab crashes on open', 'bug', 1]),
  ...Array(9).fill(['API returns 429 constantly since Monday', 'bug', 1]),
  ...Array(8).fill(['Does Pro include SSO?', 'product', 1]),
  ...Array(2).fill(['I think my API key leaked', 'security', 1]),
  ...Array(1).fill(['Delete my workspace and all data now', 'security', 1]),
];
// endregion

const countBy = <T>(xs: T[], key: (x: T) => string): Map<string, number> => {
  const m = new Map<string, number>();
  for (const x of xs) m.set(key(x), (m.get(key(x)) ?? 0) + 1);
  return m;
};

// region: sample
/**
 * Sample proportionally to traffic, but floor every stratum: rare-but-critical categories
 * (security) get seats at the table that pure proportion would deny them. Deterministic:
 * sorted, seedless, reproducible in both languages.
 */
function stratifiedSample(traffic: Row[], perStratumMin: number, total: number): [string, string][] {
  const byCat = new Map<string, string[]>();
  for (const [q, cat] of traffic) {
    const list = byCat.get(cat) ?? [];
    if (!list.includes(q)) list.push(q);
    byCat.set(cat, list);
  }
  const counts = countBy(traffic, ([, cat]) => cat);
  const n = traffic.length;
  const picked: [string, string][] = [];
  for (const cat of [...byCat.keys()].sort()) {
    // Round half away from zero, matching Python's round() for the values seen here.
    const share = Math.max(perStratumMin, Math.floor((total * counts.get(cat)!) / n + 0.5));
    for (const q of byCat.get(cat)!.slice(0, share)) picked.push([q, cat]);
  }
  return picked;
}
// endregion

// region: label
// A labelled case: the question, what a correct outcome LOOKS LIKE (checkable, not a
// transcript), and bookkeeping that makes the label auditable.
function makeCase(question: string, category: string, expect: Record<string, unknown>, source: string, labeller: string) {
  return {
    id: createHash('sha256').update(question, 'utf8').digest('hex').slice(0, 8),
    question,
    category,
    expect, // e.g. {"must_contain": "14 days"} or {"refusal": true}
    source, // ticket id / conversation id - provenance
    labelled_by: labeller, // a person or a documented rule, never "the model said so"
  };
}

const EXPECTATIONS: Record<string, Record<string, unknown>> = {
  billing: { must_contain: 'refund|billing|invoice', must_cite: true },
  'how-to': { must_contain: 'settings|export|seat', must_cite: true },
  bug: { escalate: true },
  product: { must_contain: 'Pro|Enterprise', must_cite: true },
  security: { escalate: true, never_contain: 'here is your key' },
};
// endregion

type Case = ReturnType<typeof makeCase>;

// region: version
/**
 * A golden set is an artefact: content-hashed, versioned, with a changelog. Numbers from
 * different versions are different numbers - comparing them silently is how teams fool
 * themselves after 'we just added a few cases'.
 */
function freeze(cases: Case[], version: string, note: string) {
  // Match Python's json.dumps(sort_keys=True, separators=(",", ":")) so hashes agree.
  const canonical = (v: unknown): string =>
    Array.isArray(v)
      ? `[${v.map(canonical).join(',')}]`
      : v && typeof v === 'object'
        ? `{${Object.keys(v as Record<string, unknown>).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(',')}}`
        : JSON.stringify(v);
  return {
    version,
    content_hash: createHash('sha256').update(canonical(cases), 'utf8').digest('hex').slice(0, 12),
    cases: cases.length,
    note,
  };
}
// endregion

function main(): void {
  const counts = countBy(TRAFFIC, ([, cat]) => cat);

  section('traffic');
  title(`What production actually asks (${TRAFFIC.length} questions, one month)`);
  for (const [cat, n] of [...counts].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(9)} ${String(n).padStart(3)}  ${'#'.repeat(Math.floor(n / 3))}`);
  }

  section('naive');
  title('Naive: the five most frequent questions');
  const qCounts = countBy(TRAFFIC, ([q]) => q);
  const top5 = [...qCounts].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([q]) => q);
  const naiveCats = countBy(top5, (q) => TRAFFIC.find(([q2]) => q2 === q)![1]);
  console.log('  categories covered:', [...naiveCats].sort().map(([c, n]) => `${c}=${n}`).join(', '));
  console.log('  bug, product, security: 0 cases - frequency is not risk; the highest-stakes');
  console.log('  category vanished, and so did every case that should escalate or refuse');

  section('stratified');
  title('Stratified with a floor: mirror the mix, protect the rare');
  const sample = stratifiedSample(TRAFFIC, 1, 12);
  for (const [q, cat] of sample) console.log(`  [${cat.padEnd(9)}] ${q}`);

  section('labelled');
  title('A case is a checkable expectation with provenance');
  const cases = sample.map(([q, cat], i) => makeCase(q, cat, EXPECTATIONS[cat], `ticket-${i + 101}`, 'runbook rule R7'));
  console.log(JSON.stringify(cases[0], null, 2));
  console.log(`  ... ${cases.length} cases; every label traces to a source and a rule, not to a vibe`);

  section('versioned');
  title('Freeze it like code');
  const v1 = freeze(cases, 'support-golden@1', 'initial set from 2026-07 traffic');
  cases.push(makeCase('Do you offer student discounts?', 'product', { refusal: true }, 'ticket-201', 'runbook rule R9'));
  const v2 = freeze(cases, 'support-golden@2', 'added uncovered-question case after incident INC-88');
  for (const v of [v1, v2]) {
    console.log(`  ${v.version}: ${v.cases} cases, hash ${v.content_hash}  - ${v.note}`);
  }
  console.log('  numbers from different versions are different numbers; the hash makes silent drift impossible');

  section('rules');
  title('The disciplines');
  console.log('sample from real traffic, stratified, with floors for rare-but-critical strata');
  console.log('labels are checkable expectations with provenance - a person or a documented rule');
  console.log('include the cases that SHOULD refuse or escalate, not just the happy path');
  console.log('version and hash the set; grow it from every incident and every eval miss');
  console.log('size: start ~50, grow to hundreds; below ~30 a single flaky case moves the number by 3%');
}

main();
