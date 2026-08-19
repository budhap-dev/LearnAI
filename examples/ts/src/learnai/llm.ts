/**
 * The `llm` adapter: one thin door between the examples and a language model.
 *
 * Why an adapter at all? Three reasons, and they are the same three the lessons teach:
 *
 *   1. Concepts outlive vendors. Every example calls `complete(...)` / `stream(...)`; what
 *      sits behind them is one place to change.
 *   2. The site must never show output the code did not produce - but CI cannot hold an API
 *      key or spend money. So calls are *recorded* once into cassettes and *replayed* on
 *      every build. Python and TypeScript share the same cassettes byte for byte.
 *   3. Every call is accounted for: model, tokens, and when the response was recorded, so the
 *      site can say "recorded with <model> on <date>" next to any model output.
 *
 * Modes (LEARNAI_LLM_MODE):
 *   replay  (default) read examples/shared/cassettes/<hash>.json; fail loudly if missing
 *   record  call the real model and write the cassette
 *   live    call the real model, do not write cassettes (for poking around)
 *
 * Providers (examples/shared/llm-config.json, overridable with LEARNAI_LLM_PROVIDER / _MODEL):
 *   anthropic  the official SDK; needs `npm install` and an API key (examples/.env)
 *   ollama     a local open-weight model via Ollama's HTTP API; needs no key and no install
 *
 * The cassette key is a hash of the canonical request (provider, model, system, messages,
 * max_tokens, temperature, json_schema, effort, tools, stream) - identical in Python and
 * TypeScript, so either language can record and both replay. Replay needs nothing installed.
 *
 * Message shape (provider-neutral; each backend maps it):
 *   { role: 'user' | 'assistant' | 'tool', content: string,
 *     images?: string[]                       // base64, user messages (Lesson 5.4)
 *     tool_calls?: [{ id, name, arguments }]  // assistant messages (Lesson 5.3)
 *     tool_call_id?, name? }                  // tool messages: the result of one call
 */

import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHARED = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..', 'shared');
const CASSETTES = join(SHARED, 'cassettes');

/**
 * The provider and model the course records with - committed in examples/shared/llm-config.json
 * so replay resolves the same cassette keys as recording did. Lessons pass a different model
 * only to make a point. Override per run with LEARNAI_LLM_PROVIDER / LEARNAI_LLM_MODEL.
 */
const CONFIG = JSON.parse(readFileSync(join(SHARED, 'llm-config.json'), 'utf8')) as {
  provider: string; model: string; vision_model?: string; embed_model?: string; ollama_url?: string;
};
export const PROVIDER = process.env.LEARNAI_LLM_PROVIDER ?? CONFIG.provider;
export const DEFAULT_MODEL = process.env.LEARNAI_LLM_MODEL ?? CONFIG.model;
export const VISION_MODEL = process.env.LEARNAI_LLM_VISION_MODEL ?? CONFIG.vision_model ?? DEFAULT_MODEL;
export const EMBED_MODEL = process.env.LEARNAI_LLM_EMBED_MODEL ?? CONFIG.embed_model ?? 'nomic-embed-text';
const OLLAMA_URL = process.env.OLLAMA_URL ?? CONFIG.ollama_url ?? 'http://localhost:11434';

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface Message {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  images?: string[];
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface Tool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
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
  /** Tools the model may call (Lesson 5.3); the reply then carries toolCalls, stopReason 'tool_use'. */
  tools?: Tool[];
}

export interface Completion {
  text: string;
  model: string;
  stopReason: string; // end_turn | max_tokens | tool_use
  inputTokens: number;
  outputTokens: number;
  recordedAt: string; // ISO date the response was recorded
  replayed: boolean; // true when it came from a cassette
  toolCalls: ToolCall[];
}

interface CassetteResponse {
  text: string;
  model: string;
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
  tool_calls?: ToolCall[];
  chunks?: string[];
}

interface Cassette {
  request: Record<string, unknown>;
  response: CassetteResponse;
  recorded_at: string;
  recorded_by: string;
}

/** The assistant turn to append to the conversation (keeps tool calls, Lesson 5.3). */
export function asMessage(c: Completion): Message {
  const m: Message = { role: 'assistant', content: c.text };
  if (c.toolCalls.length) m.tool_calls = c.toolCalls;
  return m;
}

/** The message that carries a tool's result back to the model. */
export function toolResult(call: ToolCall, content: unknown): Message {
  return { role: 'tool', tool_call_id: call.id, name: call.name, content: typeof content === 'string' ? content : JSON.stringify(content) };
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

/** Record/live only: read examples/.env (gitignored) so a key never has to be exported. */
function loadDotenv(): void {
  const envFile = join(SHARED, '..', '.env');
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
  appendFileSync(log, JSON.stringify({ key: requestHash(cassette.request), model: cassette.response.model, recorded_at: cassette.recorded_at }) + '\n');
}

function buildRequest(messages: Message[] | string, options: CompleteOptions, streaming: boolean): Record<string, unknown> {
  const msgs: Message[] = typeof messages === 'string' ? [{ role: 'user', content: messages }] : messages;
  const request: Record<string, unknown> = {
    provider: PROVIDER, model: options.model ?? DEFAULT_MODEL, messages: msgs, max_tokens: options.maxTokens ?? 1024,
  };
  if (options.system !== undefined) request.system = options.system;
  if (options.temperature !== undefined) request.temperature = options.temperature;
  if (options.jsonSchema !== undefined) request.json_schema = options.jsonSchema;
  if (options.effort !== undefined) request.effort = options.effort;
  if (options.tools !== undefined) request.tools = options.tools;
  if (streaming) request.stream = true;
  return request;
}

function replay(path: string, request: Record<string, unknown>): Cassette {
  if (!existsSync(path)) {
    throw new Error(
      `No cassette for this request (${path.split('/').pop()}).\n` +
        `Record it once:  LEARNAI_LLM_MODE=record node <example>   (Ollama running, or a key in examples/.env)\n` +
        `Request was: ${canonical(request).slice(0, 200)}...`,
    );
  }
  const cassette = JSON.parse(readFileSync(path, 'utf8')) as Cassette;
  logUse(cassette);
  return cassette;
}

function record(path: string, request: Record<string, unknown>, response: CassetteResponse, m: string): Cassette {
  const cassette: Cassette = { request, response, recorded_at: new Date().toISOString().slice(0, 10), recorded_by: 'ts' };
  if (m === 'record') {
    mkdirSync(CASSETTES, { recursive: true });
    writeFileSync(path, JSON.stringify(cassette, null, 2) + '\n');
  }
  logUse(cassette);
  return cassette;
}

function toCompletion(cassette: Cassette, replayed: boolean): Completion {
  const r = cassette.response;
  return {
    text: r.text, model: r.model, stopReason: r.stop_reason,
    inputTokens: r.usage.input_tokens, outputTokens: r.usage.output_tokens,
    recordedAt: cassette.recorded_at, replayed, toolCalls: r.tool_calls ?? [],
  };
}

async function callProvider(request: Record<string, unknown>, streaming: boolean): Promise<CassetteResponse> {
  if (PROVIDER === 'anthropic') return callAnthropic(request, streaming);
  if (PROVIDER === 'ollama') return callOllama(request, streaming);
  throw new Error(`unknown provider '${PROVIDER}' (anthropic | ollama)`);
}

/** One model call. `messages` may be a plain string for the common single-turn case. */
export async function complete(messages: Message[] | string, options: CompleteOptions = {}): Promise<Completion> {
  const request = buildRequest(messages, options, false);
  const path = join(CASSETTES, `${requestHash(request)}.json`);
  const m = mode();
  if (m === 'replay') return toCompletion(replay(path, request), true);
  const response = await callProvider(request, false);
  return toCompletion(record(path, request, response, m), false);
}

/**
 * Like complete(), but the response arrives as text chunks (Lesson 5.2). Iterate with
 * `for await`; afterwards `.result` holds the Completion with the accounting. The cassette
 * stores the exact chunk boundaries, so replay streams the same pieces.
 */
export class Stream implements AsyncIterable<string> {
  result: Completion | null = null;
  private request: Record<string, unknown>;
  constructor(request: Record<string, unknown>) {
    this.request = request;
  }
  async *[Symbol.asyncIterator](): AsyncIterator<string> {
    const path = join(CASSETTES, `${requestHash(this.request)}.json`);
    const m = mode();
    if (m === 'replay') {
      const cassette = replay(path, this.request);
      this.result = toCompletion(cassette, true);
      for (const chunk of cassette.response.chunks ?? []) yield chunk;
      return;
    }
    // Record/live: collect the whole stream (the cassette needs it), then re-yield the exact
    // chunk boundaries - replay streams the same pieces.
    const response = await callProvider(this.request, true);
    const cassette = record(path, this.request, response, m);
    this.result = toCompletion(cassette, false);
    for (const chunk of response.chunks ?? []) yield chunk;
  }
}

export function stream(messages: Message[] | string, options: Omit<CompleteOptions, 'jsonSchema' | 'effort' | 'tools'> = {}): Stream {
  return new Stream(buildRequest(messages, options, true));
}

export interface Embeddings {
  vectors: number[][];
  model: string;
  inputTokens: number;
  recordedAt: string;
  replayed: boolean;
}

/**
 * Turn texts into vectors (Lesson 2.3 / Module 6). One request per call, cached like any other -
 * the cassette holds the vectors, so replay needs no embedding model either.
 */
export async function embed(texts: string[], options: { model?: string } = {}): Promise<Embeddings> {
  const model = options.model ?? EMBED_MODEL;
  const request: Record<string, unknown> = { provider: PROVIDER, embed_model: model, texts: [...texts] };
  const path = join(CASSETTES, `${requestHash(request)}.json`);
  const m = mode();
  if (m === 'replay') {
    const cassette = replay(path, request);
    const r = cassette.response as CassetteResponse & { vectors: number[][] };
    return { vectors: r.vectors, model: r.model, inputTokens: r.usage.input_tokens, recordedAt: cassette.recorded_at, replayed: true };
  }
  if (PROVIDER !== 'ollama') {
    throw new Error('the anthropic provider has no embeddings endpoint; set LEARNAI_LLM_PROVIDER=ollama for embeddings (or add an embeddings vendor to the adapter)');
  }
  let res: Response;
  try {
    res = await fetch(`${OLLAMA_URL}/api/embed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, input: texts }) });
  } catch (e) {
    throw new Error(`Could not reach Ollama at ${OLLAMA_URL} (${(e as Error).message}); \`ollama pull ${model}\`.`);
  }
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { model?: string; embeddings: number[][]; prompt_eval_count?: number };
  // Round to 6 decimals: plenty for cosine similarity, keeps cassettes small and identical across languages.
  const vectors = data.embeddings.map((v) => v.map((x) => Math.round(x * 1e6) / 1e6));
  const response = { vectors, model: data.model ?? model, text: '', stop_reason: 'end_turn', usage: { input_tokens: data.prompt_eval_count ?? 0, output_tokens: 0 } };
  const cassette = record(path, request, response as CassetteResponse, m);
  return { vectors, model: response.model, inputTokens: response.usage.input_tokens, recordedAt: cassette.recorded_at, replayed: false };
}

// ---- providers --------------------------------------------------------------------------

/** The official SDK, imported only here so replay needs nothing installed. */
async function callAnthropic(request: Record<string, unknown>, streaming: boolean): Promise<CassetteResponse> {
  loadDotenv();
  const { default: Anthropic } = await import('@anthropic-ai/sdk'); // npm install @anthropic-ai/sdk
  type SdkMessage = import('@anthropic-ai/sdk').default.Message;
  type MessageCreateParams = import('@anthropic-ai/sdk').default.MessageCreateParamsNonStreaming;
  const client = new Anthropic();

  const messages: Record<string, unknown>[] = [];
  for (const m of request.messages as Message[]) {
    if (m.role === 'tool') {
      messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: m.tool_call_id, content: m.content }] });
    } else if (m.role === 'assistant' && m.tool_calls?.length) {
      const blocks: Record<string, unknown>[] = m.content ? [{ type: 'text', text: m.content }] : [];
      for (const t of m.tool_calls) blocks.push({ type: 'tool_use', id: t.id, name: t.name, input: t.arguments });
      messages.push({ role: 'assistant', content: blocks });
    } else if (m.images?.length) {
      const blocks: Record<string, unknown>[] = m.images.map((img) => ({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: img } }));
      blocks.push({ type: 'text', text: m.content });
      messages.push({ role: 'user', content: blocks });
    } else {
      messages.push({ role: m.role, content: m.content });
    }
  }
  const params: Record<string, unknown> = { model: request.model, max_tokens: request.max_tokens, messages };
  if (request.system !== undefined) params.system = request.system;
  if (request.temperature !== undefined) params.temperature = request.temperature;
  if (request.tools !== undefined) params.tools = request.tools;
  const outputConfig: Record<string, unknown> = {};
  if (request.json_schema !== undefined) outputConfig.format = { type: 'json_schema', schema: request.json_schema };
  if (request.effort !== undefined) outputConfig.effort = request.effort;
  if (Object.keys(outputConfig).length) params.output_config = outputConfig;

  if (streaming) {
    const chunks: string[] = [];
    const s = client.messages.stream(params as unknown as MessageCreateParams);
    s.on('text', (text: string) => chunks.push(text));
    const final = await s.finalMessage();
    return {
      text: chunks.join(''), chunks, model: final.model, stop_reason: final.stop_reason ?? 'end_turn',
      usage: { input_tokens: final.usage.input_tokens, output_tokens: final.usage.output_tokens },
    };
  }
  const response = (await client.messages.create(params as unknown as MessageCreateParams)) as SdkMessage;
  const text = response.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
  const toolCalls = response.content
    .filter((b) => b.type === 'tool_use')
    .map((b) => ({ id: (b as { id: string }).id, name: (b as { name: string }).name, arguments: (b as { input: Record<string, unknown> }).input }));
  const result: CassetteResponse = {
    text, model: response.model, stop_reason: response.stop_reason ?? 'end_turn',
    usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens },
  };
  if (toolCalls.length) result.tool_calls = toolCalls;
  return result;
}

/**
 * Ollama's local HTTP API (ollama.com). A free, open-weight model on your own machine: no key,
 * nothing leaves the laptop. Same request shape as the hosted path, mapped:
 *   json_schema -> format (Ollama enforces the schema);  effort -> think on/off
 *   (low = off; medium and above = on, for models that support it, e.g. qwen3);
 *   tools -> tools;  images -> message.images.
 */
async function callOllama(request: Record<string, unknown>, streaming: boolean): Promise<CassetteResponse> {
  const chat: Record<string, unknown>[] = request.system !== undefined ? [{ role: 'system', content: request.system }] : [];
  for (const m of request.messages as Message[]) {
    if (m.role === 'tool') {
      chat.push({ role: 'tool', content: m.content, tool_name: m.name });
    } else {
      const out: Record<string, unknown> = { role: m.role, content: m.content };
      if (m.images?.length) out.images = m.images;
      if (m.tool_calls?.length) out.tool_calls = m.tool_calls.map((t) => ({ function: { name: t.name, arguments: t.arguments } }));
      chat.push(out);
    }
  }
  const body: Record<string, unknown> = {
    model: request.model,
    messages: chat,
    stream: streaming,
    options: { num_predict: request.max_tokens, ...(request.temperature !== undefined ? { temperature: request.temperature } : {}) },
    think: request.effort !== undefined && request.effort !== 'low',
  };
  if (request.json_schema !== undefined) body.format = request.json_schema;
  if (request.tools !== undefined) {
    body.tools = (request.tools as Tool[]).map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } }));
  }
  let res: Response;
  try {
    res = await fetch(`${OLLAMA_URL}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch (e) {
    throw new Error(`Could not reach Ollama at ${OLLAMA_URL} (${(e as Error).message}). Install it from https://ollama.com, start it, and \`ollama pull ${request.model}\`.`);
  }
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);

  type Data = {
    model?: string; message: { content: string; tool_calls?: { id?: string; function: { name: string; arguments?: Record<string, unknown> } }[] };
    done?: boolean; done_reason?: string; prompt_eval_count?: number; eval_count?: number;
  };
  const finish = (d: Data) => ({
    model: d.model ?? (request.model as string),
    stop_reason: (d.done_reason ?? 'stop') === 'stop' ? 'end_turn' : 'max_tokens',
    usage: { input_tokens: d.prompt_eval_count ?? 0, output_tokens: d.eval_count ?? 0 },
  });

  if (streaming) {
    const chunks: string[] = [];
    let last: Data = { message: { content: '' } };
    for (const line of (await res.text()).split('\n')) {
      if (!line.trim()) continue;
      const d = JSON.parse(line) as Data;
      if (d.message?.content) chunks.push(d.message.content);
      if (d.done) last = d;
    }
    return { text: chunks.join(''), chunks, ...finish(last) };
  }
  const data = (await res.json()) as Data;
  const result: CassetteResponse = { text: data.message.content, ...finish(data) };
  const calls = data.message.tool_calls ?? [];
  if (calls.length) {
    result.tool_calls = calls.map((c, i) => ({ id: c.id ?? `call_${i + 1}`, name: c.function.name, arguments: c.function.arguments ?? {} }));
    result.stop_reason = 'tool_use';
  }
  return result;
}
