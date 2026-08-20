/**
 * Lesson 10.4 - Local and open-weight models
 *
 * An open-weight model is one whose weights you can download and run yourself. That buys three
 * things a hosted API cannot: data never leaves your machine, there is no per-token bill, and
 * nothing breaks when a vendor deprecates a model. The costs are the ones the API was hiding -
 * you now own the hardware, the quantisation trade-off, and the licence.
 *
 * This example runs a real local model (the same one the whole course records with, served by
 * Ollama - no API key, no network egress), then works the numbers that decide whether local is
 * worth it: how big the weights are at each quantisation, and what the licence actually permits.
 *
 * Run:  node m10_customising/l04_local_models.ts
 */

import { section, title } from '../src/learnai/index.ts';
import { DEFAULT_MODEL, complete } from '../src/learnai/llm.ts';

// region: run-local
/**
 * A normal complete() call - but the provider is a model running on THIS machine (Ollama).
 * Same adapter, same code as every hosted call in Module 5; only the endpoint is local. No
 * API key is read, and no bytes leave the host.
 */
async function askLocal(question: string): Promise<string> {
  const reply = await complete(question, { system: 'Answer in one or two plain sentences.', maxTokens: 120, temperature: 0 });
  return reply.text.trim();
}
// endregion

// region: quantise
// Quantisation stores each weight in fewer bits. Fewer bits -> smaller file and less memory,
// at some quality cost. These are the standard formats; bytes-per-weight is the whole story
// for how much RAM/VRAM the weights need.
const FORMATS: [string, number, string][] = [
  ['fp32', 4.0, 'full precision - training / reference'],
  ['fp16', 2.0, 'half precision - the usual server default'],
  ['int8', 1.0, '8-bit - ~half the memory, tiny quality loss'],
  ['int4', 0.5, '4-bit - fits big models on one consumer GPU'],
];

/**
 * Weight memory in GB = params * bytes-per-weight. (Runtime also needs the KV cache and
 * activations on top; this is the weights alone, which dominate for a chat model.)
 */
function footprintGb(paramsBillions: number, bytesPerWeight: number): number {
  return (paramsBillions * 1e9 * bytesPerWeight) / 1024 ** 3;
}
// endregion

async function main(): Promise<void> {
  section('run');
  title(`A real answer from a LOCAL model (${DEFAULT_MODEL}, served by Ollama)`);
  const q = 'In one sentence, what is model quantisation?';
  console.log(`  Q: ${q}`);
  console.log(`  A: ${await askLocal(q)}`);
  console.log('  no API key was read; no request left this machine');

  section('size');
  title('Quantisation: the same 8B model at four precisions');
  const params = 8.0; // an 8-billion-parameter model
  console.log(`  a ${params.toFixed(0)}B-parameter model, weights only:`);
  for (const [name, bpw, note] of FORMATS) {
    const gb = footprintGb(params, bpw);
    const fits = gb <= 24 ? 'one 24GB GPU' : 'needs >24GB / multi-GPU';
    console.log(`    ${name.padEnd(5)} ${bpw.toFixed(1).padStart(4)} B/wt  ${gb.toFixed(1).padStart(6)} GB  -> ${fits.padEnd(22)}  ${note}`);
  }
  console.log('  rule of thumb: int4 ~= params/2 GB, so an 8B model in 4-bit is ~4GB');

  section('worth');
  title('When local is worth it - and when the API still wins');
  console.log('LOCAL wins when: data cannot leave (privacy/regulation), volume is high and steady');
  console.log('  (no per-token bill), latency must be predictable, or you need offline / air-gapped');
  console.log('HOSTED wins when: you want the frontier model, spiky/low volume (pay per use), no');
  console.log('  ops team for GPUs, or you need the newest model the day it ships');
  console.log('the honest cost of local is the GPU, the quantisation tuning, and the on-call - not $0');

  section('licence');
  title("'Open weights' is not one licence - read it before you ship");
  const rows: [string, string][] = [
    ['Apache-2.0 / MIT', 'commercial use, modify, redistribute - the permissive default'],
    ['Llama Community', 'permissive UNTIL you cross a large-user threshold, then negotiate'],
    ['Gemma terms', 'commercial OK, but a use-policy you must pass through to users'],
    ['research-only', 'evaluation / non-commercial - NOT for production, a common trap'],
  ];
  for (const [name, terms] of rows) console.log(`    ${name.padEnd(18)} ${terms}`);
  console.log("  'open weights' != open source and != unrestricted: the licence decides what you may ship");
}

await main();
