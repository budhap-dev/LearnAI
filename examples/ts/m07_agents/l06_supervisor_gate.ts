/**
 * Lesson 7.6 - Multi-agent and the human gate
 *
 * Two patterns that keep bigger agent systems governable:
 *
 *   * Supervisor / workers: one model call plans and routes; specialist calls (smaller
 *     prompts, narrower tools) do the pieces. "Multi-agent" is not exotic - it is function
 *     decomposition where some functions are model calls.
 *   * The approval gate: anything with a blast radius produces a PROPOSAL that a human
 *     approves or rejects. The gate is code between propose and execute - the model cannot
 *     talk its way through it.
 *
 * The scenario: a customer email asks for two things - a billing correction (money: gated)
 * and a plan question (harmless: auto-serve). One recorded run drives both paths.
 *
 * Run:  node m07_agents/l06_supervisor_gate.ts
 */

import { section, title } from '../src/learnai/index.ts';
import { complete } from '../src/learnai/llm.ts';

const EMAIL =
  'Subject: two things\n\n' +
  '1) You charged us for 42 seats this month but we reduced to 40 before renewal - ' +
  'please correct the invoice (INV-2291, difference 50.00).\n' +
  '2) Also, does the Pro plan include SSO, or do we need Enterprise?';

// region: supervisor
const ROUTE_SCHEMA = {
  type: 'object',
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['billing_adjustment', 'product_question', 'other'] },
          detail: { type: 'string' },
        },
        required: ['kind', 'detail'],
        additionalProperties: false,
      },
    },
  },
  required: ['tasks'],
  additionalProperties: false,
};

interface Task {
  kind: string;
  detail: string;
}

/**
 * The supervisor does one thing: split the request into typed tasks. It has no tools and no
 * authority - routing is the whole job, so its failure modes are small.
 */
async function supervise(email: string): Promise<Task[]> {
  const result = await complete(`Split this customer email into separate tasks and classify each.\n\n<email>\n${email}\n</email>`, {
    jsonSchema: ROUTE_SCHEMA,
    maxTokens: 300,
    system: 'You are a triage supervisor. Extract every distinct request; invent nothing.',
  });
  return (JSON.parse(result.text) as { tasks: Task[] }).tasks;
}
// endregion

// region: workers
const HANDBOOK_SSO = 'SSO is available on Pro and Enterprise. SCIM provisioning is Enterprise only.';

interface Proposal {
  invoice: string;
  amount: number;
  summary: string;
}

/**
 * Workers turn a task into either an answer or a proposal. This one may move money, so it
 * can only ever PROPOSE - the schema has no 'execute' in it.
 */
async function billingWorker(detail: string): Promise<Proposal> {
  const schema = {
    type: 'object',
    properties: { invoice: { type: 'string' }, amount: { type: 'number' }, summary: { type: 'string' } },
    required: ['invoice', 'amount', 'summary'],
    additionalProperties: false,
  };
  const result = await complete(
    `Draft a billing adjustment proposal from this request. Extract the invoice id and ` +
      `amount exactly as stated; do not compute new figures.\n\n${detail}`,
    { jsonSchema: schema, maxTokens: 200 },
  );
  return JSON.parse(result.text) as Proposal;
}

/** No side effects, grounded in the handbook (Lesson 6.6) - safe to auto-serve. */
async function productWorker(detail: string): Promise<string> {
  const result = await complete(`Answer from the policy only.\n\n<policy>\n${HANDBOOK_SSO}\n</policy>\n\nQuestion: ${detail}`, {
    maxTokens: 100,
    temperature: 0.2,
  });
  return result.text.trim();
}
// endregion

// region: gate
const APPROVAL_THRESHOLD = 0.0; // every billing adjustment is gated; thresholds are policy, in code

/**
 * The gate is dumb on purpose: it checks policy, presents the proposal, and waits. Nothing
 * the model wrote can execute anything - approval is a different code path, driven by a
 * human identity your auth system knows.
 */
function gate(proposal: Proposal): { state: string } {
  const needsHuman = proposal.amount > APPROVAL_THRESHOLD;
  let state = needsHuman ? 'pending_approval' : 'auto_approved';
  // In production: persist, notify, and continue only from the approval webhook. Here a
  // scripted reviewer stands in for the human so the flow is visible end to end.
  if (needsHuman) {
    const humanDecision = proposal.invoice === 'INV-2291' && proposal.amount <= 50.0 ? 'approve' : 'reject';
    state = `${humanDecision}d by reviewer`;
  }
  return { state };
}
// endregion

async function main(): Promise<void> {
  section('route');
  title('The supervisor splits one email into typed tasks');
  const tasks = await supervise(EMAIL);
  for (const t of tasks) console.log(`  ${t.kind.padEnd(18)} ${t.detail.slice(0, 76)}`);

  section('workers');
  title('Each task goes to the narrowest worker that can handle it');
  const outcomes: ['proposal' | 'answer', Proposal | string][] = [];
  for (const t of tasks) {
    if (t.kind === 'billing_adjustment') {
      const proposal = await billingWorker(t.detail);
      outcomes.push(['proposal', proposal]);
      console.log(`  billing  -> proposal: ${proposal.invoice} amount ${proposal.amount.toFixed(2)} - ${proposal.summary.slice(0, 56)}`);
    } else if (t.kind === 'product_question') {
      const answer = await productWorker(t.detail);
      outcomes.push(['answer', answer]);
      console.log(`  product  -> answer: ${answer.slice(0, 76)}`);
    } else {
      console.log(`  other    -> route to a human unchanged`);
    }
  }

  section('gate');
  title('Money waits at the gate; answers do not');
  for (const [kind, payload] of outcomes) {
    if (kind === 'proposal') {
      const record = gate(payload as Proposal);
      console.log(`  ${(payload as Proposal).invoice}: ${record.state}`);
    } else {
      console.log(`  product answer: served immediately`);
    }
  }

  section('shape');
  title('Why this shape scales');
  console.log('supervisor: no tools, no authority - a wrong route wastes a call, never money');
  console.log('workers: narrow prompts, narrow schemas; each is testable alone (a golden set per worker)');
  console.log('gate: policy in code, driven by real auth - the model cannot approve its own proposal');
  console.log('handoffs are typed JSON, so every seam is loggable, replayable and evaluable');
}

await main();
