/**
 * Lesson 5.4 - Multimodal input
 *
 * Vision-capable models read images the same way they read text: the picture becomes tokens
 * and goes through the same next-token machinery. That makes "extract the total from this
 * invoice", "what does this screenshot show" and "describe this chart" ordinary prompts - with
 * two engineering caveats: images are expensive in tokens, and OCR-shaped tasks often want
 * an OCR step first. This example does both: asks the model to read a rendered invoice
 * directly into a schema, then compares with what plain text extraction would need.
 *
 * The image is a fixture rendered from HTML (examples/shared/fixtures/invoice.png), so the
 * ground truth is known: total due EUR 1,088.85, invoice INV-2026-0419.
 *
 * Run:  node m05_apis/l04_multimodal.ts
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { section, title } from '../src/learnai/index.ts';
import { VISION_MODEL, complete, type Completion } from '../src/learnai/llm.ts';

const FIXTURE = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'shared', 'fixtures', 'invoice.png');

// region: schema
const INVOICE_SCHEMA = {
  type: 'object',
  properties: {
    invoice_number: { type: 'string' },
    currency: { type: 'string' },
    subtotal: { type: 'number' },
    vat: { type: 'number' },
    total_due: { type: 'number' },
    line_item_count: { type: 'integer' },
  },
  required: ['invoice_number', 'currency', 'subtotal', 'vat', 'total_due', 'line_item_count'],
  additionalProperties: false,
};
// endregion

type Invoice = Record<string, unknown>;

// region: read-image
/**
 * One user message carrying the image (base64) and the instruction. Same structured output
 * discipline as Lesson 4.3: the schema pins the shape, code checks the values.
 */
async function readInvoice(png: Buffer): Promise<[Invoice, Completion]> {
  const result = await complete(
    [{ role: 'user', content: 'Read this invoice and fill the fields. Numbers as plain decimals.', images: [png.toString('base64')] }],
    { model: VISION_MODEL, jsonSchema: INVOICE_SCHEMA, maxTokens: 300 },
  );
  return [JSON.parse(result.text) as Invoice, result];
}
// endregion

// region: check
const TRUTH: Record<string, unknown> = { invoice_number: 'INV-2026-0419', currency: 'EUR', subtotal: 915.0, vat: 173.85, total_due: 1088.85, line_item_count: 3 };

/**
 * Ground truth is known here. In production you do not have it - so you check what you can:
 * arithmetic (subtotal + vat == total), formats, ranges. A number the model 'read' is an OCR
 * result and deserves OCR-grade verification.
 */
function check(extracted: Invoice): string[] {
  const problems: string[] = [];
  for (const [k, v] of Object.entries(TRUTH)) {
    const got = extracted[k];
    if (typeof v === 'number' && !Number.isInteger(v) && typeof got === 'number') {
      if (Math.abs(got - v) > 0.01) problems.push(`${k}: read ${got}, truth ${v}`);
    } else if (typeof v === 'number' && k !== 'line_item_count' && typeof got === 'number') {
      if (Math.abs(got - v) > 0.01) problems.push(`${k}: read ${got}, truth ${v}`);
    } else if (got !== v) {
      problems.push(`${k}: read ${pyRepr(got)}, truth ${pyRepr(v)}`);
    }
  }
  const n = (k: string, d: number) => (typeof extracted[k] === 'number' ? (extracted[k] as number) : d);
  if (Math.abs(n('subtotal', 0) + n('vat', 0) - n('total_due', -1)) > 0.01) problems.push('arithmetic: subtotal + vat != total_due');
  return problems;
}
// endregion

const pyRepr = (v: unknown) => (typeof v === 'string' ? `'${v}'` : v === null || v === undefined ? 'None' : String(v));
// Python prints 915.0 for a whole float; mirror that for the known float fields.
const pyNum = (k: string, v: unknown) =>
  typeof v === 'number' && ['subtotal', 'vat', 'total_due'].includes(k) && Number.isInteger(v) ? `${v}.0` : JSON.stringify(v ?? null);

async function main(): Promise<void> {
  const png = readFileSync(FIXTURE);

  section('extract');
  title('Ask a vision model to read the invoice straight into a schema');
  const [fields, result] = await readInvoice(png);
  for (const k of INVOICE_SCHEMA.required) console.log(`  ${k.padEnd(16)} ${pyNum(k, fields[k])}`);
  console.log(`  (${result.model}, image + prompt = ${result.inputTokens} input tokens)`);

  section('check');
  title('Verify like OCR output, because it is OCR output');
  const problems = check(fields);
  if (problems.length) for (const p of problems) console.log('  MISREAD:', p);
  else console.log('  all fields match the ground truth; arithmetic consistent');
  console.log('  a small local vision model read this; production pipelines verify the same way regardless of model');

  section('cost');
  title('Images are tokens too - budget them');
  const kb = png.length / 1024;
  console.log(`this PNG is ${kb.toFixed(0)} KB on disk and cost ${result.inputTokens} input tokens as an image`);
  console.log('a text rendering of the same invoice is ~150 tokens - when you have the text, send the text');
  console.log('rules of thumb: downscale to what a human needs to read it; crop to the region; OCR first for dense text');
}

await main();
