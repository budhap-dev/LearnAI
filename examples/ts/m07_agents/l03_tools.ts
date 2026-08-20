/**
 * Lesson 7.3 - Tools done well
 *
 * A tool is an API whose caller is a model. That changes nothing about good API design and
 * raises the stakes on all of it: the arguments are untrusted input assembled by a text
 * predictor, possibly influenced by text an attacker wrote (Lesson 4.6). This example builds
 * one dangerous tool badly, attacks it, then rebuilds it well - narrow contract, validation,
 * least privilege, idempotency, and an audit line per call.
 *
 * No model is called: the attacker here is a script standing in for "whatever the model might
 * emit". That is the right paranoia level - you validate as if the arguments came from the
 * internet, because indirectly they did.
 *
 * Run:  node m07_agents/l03_tools.ts
 */

import { section, title } from '../src/learnai/index.ts';

// region: bad
/**
 * 'Refund a customer' with every classic mistake: free-text amount, no cap, no allow-list,
 * acts immediately, no audit trail. Fine in a demo; a headline in production.
 */
class BadRefundTool {
  paidOut = 0;

  refund(orderId: string, amount: string, reason: string): string {
    const value = Function(`"use strict"; return (${amount});`)() as number; // the mistake, on purpose
    this.paidOut += value;
    return `refunded ${value.toFixed(2)} on ${orderId}: ${reason}`;
  }
}
// endregion

// region: attacks
const ATTACKS: [string, { order_id: string; amount: string; reason: string }][] = [
  ['plausible over-refund', { order_id: 'ORD-1042', amount: '915.00', reason: 'customer unhappy' }],
  ['arithmetic smuggling', { order_id: 'ORD-1042', amount: '915.00 * 10', reason: 'loyalty bonus' }],
  ['unknown order', { order_id: 'ORD-9999; DROP TABLE orders', amount: '50', reason: 'test' }],
  ['negative amount', { order_id: 'ORD-1042', amount: '-500', reason: 'adjustment' }],
];
// endregion

// region: good
const ORDERS: Record<string, { total: number; alreadyRefunded: number }> = { 'ORD-1042': { total: 915.0, alreadyRefunded: 0.0 } };
const REFUND_CAP_WITHOUT_APPROVAL = 50.0;

interface Proposal {
  orderId: string;
  amount: number;
  reason: string;
  needsApproval: boolean;
}

/**
 * The same capability, engineered:
 * - narrow types: amount is a number, validated against the order, never evaluated
 * - least privilege: the tool PROPOSES; a separate, human-gated step executes (7.6)
 * - caps: anything above the threshold requires approval - policy in code, not prompt
 * - idempotent: one refund per order per reason; retries are no-ops
 * - audited: every call logged with its verdict, for the trace (5.7)
 */
class GoodRefundTool {
  audit: string[] = [];
  proposed = new Map<string, Proposal>();

  refund(orderId: string, amount: unknown, reason: string): Record<string, unknown> {
    const verdict = this.validate(orderId, amount, reason);
    const amountRepr = typeof amount === 'number' ? pyFloat(amount) : `'${amount}'`;
    this.audit.push(`refund(${orderId}, ${amountRepr}) -> ${verdict}`);
    if (verdict !== 'ok') return { error: verdict };
    const key = `${orderId}:${reason}`;
    if (this.proposed.has(key)) return { status: 'already_proposed', key }; // idempotent retry
    const needsApproval = (amount as number) > REFUND_CAP_WITHOUT_APPROVAL;
    this.proposed.set(key, { orderId, amount: amount as number, reason, needsApproval });
    return { status: 'proposed', needs_approval: needsApproval, key };
  }

  private validate(orderId: string, amount: unknown, reason: string): string {
    if (typeof amount !== 'number' || Number.isNaN(amount)) return `amount must be a number, got str`;
    const order = ORDERS[orderId];
    if (!order) return `unknown order '${orderId}'`;
    if (amount <= 0) return 'amount must be positive';
    const refundable = order.total - order.alreadyRefunded;
    if (amount > refundable) return `amount ${amount.toFixed(2)} exceeds refundable ${refundable.toFixed(2)}`;
    if (!reason.trim()) return 'reason is required';
    return 'ok';
  }
}
// endregion

// Python prints floats like 915.0 and dicts with single quotes; mirror both so the twins match.
const pyFloat = (n: number) => (Number.isInteger(n) ? `${n}.0` : String(n));
function pyDict(v: Record<string, unknown>): string {
  const one = (x: unknown): string =>
    typeof x === 'string' ? (x.includes("'") ? `"${x}"` : `'${x}'`) : typeof x === 'boolean' ? (x ? 'True' : 'False') : String(x);
  return `{${Object.entries(v).map(([k, x]) => `'${k}': ${one(x)}`).join(', ')}}`;
}

function main(): void {
  section('bad');
  title('The naive tool, attacked with plausible arguments');
  const bad = new BadRefundTool();
  for (const [name, args] of ATTACKS) {
    let result: string;
    try {
      result = bad.refund(args.order_id, args.amount, args.reason);
    } catch (e) {
      result = `crashed: ${(e as Error).message}`;
    }
    console.log(`  ${name.padEnd(22)} -> ${result}`);
  }
  console.log(`  total paid out by a tool that 'worked': ${bad.paidOut.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  section('good');
  title('The same attacks against the engineered tool');
  const good = new GoodRefundTool();
  for (const [name, args] of ATTACKS) {
    // The schema layer would have done this conversion (Lesson 4.3).
    const parsed = Number(args.amount);
    const amount: unknown = Number.isNaN(parsed) ? args.amount : parsed;
    const result = good.refund(args.order_id, amount, args.reason);
    console.log(`  ${name.padEnd(22)} -> ${pyDict(result)}`);
  }
  console.log('  retry of the first attack:', pyDict(good.refund('ORD-1042', 915.0, 'customer unhappy')));

  section('audit');
  title('Every call left a line for the trace');
  for (const line of good.audit) console.log('  ' + line);

  section('rules');
  title('The contract checklist');
  console.log('narrow, typed, enumerated arguments - the schema is the first validator, never the last');
  console.log('validate against reality (the order), not just the type (a float)');
  console.log('least privilege: read tools read, write tools propose; execution is a separate, gated step');
  console.log('caps and policy live in code; the prompt cannot lower them');
  console.log("idempotent by key, so the loop's retries cannot double-act (Lesson 5.1)");
  console.log("every call audited - the agent's actions must be reconstructable from the trace");
}

main();
