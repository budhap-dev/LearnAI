/**
 * Lesson 4.3 - Structured output
 *
 * Never parse prose. Ask for a shape, have the API constrain the output to that shape, and
 * then validate the VALUES in code - because a schema guarantees types, not truth. This is
 * the single most important pattern for putting a model inside a system.
 *
 * Run:  node m04_prompting/l03_structured_output.ts
 */

import { section, title } from '../src/learnai/index.ts';
import { complete } from '../src/learnai/llm.ts';

// region: schema
// The shape we want. `additionalProperties: false` and `required` make it strict; the enum
// pins the vocabulary; `not_found` gives the model a first-class way to say "no".
const TICKET_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['found', 'not_found'] },
    category: { type: 'string', enum: ['bug', 'how-to', 'billing', 'feature-request', 'other'] },
    urgency: { type: 'string', enum: ['low', 'medium', 'high'] },
    product_area: { type: 'string' },
    requested_by_date: { type: ['string', 'null'], description: 'ISO date if the customer named a deadline, else null' },
    summary: { type: 'string', description: 'one sentence, internal' },
  },
  required: ['status', 'category', 'urgency', 'product_area', 'requested_by_date', 'summary'],
  additionalProperties: false,
};
// endregion

interface Ticket {
  status: 'found' | 'not_found';
  category: string;
  urgency: 'low' | 'medium' | 'high';
  product_area: string;
  requested_by_date: string | null;
  summary: string;
}

const EMAILS = [
  "Subject: Reports tab crash\n\nSince yesterday's Android update the reports tab crashes on open every time. " +
    'We have a board meeting on 2026-09-02 and need the reports before then.',
  'Subject: Seats\n\nYou billed us for two seats this month but we only have one user. Please correct the invoice.',
  'Subject: (no subject)\n\nhello?? anyone there',
];

// region: extract
/**
 * Ask for JSON that matches the schema. The API enforces the shape, so JSON.parse cannot
 * fail and every key is present with the right type.
 */
async function extract(email: string): Promise<Ticket> {
  const result = await complete(
    `Extract the ticket fields from this customer email. If the email contains no actionable ` +
      `request, set status to not_found and fill the other fields with your best neutral guess.\n\n` +
      `<email>\n${email}\n</email>`,
    {
      system: 'You extract support-ticket fields. Use only what is in the email; never invent details.',
      jsonSchema: TICKET_SCHEMA,
      maxTokens: 300,
    },
  );
  return JSON.parse(result.text) as Ticket;
}
// endregion

// region: validate
/**
 * The schema checked types and enums. Code checks the VALUES: is the date a real date, is
 * it in the future, is the summary usable? A schema-valid answer can still be wrong.
 */
function validate(ticket: Ticket, today: string): string[] {
  const problems: string[] = [];
  const d = ticket.requested_by_date;
  if (d !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d))) problems.push(`requested_by_date ${d} is not an ISO date`);
    else if (d < today) problems.push(`requested_by_date ${d} is in the past`);
  }
  if (ticket.summary.split(/\s+/).filter(Boolean).length < 3) problems.push('summary too short to be useful');
  if (ticket.status === 'not_found' && ticket.urgency === 'high') problems.push('not_found tickets should not be high urgency');
  return problems;
}
// endregion

async function main(): Promise<void> {
  const today = '2026-08-18'; // fixed so the recorded run is reproducible
  for (let i = 0; i < EMAILS.length; i++) {
    const email = EMAILS[i];
    section(`email-${i + 1}`);
    title(`Email ${i + 1}: ${email.split('\n')[0]}`);
    const ticket = await extract(email);
    for (const key of TICKET_SCHEMA.required as (keyof Ticket)[]) {
      console.log(`  ${key.padEnd(18)} ${JSON.stringify(ticket[key])}`);
    }
    const problems = validate(ticket, today);
    if (ticket.status === 'not_found') console.log('  -> not_found: route to a human, do not create a ticket');
    else if (problems.length) console.log('  -> schema-valid but REJECTED by value checks:', problems.join('; '));
    else console.log('  -> accepted: create ticket');
  }

  section('why');
  title('Why both layers');
  console.log('schema  : the API guarantees valid JSON, every key, right types, allowed enums - json.loads never fails');
  console.log('code    : checks the values mean something - real dates, sane combinations, usable text');
  console.log('not_found: a first-class way to say no, so the model does not invent a ticket to be helpful (Lesson 2.6)');
}

await main();
