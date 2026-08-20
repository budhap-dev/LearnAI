/**
 * Lesson 8.4 - Regression testing for prompts and models
 *
 * A prompt change is a deploy. The eval that protects it is a test suite with one twist:
 * the system under test is non-deterministic (Lesson 2.7), so a single run is a coin flip,
 * not a measurement. The gate therefore runs every case several times, scores rates, compares
 * against the baseline with a threshold - and blocks the merge when the rate regresses.
 *
 * Recording note: replayed calls are deterministic, so each attempt is recorded as a distinct
 * call (a run tag in the prompt). In production you resend the identical request and the
 * model's own sampling provides the variance; the gate logic is the same either way.
 *
 * Run:  node m08_evals/l04_regression_gate.ts
 */

import { section, title } from '../src/learnai/index.ts';
import { complete } from '../src/learnai/llm.ts';

const POLICY =
  'Annual plans can be refunded in full within 14 days of purchase. Monthly plans are not ' +
  'refundable; cancelling stops the next charge. Refunds arrive within 5 business days. ' +
  'The billing date cannot be moved.';

// region: golden
// Four cases from the 8.2 set, with checkable expectations (scorers from 8.3: a normalised
// phrase check plus a refusal check).
interface Case {
  id: string;
  q: string;
  must: string | null;
  refusal: boolean;
}
const GOLDEN: Case[] = [
  { id: 'g1', q: 'I bought an annual plan 10 days ago, can I get a refund?', must: '14 day', refusal: false },
  { id: 'g2', q: 'How long does a refund take to arrive?', must: '5 business day', refusal: false },
  { id: 'g3', q: 'Can I move my billing date to the 1st?', must: 'cannot', refusal: false },
  { id: 'g4', q: 'Do you offer student discounts?', must: null, refusal: true },
];

const PROMPTS: Record<string, string> = {
  'faq@1': "Answer the customer's question using this policy.\n\n<policy>\n{policy}\n</policy>\n\nQuestion: {q}",
  'faq@2':
    "Answer the customer's question using ONLY this policy. If the policy does not cover the " +
    'question, reply exactly NOT_COVERED.\n\n<policy>\n{policy}\n</policy>\n\nQuestion: {q}',
};
// endregion

// region: score
/**
 * 8.3's ladder applied: refusal cases check the token; the rest use a normalised phrase
 * check (hyphens, case, day/days).
 */
function score(answer: string, c: Case): boolean {
  if (c.refusal) return answer.includes('NOT_COVERED');
  let canon = answer.toLowerCase().replace(/[\s-]+/g, ' ');
  canon = canon.replace(/\bdays\b/g, 'day');
  return canon.includes(c.must!);
}
// endregion

// region: run
const ATTEMPTS = 3;

/**
 * Every case, several times. The unit of measurement is the pass RATE per case, never a
 * single pass - one run of a sampled system measures luck (Lesson 2.7).
 */
async function runEval(promptId: string): Promise<Record<string, boolean[]>> {
  const results: Record<string, boolean[]> = {};
  for (const c of GOLDEN) {
    const passes: boolean[] = [];
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      const prompt = PROMPTS[promptId].replace('{policy}', POLICY).replace('{q}', c.q);
      const reply = await complete(`${prompt}\n\n[eval run ${attempt}]`, { temperature: 0.7, maxTokens: 150 });
      passes.push(score(reply.text, c));
    }
    results[c.id] = passes;
  }
  return results;
}
// endregion

// region: gate
const THRESHOLDS = { overall_min: 0.75, max_drop: 0.1, refusal_min: 1.0 };

/**
 * The CI decision, written down before anyone needs it (write thresholds in peacetime):
 * overall rate above a floor, no big drop vs baseline, and safety-critical slices held to
 * their own bar. Every number that fails is a named reason in the CI log.
 */
function gate(baseline: Record<string, boolean[]>, candidate: Record<string, boolean[]>): [boolean, string[]] {
  const reasons: string[] = [];
  const rate = (r: Record<string, boolean[]>) => {
    const all = Object.values(r).flat();
    return all.filter(Boolean).length / all.length;
  };
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const baseRate = rate(baseline);
  const candRate = rate(candidate);
  if (candRate < THRESHOLDS.overall_min) reasons.push(`overall ${pct(candRate)} below floor ${pct(THRESHOLDS.overall_min)}`);
  if (candRate < baseRate - THRESHOLDS.max_drop) {
    reasons.push(`dropped ${pct(baseRate - candRate)} vs baseline (max ${pct(THRESHOLDS.max_drop)})`);
  }
  const refusalRate = candidate.g4.filter(Boolean).length / candidate.g4.length;
  if (refusalRate < THRESHOLDS.refusal_min) reasons.push(`refusal slice ${pct(refusalRate)} below required ${pct(THRESHOLDS.refusal_min)}`);
  return [reasons.length === 0, reasons];
}

/**
 * The rule the aggregate gate is missing: any case that collapses (was mostly passing, now
 * fails every attempt) blocks - even when the totals balance out.
 */
function perCaseRegressions(baseline: Record<string, boolean[]>, candidate: Record<string, boolean[]>): string[] {
  const found: string[] = [];
  for (const [cid, base] of Object.entries(baseline)) {
    const cand = candidate[cid];
    const b = base.filter(Boolean).length;
    if (b >= base.length - 1 && cand.filter(Boolean).length === 0) {
      found.push(`${cid} regressed ${b}/${base.length} -> 0/${cand.length}`);
    }
  }
  return found;
}
// endregion

function show(name: string, results: Record<string, boolean[]>): void {
  for (const [cid, passes] of Object.entries(results)) {
    const marks = passes.map((p) => (p ? '+' : '-')).join('');
    console.log(`  ${cid}  [${marks}]  ${passes.filter(Boolean).length}/${passes.length}`);
  }
  const all = Object.values(results).flat();
  const total = all.filter(Boolean).length;
  console.log(`  ${name}: ${total}/${all.length} = ${Math.round((total / all.length) * 100)}%`);
}

async function main(): Promise<void> {
  section('baseline');
  title(`faq@1, every case x${ATTEMPTS} attempts`);
  const baseline = await runEval('faq@1');
  show('faq@1', baseline);

  section('candidate');
  title(`faq@2 (adds the refusal rule), every case x${ATTEMPTS}`);
  const candidate = await runEval('faq@2');
  show('faq@2', candidate);

  section('verdict');
  title('The aggregate gate applies its written-down thresholds');
  const [ok, reasons] = gate(baseline, candidate);
  for (const [k, v] of Object.entries(THRESHOLDS)) {
    console.log(`  threshold ${k.padEnd(12)} = ${Math.round(v * 100)}%`);
  }
  console.log(ok ? '  PASS - all three aggregate thresholds hold' : reasons.map((r) => `  FAIL - ${r}`).join('\n'));

  section('caught');
  title('...and yet the change broke a behaviour the aggregates cannot see');
  console.log('faq@2 fixed g4 (it now refuses the uncovered question) but broke g3: told to answer');
  console.log('ONLY from the policy, the model now over-refuses a question the policy does cover');
  console.log("('the billing date cannot be moved'). One failure was swapped for another; the");
  console.log('totals balanced at 9/12 = 9/12, and the aggregate gate waved it through.');
  for (const r of perCaseRegressions(baseline, candidate)) console.log(`  BLOCK - ${r}`);
  console.log('  the per-case rule catches what totals hide: a collapsed case blocks, whatever the average');

  section('flakiness');
  title('Reading per-case marks');
  console.log('[+-+] FLAKY: at the edge of the distribution (2.7) - tighten the prompt for that case');
  console.log('      or accept the rate knowingly; never rerun-until-green.');
  console.log('[+++] -> [---] REGRESSION: the change broke this behaviour (g3 above).');
  console.log('[---] -> [+++] the fix you intended (g4 above). the gate exists so you get the second');
  console.log('without silently paying the first - store marks, not just rates.');

  section('when');
  title('When the gate runs');
  console.log('on every change to: prompt text, model or version, retrieval index, scorer, golden set');
  console.log('model-version bumps from the vendor run the SAME gate before adoption (9.8)');
  console.log('the golden set version is pinned in the report (8.2) - numbers cite the set they measured');
}

await main();
