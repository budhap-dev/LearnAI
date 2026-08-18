/**
 * The `llm` adapter: one thin door between the examples and a language model.
 *
 * Why an adapter at all? Three reasons, and they are the same three the lessons teach:
 *
 *   1. Concepts outlive vendors. Every example calls `complete(...)`; what sits behind it is
 *      one place to change.
 *   2. The site must never show output the code did not produce - but CI cannot hold an API
 *      key or spend money. So calls are *recorded* once into cassettes and *replayed* on
 *      every build. Python and TypeScript share the same cassettes byte for byte.
 *   3. Every call is accounted for: model, tokens, and when the response was recorded, so the
 *      site can say "recorded with <model> on <date>" next to any model output.
 *
 * Modes (LEARNAI_LLM_MODE):
 *   replay  (default) read examples/shared/cassettes/<hash>.json; fail loudly if missing
 *   record  call the real API through the official SDK and write the cassette
 *   live    call the real API, do not write cassettes (for poking around)
 *
 * The cassette key is a hash of the canonical request (model, system, messages, max_tokens,
 * temperature) - identical in Python and TypeScript, so either language can record and both
 * replay. Recording needs `npm install @anthropic-ai/sdk` and credentials; replay needs nothing.
 */

import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The default model. Chosen once, here; lessons pass a different one only to make a point. */
export const DEFAULT_MODEL = 'claude-opus-5';

const CASSETTES = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..', 'shared', 'cassettes');

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface CompleteOptions {
  system?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /** Constrain the output to valid JSON matching this schema (structured output). */
  jsonSchema?: Record<string, unknown>;
  /** How hard the model thinks: low | medium | high | xhigh | max (Lesson 4.5). */
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
}

/** What an example gets back. Deliberately small: text, and the accounting. */
export interface Completion {
  text: string;
  model: string;
  stopReason: string;
  inputTokens: number;
  outputTokens: number;
  recordedAt: string; // ISO date the response was recorded
  replayed: boolean; // true when it came from a cassette
}

interface Cassette {
  request: Record<string, unknown>;
  response: { text: string; model: string; stop_reason: string; usage: { input_tokens: number; output_tokens: number } };
  recorded_at: string;
  recorded_by: string;
}

/** Stable JSON: sorted keys, no whitespace, unicode kept. Must match the Python twin. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function requestHash(request: Record<string, unknown>): string {
  return createHash('sha256').update(canonical(request), 'utf8').digest('hex').slice(0, 16);
}

function mode(): 'replay' | 'record' | 'live' {
  const m = process.env.LEARNAI_LLM_MODE ?? 'replay';
  if (m !== 'replay' && m !== 'record' && m !== 'live') {
    throw new Error(`LEARNAI_LLM_MODE must be replay|record|live, got '${m}'`);
  }
  return m;
}

/**
 * Record/live only: read examples/.env (gitignored) so a key never has to be exported.
 * Real environment variables win.
 */
function loadDotenv(): void {
  const envFile = join(CASSETTES, '..', '..', '.env');
  if (!existsSync(envFile)) return;
  for (const raw of readFileSync(envFile, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

/** Tell the harness which recording was used, so the site can show model + date. */
function logUse(cassette: Cassette): void {
  const log = process.env.LEARNAI_CASSETTE_LOG;
  if (!log) return;
  appendFileSync(log, JSON.stringify({ model: cassette.response.model, recorded_at: cassette.recorded_at }) + '\n');
}

/** One model call. `messages` may be a plain string for the common single-turn case. */
export async function complete(messages: Message[] | string, options: CompleteOptions = {}): Promise<Completion> {
  const msgs: Message[] = typeof messages === 'string' ? [{ role: 'user', content: messages }] : messages;
  const model = options.model ?? DEFAULT_MODEL;
  const maxTokens = options.maxTokens ?? 1024;

  const request: Record<string, unknown> = { model, messages: msgs, max_tokens: maxTokens };
  if (options.system !== undefined) request.system = options.system;
  if (options.temperature !== undefined) request.temperature = options.temperature;
  if (options.jsonSchema !== undefined) request.json_schema = options.jsonSchema;
  if (options.effort !== undefined) request.effort = options.effort;

  const key = requestHash(request);
  const path = join(CASSETTES, `${key}.json`);
  const m = mode();

  if (m === 'replay') {
    if (!existsSync(path)) {
      throw new Error(
        `No cassette for this request (${key}.json).\n` +
          `Record it once with credentials:  LEARNAI_LLM_MODE=record node <example>\n` +
          `Request was: ${canonical(request).slice(0, 200)}...`,
      );
    }
    const cassette = JSON.parse(readFileSync(path, 'utf8')) as Cassette;
    logUse(cassette);
    const r = cassette.response;
    return {
      text: r.text, model: r.model, stopReason: r.stop_reason,
      inputTokens: r.usage.input_tokens, outputTokens: r.usage.output_tokens,
      recordedAt: cassette.recorded_at, replayed: true,
    };
  }

  // record / live: the official SDK, imported only here so replay needs nothing installed.
  loadDotenv();
  const { default: Anthropic } = await import('@anthropic-ai/sdk'); // npm install @anthropic-ai/sdk
  type SdkMessage = import('@anthropic-ai/sdk').default.Message;
  type MessageCreateParams = import('@anthropic-ai/sdk').default.MessageCreateParamsNonStreaming;
  const client = new Anthropic();
  const outputConfig: Record<string, unknown> = {};
  if (options.jsonSchema !== undefined) outputConfig.format = { type: 'json_schema', schema: options.jsonSchema };
  if (options.effort !== undefined) outputConfig.effort = options.effort;
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    messages: msgs,
    ...(options.system !== undefined ? { system: options.system } : {}),
    ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    ...(Object.keys(outputConfig).length ? { output_config: outputConfig } : {}),
  } as MessageCreateParams) as SdkMessage;

  const text = response.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
  const recordedAt = new Date().toISOString().slice(0, 10);
  const cassette: Cassette = {
    request,
    response: {
      text,
      model: response.model,
      stop_reason: response.stop_reason ?? 'end_turn',
      usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens },
    },
    recorded_at: recordedAt,
    recorded_by: 'ts',
  };
  if (m === 'record') {
    mkdirSync(CASSETTES, { recursive: true });
    writeFileSync(path, JSON.stringify(cassette, null, 2) + '\n');
  }
  logUse(cassette);
  return {
    text, model: response.model, stopReason: cassette.response.stop_reason,
    inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens,
    recordedAt, replayed: false,
  };
}
