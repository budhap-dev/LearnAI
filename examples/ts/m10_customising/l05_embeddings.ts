/**
 * Lesson 10.5 - Embedding models and domain adaptation
 *
 * Retrieval (Module 6) is only as good as the embedding model: if two texts your users treat as
 * the same land far apart in vector space, no reranker downstream saves you. A general model does
 * not know your domain. Two fixes: pick a stronger base model, or ADAPT one to your domain using
 * (query, relevant-passage) pairs so the things that should match move closer.
 *
 * This example measures the gain honestly. It embeds a small support corpus with a general model,
 * scores baseline retrieval, learns a tiny domain adapter from a handful of TRAINING pairs (tuned
 * by leave-one-out on those pairs), and re-measures on a HELD-OUT eval set - the only number that
 * counts. Embeddings are real recordings from a local model (nomic-embed-text); the adapter is
 * deterministic.
 *
 * Run:  node m10_customising/l05_embeddings.ts
 */

import { section, title } from '../src/learnai/index.ts';
import { embed } from '../src/learnai/llm.ts';
import { cosine } from '../src/learnai/rag.ts';

// region: corpus
// A support corpus written in house style: terse, jargon-y instructions. The docs are what we
// retrieve; the ids are the labels a query should hit.
const DOCS: [string, string][] = [
  ['deploy', 'Shipping a release: run Skyline promote to push the new build to production.'],
  ['rollback', 'Reverting a release: hit Skyline demote to restore the last known-good build.'],
  ['rotate_key', 'Credential rotation: Vaultkeeper reissues service tokens and revokes the old ones.'],
  ['oncall_page', 'Incident response: Sentry-duty pages the on-call engineer and opens a bridge.'],
  ['scale_up', 'Load handling: Autopilot adds worker replicas when the request queue grows.'],
  ['trace_debug', 'Debugging errors: Tracehub aggregates request traces to find the failing span.'],
  ['cdn_flush', 'Purging the CDN: run Edgewipe to invalidate cached assets at the edge.'],
  ['alert_mute', 'Silencing alerts: mute a noisy monitor in the alert console during maintenance.'],
  ['api_limit', 'Rate limits: each API token is capped at 100 requests per second by the gateway.'],
  ['queue_dlq', 'Dead-letter queue: messages that fail processing land in the DLQ for replay.'],
];

// Held-out eval: plain-language questions a user types. NEVER used to fit the adapter - they are
// how we grade it. Users do not speak in the docs' jargon, which is exactly where retrieval slips.
const EVAL: [string, string][] = [
  ['get my new feature out to users', 'deploy'],
  ['go back to the version that worked', 'rollback'],
  ['refresh the API tokens', 'rotate_key'],
  ['get a person on the incident', 'oncall_page'],
  ['handle a sudden surge of users', 'scale_up'],
  ['locate the slow span', 'trace_debug'],
  ['stop users seeing the old assets', 'cdn_flush'],
  ['stop the pager during planned work', 'alert_mute'],
];

// Training pairs: (query, relevant doc id) - a DIFFERENT set of phrasings from EVAL. This is the
// labelled data you collect from click logs or annotation to adapt an embedding model.
const TRAIN: [string, string][] = [
  ['put the latest version in front of users', 'deploy'],
  ['release my changes so customers get them', 'deploy'],
  ['return to the previous working state', 'rollback'],
  ['undo the last release and go back', 'rollback'],
  ['replace the credentials the services hold', 'rotate_key'],
  ['cycle the secrets the app uses', 'rotate_key'],
  ['notify the responsible engineer about an outage', 'oncall_page'],
  ['get someone alerted when production is down', 'oncall_page'],
  ['keep up when demand suddenly jumps', 'scale_up'],
  ['add capacity for a rush of traffic', 'scale_up'],
  ['find the failing part of a slow request', 'trace_debug'],
  ['see where a request is going wrong', 'trace_debug'],
  ['clear what people are seeing from the cache', 'cdn_flush'],
  ['stop serving the stale files at the edge', 'cdn_flush'],
  ['quiet the notifications during a maintenance window', 'alert_mute'],
  ['turn off paging while we do planned work', 'alert_mute'],
];
// endregion

// region: normalise
function unit(v: number[]): number[] {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return n ? v.map((x) => x / n) : v;
}
// endregion

// region: metrics
/** 1-based rank of the target doc when docs are sorted by similarity to the query. */
function rankOf(queryVec: number[], docVecs: number[][], target: number): number {
  const r6 = (x: number) => Math.round(x * 1e6) / 1e6;
  const order = docVecs.map((_, i) => i).sort((a, b) => r6(cosine(queryVec, docVecs[b])) - r6(cosine(queryVec, docVecs[a])) || a - b);
  return order.indexOf(target) + 1;
}

/**
 * Return [# ranked first, MRR] over an eval set. recall@1 is the count / total; MRR is the mean
 * reciprocal rank, which also rewards moving a near-miss from rank 2 to rank 1.
 */
function score(queryVecs: number[][], docVecs: number[][], targets: number[]): [number, number] {
  const ranks = queryVecs.map((q, i) => rankOf(q, docVecs, targets[i]));
  return [ranks.filter((r) => r === 1).length, ranks.reduce((s, r) => s + 1 / r, 0) / ranks.length];
}
// endregion

// region: adapt
/**
 * The adapter: nudge each passage toward the centroid of the TRAINING queries that should hit it,
 * by beta. This closes the systematic gap between how users phrase questions and how the docs are
 * written - a light-weight cousin of fine-tuning the embedding model itself, and the same idea
 * behind attaching generated queries to a passage (doc expansion).
 */
function augment(docVecs: number[][], trainVecs: number[][], targets: number[], beta: number): number[][] {
  const dim = docVecs[0].length;
  return docVecs.map((dv, j) => {
    const qs = trainVecs.filter((_, k) => targets[k] === j);
    if (!qs.length) return dv;
    const centroid = Array.from({ length: dim }, (_, i) => qs.reduce((s, q) => s + q[i], 0) / qs.length);
    return unit(dv.map((x, i) => x + beta * centroid[i]));
  });
}

/**
 * Pick the adapter strength by LEAVE-ONE-OUT on the training pairs: hold each pair out, build the
 * adapter from the rest, and see if the held-out query still retrieves its doc. Never touches the
 * eval set. Prefers the strongest beta among equally-good settings.
 */
function tuneBeta(docVecs: number[][], trainVecs: number[][], targets: number[]): number {
  let bestBeta = 0.0;
  let bestMrr = -1.0;
  for (let step = 1; step < 16; step++) {
    const beta = Math.round(step * 0.2 * 10) / 10;
    let total = 0.0;
    for (let k = 0; k < trainVecs.length; k++) {
      const others = trainVecs.filter((_, m) => m !== k);
      const otherTargets = targets.filter((_, m) => m !== k);
      const adapted = augment(docVecs, others, otherTargets, beta);
      total += 1 / rankOf(trainVecs[k], adapted, targets[k]);
    }
    const mrr = total / trainVecs.length;
    if (mrr >= bestMrr) {
      bestMrr = mrr;
      bestBeta = beta; // >= keeps the largest beta on a tie
    }
  }
  return bestBeta;
}
// endregion

/** Round-half-up to 3 decimals, identically in Python and TypeScript (no locale rounding). */
function f3(x: number): string {
  const m = Math.round(x * 1000);
  return `${Math.floor(m / 1000)}.${String(m % 1000).padStart(3, '0')}`;
}

async function main(): Promise<void> {
  const ids = DOCS.map((d) => d[0]);
  const docVecs = (await embed(DOCS.map(([i, t]) => `${i}: ${t}`))).vectors.map(unit);
  const evalVecs = (await embed(EVAL.map(([q]) => q))).vectors.map(unit);
  const trainVecs = (await embed(TRAIN.map(([q]) => q))).vectors.map(unit);
  const evalTargets = EVAL.map(([, lbl]) => ids.indexOf(lbl));
  const trainTargets = TRAIN.map(([, lbl]) => ids.indexOf(lbl));
  const n = EVAL.length;

  section('baseline');
  title('Baseline retrieval with a general embedding model');
  const [bHits, bMrr] = score(evalVecs, docVecs, evalTargets);
  console.log(`  held-out eval: recall@1 = ${bHits}/${n}   MRR = ${f3(bMrr)}`);
  const baseRanks = evalVecs.map((q, i) => rankOf(q, docVecs, evalTargets[i]));
  EVAL.forEach(([q, lbl], i) => {
    const r = baseRanks[i];
    console.log(`    [${r === 1 ? 'ok ' : 'MISS'}] rank ${r}  "${q.slice(0, 38)}" -> want [${lbl}]`);
  });

  section('adapt');
  title('Learn a domain adapter from the TRAINING pairs only');
  const beta = tuneBeta(docVecs, trainVecs, trainTargets);
  console.log(`  ${TRAIN.length} labelled (query, passage) pairs; adapter strength beta = ${beta.toFixed(1)}`);
  console.log('  beta chosen by leave-one-out on the training pairs - the eval set is untouched');
  const adaptedDocs = augment(docVecs, trainVecs, trainTargets, beta);

  section('gain');
  title('Re-measure on the SAME held-out eval - the only number that counts');
  const [aHits, aMrr] = score(evalVecs, adaptedDocs, evalTargets);
  console.log(`  before:  recall@1 = ${bHits}/${n}   MRR = ${f3(bMrr)}`);
  console.log(`  after:   recall@1 = ${aHits}/${n}   MRR = ${f3(aMrr)}`);
  EVAL.forEach(([q, lbl], i) => {
    const before = baseRanks[i];
    const after = rankOf(evalVecs[i], adaptedDocs, ids.indexOf(lbl));
    if (before !== 1 && after === 1) {
      console.log(`    fixed:  "${q.slice(0, 38)}" -> [${lbl}]  (was rank ${before}, now 1)`);
    } else if (after !== 1) {
      console.log(`    still:  "${q.slice(0, 38)}" -> [${lbl}]  (rank ${after}) - a jargon collision one adapter can't close`);
    }
  });
  console.log(`  a real, bounded gain from ${TRAIN.length} pairs; the rest wants a better base or more data`);

  section('rules');
  title('Choosing and adapting embeddings in practice');
  console.log('choose the BASE model first: dimension, language/domain coverage, cost - a stronger base');
  console.log('  often beats adapting a weak one, and it is far less work');
  console.log('adapt with (query, relevant-passage) pairs from YOUR traffic - click logs, annotations');
  console.log('always grade on a HELD-OUT set with recall@k / MRR (6.7); training-set gains are a mirage');
  console.log('re-embed EVERYTHING when you change or adapt the model - query and corpus must share one space');
  console.log('the gain is real but bounded: adaptation aligns a domain, it does not fix a wrong base model');
}

await main();
