/**
 * Lesson 8.3 - Scorers
 *
 * A golden set (8.2) says what a good outcome looks like; a scorer decides whether an answer
 * matched it. There are four kinds, in rising cost and falling trustworthiness: exact,
 * normalised, code-based, and model-graded (LLM-as-judge). The rule: use the cheapest scorer
 * that can honestly measure the expectation, and calibrate every judge before believing it.
 *
 * Three candidate answers to one question are scored by all four - including a deliberately
 * wrong-but-confident one - and then the judge is probed for its best-known bias (order) with
 * a real pairwise comparison run both ways.
 *
 * Run:  node m08_evals/l03_scorers.ts
 */

import { section, title } from '../src/learnai/index.ts';
import { complete } from '../src/learnai/llm.ts';

const QUESTION = 'I bought an annual plan 10 days ago, can I get a refund?';
const POLICY = 'Annual plans can be refunded in full within 14 days of purchase. Refunds are issued to the original payment method within 5 business days.';

// region: candidates
// Three answers you might get from three prompt versions. C is wrong - and confident.
const CANDIDATES: Record<string, string> = {
  A_terse_right: "Yes - you're inside the 14-day window, so you can get a full refund. [refunds]",
  B_verbose_right:
    'Thank you for reaching out! I completely understand that circumstances change. The good news ' +
    'is that our policy allows full refunds on annual plans within 14 days of purchase, and since ' +
    'you purchased just 10 days ago, you are well within that window. Once processed, the refund ' +
    'will be issued to your original payment method within 5 business days. [refunds]',
  C_confident_wrong:
    'Unfortunately annual plans are non-refundable after 7 days, so you are outside the refund ' +
    'window. However, we would be happy to apply the remaining balance as credit. [refunds]',
};
// endregion

// region: cheap-scorers
/** The brittle baseline: is the phrase there, verbatim? Fails on '14-day' (Lesson 4.4). */
const exact = (answer: string, mustContain: string): boolean => answer.includes(mustContain);

/**
 * Same check after normalising case, hyphens and whitespace - fixes most brittleness for a
 * few lines of code. Still string-shaped: it cannot tell 'within 14 days' from 'not within
 * 14 days'.
 */
function normalised(answer: string, mustContain: string): boolean {
  const canon = (t: string) => t.toLowerCase().replace(/[\s-]+/g, ' ');
  return canon(answer).includes(canon(mustContain));
}

/**
 * Deterministic checks on properties that matter: cites a source (6.6), does not contradict
 * the policy's key number, stays short enough to read. Each is a line of code and catches a
 * whole failure class.
 */
function codeChecks(answer: string): Record<string, boolean> {
  return {
    cites_source: answer.includes('[refunds]'),
    no_wrong_deadline: !/\b(7|30|60)[\s-]*days?\b/.test(answer),
    concise: answer.split(/\s+/).length <= 60,
  };
}
// endregion

// region: judge
const RUBRIC_SCHEMA = {
  type: 'object',
  properties: {
    correct: { type: 'boolean', description: 'does the answer state the policy outcome correctly?' },
    grounded: { type: 'boolean', description: 'does every claim match the policy text?' },
    score: { type: 'integer', minimum: 1, maximum: 5 },
    reason: { type: 'string' },
  },
  required: ['correct', 'grounded', 'score', 'reason'],
  additionalProperties: false,
};

interface Verdict {
  correct: boolean;
  grounded: boolean;
  score: number;
  reason: string;
}

/**
 * LLM-as-judge with the guard-rails that make it usable: a narrow rubric, the policy in the
 * prompt (the judge must not rely on its own memory), a schema, low temperature. It is
 * still a model - calibrate it against human labels before trusting it (8.2).
 */
async function judge(answer: string): Promise<Verdict> {
  const result = await complete(`<policy>\n${POLICY}\n</policy>\n\nQuestion: ${QUESTION}\n\nAnswer to grade:\n${answer}`, {
    system:
      'You grade support answers strictly against the policy. Judge correctness of the ' +
      'outcome and grounding of every claim. Be terse.',
    jsonSchema: RUBRIC_SCHEMA,
    temperature: 0.0,
    maxTokens: 200,
  });
  return JSON.parse(result.text) as Verdict;
}
// endregion

// region: order-bias
/**
 * Ask which of two answers is better - the comparison every 'A vs B' eval secretly is.
 * Running it in both orders exposes position bias; agreement across orders is the minimum
 * bar for trusting a pairwise judge.
 */
async function pairwise(first: string, second: string): Promise<string> {
  const schema = {
    type: 'object',
    properties: { winner: { type: 'string', enum: ['first', 'second'] } },
    required: ['winner'],
    additionalProperties: false,
  };
  const result = await complete(
    `<policy>\n${POLICY}\n</policy>\n\nQuestion: ${QUESTION}\n\n` +
      `First answer:\n${first}\n\nSecond answer:\n${second}\n\nWhich answers the customer better?`,
    { jsonSchema: schema, temperature: 0.0, maxTokens: 50 },
  );
  return (JSON.parse(result.text) as { winner: string }).winner;
}
// endregion

const py = (b: boolean) => (b ? 'True' : 'False');

async function main(): Promise<void> {
  section('cheap');
  title('Exact, normalised and code-based scorers on the three candidates');
  console.log(`${'candidate'.padEnd(18)} ${'exact'.padStart(6)} ${'norm'.padStart(5)}  cites  no-wrong-ddl  concise`);
  for (const [name, answer] of Object.entries(CANDIDATES)) {
    const checks = codeChecks(answer);
    console.log(
      `${name.padEnd(18)} ${py(exact(answer, '14 days')).padStart(6)} ${py(normalised(answer, '14 days')).padStart(5)}` +
        `  ${py(checks.cites_source).padEnd(5)}  ${py(checks.no_wrong_deadline).padEnd(12)}  ${py(checks.concise)}`,
    );
  }
  console.log("A is RIGHT and fails both string scorers: it says '14-day window', and the normaliser");
  console.log('handles hyphens but not day/days - normalisers are code with bugs (test them, 4.4).');
  console.log("C is WRONG and also fails them - but only because it never says '14 days'; a wrong answer");
  console.log('that quoted the phrase would pass. Only no_wrong_deadline catches the invented 7-day rule');
  console.log('for the right reason. String scorers measure phrasing; code checks measure properties.');

  section('judge');
  title('The judge, with the policy in its prompt');
  for (const [name, answer] of Object.entries(CANDIDATES)) {
    const v = await judge(answer);
    console.log(
      `${name.padEnd(18)} correct=${String(v.correct).padEnd(5)} grounded=${String(v.grounded).padEnd(5)} ` +
        `score=${v.score}  ${v.reason.slice(0, 60)}`,
    );
  }
  console.log('the booleans are all right - C is the only one flagged. the 1-5 score is noise: both');
  console.log('correct answers got 1/5. ask judges narrow yes/no questions; scalar scores need calibration');
  console.log('against human labels before they mean anything.');

  section('order-bias');
  title('The same pair, both orders');
  const ab = await pairwise(CANDIDATES.A_terse_right, CANDIDATES.B_verbose_right);
  const ba = await pairwise(CANDIDATES.B_verbose_right, CANDIDATES.A_terse_right);
  const winnerAb = ab === 'first' ? 'A' : 'B';
  const winnerBa = ba === 'first' ? 'B' : 'A';
  console.log(`  A first: winner = ${winnerAb}    B first: winner = ${winnerBa}`);
  if (winnerAb === winnerBa) {
    console.log(`  consistent across orders (both say ${winnerAb}) - this pair passes the minimum bar`);
  } else {
    console.log('  the verdict FLIPPED with the order - position bias in action; this judge cannot rank this pair');
  }
  console.log('  run pairwise judges in both orders and count a win only when they agree; ties are ties');

  section('ladder');
  title('Choosing a scorer');
  console.log('exact        free   use for enums, ids, labels - things with one spelling');
  console.log("normalised   free   use for phrases; write the normaliser once, test it (4.4's brittle checker)");
  console.log('code checks  free   use for properties: citations, numbers, length, schema, policy rules');
  console.log('judge        $/slow use for meaning: correctness, grounding, tone - after calibrating on ~50');
  console.log('                    human-labelled answers, and re-calibrating when the judge model changes');
}

await main();
