/**
 * Lesson 5.5 - Prompt caching and batch APIs
 *
 * Two price levers that need no cleverness, only arrangement:
 *
 *   * Prompt caching: the attention state for an unchanged PREFIX of the prompt can be reused
 *     across requests (Lesson 2.4's KV cache). Providers bill cached input at a fraction of the
 *     normal price - but only for the prefix, and only if it is byte-identical. So put the
 *     stable parts first and the changing parts last.
 *   * Batch: if nobody is waiting, send requests in bulk to an asynchronous endpoint at a
 *     discount (commonly ~50%) with results in minutes to hours.
 *
 * No model is called here: the arithmetic is the lesson. Prices are parameters.
 *
 * Run:  node m05_apis/l05_caching_batch.ts
 */

import { section, title } from '../src/learnai/index.ts';

// region: prices
// USD per million tokens - illustrative parameters, see the model reference for real ones.
const INPUT = 3.0;
const CACHED_INPUT = 0.3; // a typical cached-read price: ~10% of input
const OUTPUT = 15.0;
const BATCH_DISCOUNT = 0.5; // typical
// endregion

// region: layouts
// The same request two ways. Token counts per part are illustrative.
const SYSTEM = 1_200; // persona, rules, tool descriptions - identical on every request
const FEW_SHOT = 2_500; // examples - identical on every request
const DOCS = 3_000; // retrieved context - differs per request
const USER = 150; // the question - differs per request
const OUTPUT_TOKENS = 400;

// layout A: cache-friendly - stable prefix first, variable suffix last
const CACHE_FRIENDLY = ['system', 'few_shot', 'docs', 'user'];
// layout B: cache-hostile - something variable appears before the stable parts
const CACHE_HOSTILE = ['user', 'system', 'few_shot', 'docs'];

const SIZES: Record<string, number> = { system: SYSTEM, few_shot: FEW_SHOT, docs: DOCS, user: USER };
const STABLE = new Set(['system', 'few_shot']);
const TOTAL_IN = Object.values(SIZES).reduce((a, b) => a + b, 0);

/**
 * Caching applies to the longest prefix that is identical across requests. The first
 * variable part ends it - everything after is full price even if it never changes.
 */
function cacheablePrefix(layout: string[]): number {
  let total = 0;
  for (const part of layout) {
    if (!STABLE.has(part)) break;
    total += SIZES[part];
  }
  return total;
}
// endregion

// region: cost
function requestCost(layout: string[], cacheHit: boolean): number {
  const cached = cacheHit ? cacheablePrefix(layout) : 0;
  return (cached * CACHED_INPUT + (TOTAL_IN - cached) * INPUT + OUTPUT_TOKENS * OUTPUT) / 1_000_000;
}

function daily(layout: string[], requests: number, hitRate: number): number {
  const hits = Math.floor(requests * hitRate);
  return hits * requestCost(layout, true) + (requests - hits) * requestCost(layout, false);
}
// endregion

const money = (n: number, width: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padStart(width);

function main(): void {
  section('prefix');
  title('Only the unchanged prefix is cacheable');
  for (const [name, layout] of [['cache-friendly', CACHE_FRIENDLY], ['cache-hostile', CACHE_HOSTILE]] as [string, string[]][]) {
    console.log(`${name.padEnd(15)} order=${layout.join(' > ').padEnd(40)} cacheable prefix = ${String(cacheablePrefix(layout)).padStart(5)} of ${TOTAL_IN} tokens`);
  }
  console.log('same content, same model, same answer - one layout is cacheable and one is not');

  section('cost');
  title('What it does to the bill (50k requests/day, 90% cache hit rate)');
  for (const [name, layout] of [['cache-friendly', CACHE_FRIENDLY], ['cache-hostile', CACHE_HOSTILE]] as [string, string[]][]) {
    console.log(
      `${name.padEnd(15)} per request: hit $${requestCost(layout, true).toFixed(4)}  miss $${requestCost(layout, false).toFixed(4)}   ` +
        `per day $${money(daily(layout, 50_000, 0.9), 9)}`,
    );
  }
  const saved = daily(CACHE_HOSTILE, 50_000, 0.9) - daily(CACHE_FRIENDLY, 50_000, 0.9);
  console.log(`re-ordering the prompt saves $${money(saved, 0)}/day - a refactor, not a model change`);

  section('batch');
  title('Batch: when nobody is waiting, take the discount');
  const online = daily(CACHE_FRIENDLY, 50_000, 0.9);
  console.log(`online, cache-friendly:        $${money(online, 9)}/day`);
  console.log(`batch (x${BATCH_DISCOUNT}), cache-friendly:  $${money(online * BATCH_DISCOUNT, 9)}/day   (results in minutes to hours)`);
  console.log('candidates: nightly classification, backfills, evals, report generation, re-indexing');

  section('rules');
  title('Rules that fall out of the arithmetic');
  console.log('1. stable first, variable last: system + tools + examples, then context, then the question');
  console.log('2. byte-identical means byte-identical: a timestamp or a user name in the system prompt kills the cache');
  console.log("3. measure the hit rate from the API's usage fields; alert when it drops (someone edited the prefix)");
  console.log('4. route anything nobody is waiting for to batch; keep online for humans and latency-bound calls');
}

main();
