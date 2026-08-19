/**
 * Lesson 5.6 - Token budgeting and cost control
 *
 * Cost control is three habits: a budget per request (so one prompt cannot run away), a
 * budget per tenant or user per day (so one customer cannot run away), and routing (so a
 * cheap model handles what a cheap model can). None of this needs a model call - it is
 * arithmetic and policy that wraps the model call. The example runs a day of fake traffic
 * through all three.
 *
 * Run:  node m05_apis/l06_budgets_routing.ts
 */

import { section, title } from '../src/learnai/index.ts';

// region: prices
// USD per million tokens, illustrative tiers - see the model reference for real numbers.
const TIERS: Record<string, { input: number; output: number }> = {
  small: { input: 1.0, output: 5.0 },
  large: { input: 5.0, output: 25.0 },
};
// endregion

// region: router
interface Request {
  user: string;
  kind: string; // classify | extract | answer | draft | reason
  inputTokens: number;
  outputTokens: number;
}

/**
 * A router is a rule, not a model: route by the task's shape. Classification, extraction and
 * routing itself go to the small model; open judgement and multi-step work to the large one.
 * Revisit the rule with the eval numbers (Lesson 8.4), never by feel.
 */
function route(req: Request): string {
  if (req.kind === 'classify' || req.kind === 'extract') return 'small';
  if (req.kind === 'answer' && req.inputTokens < 2_000) return 'small';
  return 'large';
}

function cost(req: Request, tier: string): number {
  const p = TIERS[tier];
  return (req.inputTokens * p.input + req.outputTokens * p.output) / 1_000_000;
}
// endregion

// region: budgets
const PER_REQUEST_INPUT_CAP = 8_000; // tokens - beyond this, truncate or reject (Lesson 2.5)
const PER_USER_DAILY_CAP_USD = 0.5; // beyond this, degrade: small model only, or queue

class Ledger {
  spent = new Map<string, number>();

  /**
   * Apply the budgets in order: request cap, then the user's daily cap (which may degrade
   * rather than refuse), then route. Returns [allowed, tier, reason].
   */
  admit(req: Request): [boolean, string, string] {
    if (req.inputTokens > PER_REQUEST_INPUT_CAP) return [false, '-', `input ${req.inputTokens} > per-request cap ${PER_REQUEST_INPUT_CAP}`];
    let tier = route(req);
    const soFar = this.spent.get(req.user) ?? 0;
    let reason: string;
    if (soFar >= PER_USER_DAILY_CAP_USD) {
      if (tier === 'large') {
        tier = 'small';
        reason = 'daily cap reached: degraded to small';
      } else {
        reason = 'daily cap reached: small only';
      }
    } else {
      reason = `routed by kind=${req.kind}`;
    }
    this.spent.set(req.user, soFar + cost(req, tier));
    return [true, tier, reason];
  }
}
// endregion

/** A fake day: one heavy user, two light ones, one oversized request. */
function traffic(): Request[] {
  const reqs: Request[] = [];
  for (let i = 0; i < 40; i++) {
    reqs.push({ user: 'alice', kind: ['classify', 'extract', 'answer', 'reason'][i % 4], inputTokens: 1_500 + (i % 5) * 500, outputTokens: 200 + (i % 3) * 100 });
  }
  for (let i = 0; i < 6; i++) reqs.push({ user: 'bob', kind: 'answer', inputTokens: 1_200, outputTokens: 250 });
  reqs.push({ user: 'carol', kind: 'draft', inputTokens: 9_500, outputTokens: 800 });
  reqs.push({ user: 'carol', kind: 'draft', inputTokens: 3_000, outputTokens: 800 });
  return reqs;
}

function main(): void {
  section('routing');
  title('Route by the shape of the task, not by hope');
  const sample: Request[] = ([['classify', 800], ['extract', 3_000], ['answer', 1_500], ['answer', 6_000], ['reason', 2_000]] as [string, number][]).map(
    ([kind, t]) => ({ user: 'x', kind, inputTokens: t, outputTokens: 300 }),
  );
  for (const r of sample) {
    const tier = route(r);
    console.log(`  ${r.kind.padEnd(9)} ${String(r.inputTokens).padStart(5)} in -> ${tier.padEnd(5)}  $${cost(r, tier).toFixed(4)}   (large would be $${cost(r, 'large').toFixed(4)})`);
  }

  section('day');
  title('A day of traffic through request caps, user caps and routing');
  const ledger = new Ledger();
  const tiers: Record<string, number> = { small: 0, large: 0 };
  let rejected = 0;
  let degraded = 0;
  for (const req of traffic()) {
    const [ok, tier, reason] = ledger.admit(req);
    if (!ok) {
      rejected++;
      console.log(`  REJECT ${req.user.padEnd(6)} ${reason}`);
      continue;
    }
    tiers[tier]++;
    if (reason.includes('degraded')) degraded++;
  }
  console.log(`  served: ${tiers.small} small, ${tiers.large} large; degraded ${degraded}; rejected ${rejected}`);
  for (const [user, usd] of [...ledger.spent].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const flag = usd >= PER_USER_DAILY_CAP_USD ? '  (hit daily cap)' : '';
    console.log(`  ${user.padEnd(6)} $${usd.toFixed(4)}${flag}`);
  }

  section('naive');
  title('Versus everything-to-the-large-model, no caps');
  const naive = traffic().reduce((s, r) => s + cost(r, 'large'), 0);
  const actual = [...ledger.spent.values()].reduce((a, b) => a + b, 0);
  console.log(`  naive   $${naive.toFixed(4)}/day`);
  console.log(`  policy  $${actual.toFixed(4)}/day  (${((1 - actual / naive) * 100).toFixed(0)}% less, and no user can run away)`);

  section('rules');
  title('The three habits');
  console.log('per request: cap input tokens (truncate deliberately, Lesson 2.5) and max_tokens for output');
  console.log('per user/tenant/day: a ledger; degrade before you refuse; alert before you degrade');
  console.log('route: cheap model for cheap tasks; measure on the golden set before moving a task down a tier');
}

main();
