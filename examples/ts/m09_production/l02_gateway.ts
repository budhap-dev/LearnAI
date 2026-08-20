/**
 * Lesson 9.2 - The LLM gateway
 *
 * Every model call in a serious system goes through one internal service: the gateway. It is
 * the single place that holds the API keys, enforces per-tenant quotas and rate limits, routes
 * to the right model (and falls back when one is down), and logs every call. Without it, keys
 * leak into a dozen services, one tenant starves the rest, and swapping a vendor is a
 * codebase-wide edit.
 *
 * This example builds a tiny gateway and drives fake traffic through it - deterministic on
 * purpose: the point is the policy, not a model.
 *
 * Run:  node m09_production/l02_gateway.ts
 */

import { section, title } from '../src/learnai/index.ts';

// region: request
interface Call {
  tenant: string;
  task: string; // classify | answer | reason
  tokens: number;
}

/**
 * A fake model endpoint that is sometimes down. The gateway must not care which vendor this
 * is - it speaks one internal interface.
 */
class Upstream {
  name: string;
  healthy: boolean;
  constructor(name: string, healthy = true) {
    this.name = name;
    this.healthy = healthy;
  }
  send(call: Call): string {
    if (!this.healthy) throw new Error(`${this.name} unavailable`);
    return `${this.name}: answered ${call.task}`;
  }
}
// endregion

// region: gateway
/**
 * One door for every model call. It owns four concerns application code should never touch:
 * credentials, routing, limits, and the audit log.
 */
class Gateway {
  routes: Record<string, string[]>;
  upstreams: Record<string, Upstream>;
  perTenantRpm: number;
  private counts = new Map<string, number>();
  log: string[] = [];

  constructor(routes: Record<string, string[]>, upstreams: Record<string, Upstream>, perTenantRpm = 3) {
    this.routes = routes;
    this.upstreams = upstreams;
    this.perTenantRpm = perTenantRpm;
  }

  handle(call: Call): string {
    // 1. rate limit per tenant - one noisy tenant cannot starve the others
    const used = this.counts.get(call.tenant) ?? 0;
    if (used >= this.perTenantRpm) {
      this.log.push(`${call.tenant} ${call.task} -> 429 rate limited`);
      return '429 rate_limited';
    }
    this.counts.set(call.tenant, used + 1);

    // 2. route by task, 3. fall back through the preference list on failure
    for (const name of this.routes[call.task] ?? this.routes.default) {
      const upstream = this.upstreams[name];
      try {
        const result = upstream.send(call);
        this.log.push(`${call.tenant} ${call.task} -> ${name} ok`);
        return result;
      } catch {
        this.log.push(`${call.tenant} ${call.task} -> ${name} DOWN, failing over`);
      }
    }
    this.log.push(`${call.tenant} ${call.task} -> 503 no upstream`);
    return '503 all_upstreams_down';
  }
}
// endregion

function main(): void {
  const upstreams: Record<string, Upstream> = {
    small: new Upstream('small-model'),
    large: new Upstream('large-model'),
    'large-backup': new Upstream('large-backup'),
  };
  const gw = new Gateway(
    { classify: ['small'], answer: ['small'], reason: ['large', 'large-backup'], default: ['small'] },
    upstreams,
  );

  section('routing');
  title('One door routes each task to the right model');
  for (const call of [
    { tenant: 'acme', task: 'classify', tokens: 200 },
    { tenant: 'acme', task: 'reason', tokens: 1500 },
    { tenant: 'acme', task: 'answer', tokens: 400 },
  ]) {
    console.log(`  ${call.task.padEnd(9)} -> ${gw.handle(call)}`);
  }

  section('rate-limit');
  title('Per-tenant rate limit: one tenant cannot starve the rest');
  const gw2 = new Gateway({ answer: ['small'], default: ['small'] }, upstreams, 3);
  for (let i = 0; i < 5; i++) {
    console.log(`  noisy request ${i + 1} -> ${gw2.handle({ tenant: 'noisy', task: 'answer', tokens: 300 })}`);
  }
  console.log(`  quiet tenant still served -> ${gw2.handle({ tenant: 'quiet', task: 'answer', tokens: 300 })}`);

  section('failover');
  title('The primary is down; the gateway fails over automatically');
  upstreams.large.healthy = false;
  const gw3 = new Gateway({ reason: ['large', 'large-backup'], default: ['small'] }, upstreams);
  console.log(`  reason -> ${gw3.handle({ tenant: 'acme', task: 'reason', tokens: 1500 })}`);
  for (const line of gw3.log) console.log(`    log: ${line}`);

  section('why');
  title('What the gateway buys you');
  console.log('keys live in ONE service; application code never sees a vendor credential');
  console.log('routing and fallback are config, so swapping or adding a model is not a code change');
  console.log('per-tenant quotas and rate limits are enforced centrally, not hoped for per service');
  console.log('every call is logged in one place - the trace, cost and audit all start here (5.7, 9.4)');
  console.log('stay off Azure Functions etc.: the gateway is your service, not a per-call serverless bill');
}

main();
