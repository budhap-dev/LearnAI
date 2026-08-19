/**
 * Lesson 5.1 - Your first call, properly
 *
 * A model call is a network call to a rate-limited, occasionally slow, sometimes failing
 * service. Treat it like one: a timeout, retries with backoff (only on the errors that
 * deserve them), an idempotency key so a retry cannot double-act, and a budget. The code that
 * does this is boring and the same for every vendor - which is why it lives in one wrapper.
 *
 * The wrapper is exercised first against a fake transport that fails on purpose (so you can
 * see the retry policy work, deterministically), then against the real model through the
 * adapter.
 *
 * Run:  node m05_apis/l01_first_call.ts
 */

import { createHash } from 'node:crypto';
import { section, title } from '../src/learnai/index.ts';
import { complete } from '../src/learnai/llm.ts';

// region: errors
/** What a call can fail with. `retryable` is the only thing the wrapper cares about. */
class ModelError extends Error {
  kind: string;
  retryable: boolean;
  constructor(kind: string, retryable: boolean, message = '') {
    super(message || kind);
    this.kind = kind;
    this.retryable = retryable;
  }
}

// The classes that matter. Everything else is a bug in your request - retrying will not help.
const RETRYABLE = new Set(['rate_limited', 'overloaded', 'timeout', 'server_error']);
// endregion

// region: wrapper
interface CallLog {
  attempts: number;
  waits: number[];
  outcome: string;
}

/**
 * Retry only retryable errors, with exponential backoff and a cap on attempts.
 *
 * - timeouts belong in `send` (the HTTP client), not here - this only decides what to do
 *   when one happens;
 * - the delay doubles: 0.5s, 1s, 2s (add jitter in production so clients do not stampede);
 * - a non-retryable error is raised immediately - retrying a 400 four times is four 400s.
 */
async function callWithPolicy<T>(
  send: () => Promise<T> | T,
  { maxAttempts = 4, baseDelayS = 0.5, sleep = async (_s: number) => {}, log = { attempts: 0, waits: [], outcome: '' } as CallLog } = {},
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    log.attempts = attempt;
    try {
      const result = await send();
      log.outcome = 'ok';
      return result;
    } catch (e) {
      if (!(e instanceof ModelError)) throw e;
      if (!e.retryable || attempt === maxAttempts) {
        log.outcome = `failed: ${e.kind}`;
        throw e;
      }
      const delay = baseDelayS * 2 ** (attempt - 1);
      log.waits.push(delay);
      await sleep(delay);
    }
  }
  throw new Error('unreachable');
}
// endregion

// region: idempotency
/**
 * Same user + same request => same key. The downstream action (create a ticket, send an
 * email, charge a card) checks the key before acting, so a retried model call - or a
 * double-clicked button - cannot act twice. The model call itself is idempotent enough;
 * what it TRIGGERS usually is not.
 */
function idempotencyKey(userId: string, request: Record<string, unknown>): string {
  const sorted = (v: unknown): unknown =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v as Record<string, unknown>).sort().map((k) => [k, sorted((v as Record<string, unknown>)[k])]))
      : v;
  // Match Python's json.dumps(sort_keys=True) spacing so both languages print the same key.
  const blob = JSON.stringify(sorted({ u: userId, r: request })).replace(/,/g, ', ').replace(/:/g, ': ');
  return createHash('sha256').update(blob, 'utf8').digest('hex').slice(0, 16);
}
// endregion

/** A fake `send` that follows a script: each entry is an error kind, or null for success. */
function flakyTransport(script: (string | null)[]): () => string {
  let i = 0;
  return () => {
    const kind = script[i++];
    if (kind === null) return 'ok';
    throw new ModelError(kind, RETRYABLE.has(kind));
  };
}

async function main(): Promise<void> {
  section('retry');
  title('Retryable errors get backoff; a cap stops the bleeding');
  for (const [name, script] of [
    ['rate limited twice, then ok', ['rate_limited', 'rate_limited', null]],
    ['overloaded every time', ['overloaded', 'overloaded', 'overloaded', 'overloaded']],
  ] as [string, (string | null)[]][]) {
    const log: CallLog = { attempts: 0, waits: [], outcome: '' };
    try {
      await callWithPolicy(flakyTransport(script), { log });
    } catch {
      /* logged */
    }
    console.log(`${name.padEnd(30)} attempts=${log.attempts} waits=[${log.waits.map((w) => w.toFixed(1)).join(', ')}] -> ${log.outcome}`);
  }

  section('no-retry');
  title('Non-retryable errors fail fast - do not retry a bad request');
  for (const kind of ['bad_request', 'context_length', 'auth']) {
    const log: CallLog = { attempts: 0, waits: [], outcome: '' };
    try {
      await callWithPolicy(flakyTransport([kind, null]), { log });
    } catch {
      /* logged */
    }
    console.log(`${kind.padEnd(16)} attempts=${log.attempts} -> ${log.outcome}`);
  }

  section('idempotency');
  title('An idempotency key makes the side effect safe to retry');
  const req = { action: 'create_ticket', subject: 'Reports tab crash' };
  const k1 = idempotencyKey('user-42', req);
  const k2 = idempotencyKey('user-42', req);
  const k3 = idempotencyKey('user-42', { ...req, subject: 'Billing question' });
  console.log(`same request twice  -> ${k1} == ${k2}: ${k1 === k2 ? 'True' : 'False'}`);
  console.log(`different request   -> ${k3} != ${k1}: ${k3 !== k1 ? 'True' : 'False'}`);
  console.log('the ticket system stores the key with the ticket; a second create with the same key is a no-op');

  section('real-call');
  title('The same wrapper around a real model call');
  const log: CallLog = { attempts: 0, waits: [], outcome: '' };
  const result = await callWithPolicy(
    () => complete('In one sentence: what does an HTTP 429 mean and what should a client do?', { maxTokens: 80 }),
    { log },
  );
  console.log(`attempts=${log.attempts} model=${result.model} tokens=${result.inputTokens}+${result.outputTokens}`);
  console.log(result.text.trim());
}

await main();
