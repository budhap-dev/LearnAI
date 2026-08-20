/**
 * Lesson 9.5 - Security: the OWASP LLM Top 10 as executable controls
 *
 * A security review of an LLM feature is not a vibe; it is a checklist of known risk classes
 * (the OWASP LLM Top 10) each mapped to a concrete control, evaluated against your system's
 * actual configuration. This example encodes that mapping and runs it against two configs - a
 * naive one and a hardened one - so "are we secure?" becomes a list of open risks with the
 * control that closes each.
 *
 * Deterministic: the "system" is a config object; the controls are predicates over it.
 *
 * Run:  node m09_production/l05_security.ts
 */

import { section, title } from '../src/learnai/index.ts';

// region: config
/** What a reviewer actually inspects: how the system is wired, not what the model says. */
interface SystemConfig {
  fencesUntrustedInput: boolean; // documents/emails/web marked as data, not instructions
  toolsLeastPrivilege: boolean; // tools scoped to the caller; write tools propose (7.3, 7.6)
  validatesOutput: boolean; // schema + value checks before acting/rendering (4.3)
  secretsInContext: boolean; // (bad) system prompt / keys reachable by the model
  dataScopedByCaller: boolean; // retrieval/tools filter by the user's authorisation
  outputClassifier: boolean; // disallowed-content check on the way out (9.7)
  pinsModelVersion: boolean; // supply chain: version pinned, not floating (9.8)
  logsPii: boolean; // (bad) raw prompts with PII into the app log
  rateLimited: boolean; // per-tenant quotas at the gateway (9.2)
  humanGateOnActions: boolean; // irreversible actions need approval (7.6)
}
// endregion

// region: controls
// Each OWASP LLM risk -> the control predicate that mitigates it. `ok(config) === true`
// means the control is present. This is your security review, as code.
const CONTROLS: [string, string, (c: SystemConfig) => boolean][] = [
  ['LLM01 Prompt injection', 'fence untrusted input; never let data act as instructions', (c) => c.fencesUntrustedInput],
  ['LLM02 Insecure output handling', 'validate output before acting on or rendering it', (c) => c.validatesOutput],
  ['LLM03 Supply chain', 'pin the model version; vet third-party tools/servers', (c) => c.pinsModelVersion],
  ['LLM04 Model denial of service', 'rate-limit and budget every caller', (c) => c.rateLimited],
  ['LLM06 Sensitive info disclosure', 'no secrets in context; scope data to the caller', (c) => !c.secretsInContext && c.dataScopedByCaller],
  ['LLM07 Insecure plugin/tool design', 'least privilege; write tools propose only', (c) => c.toolsLeastPrivilege],
  ['LLM08 Excessive agency', 'human gate on irreversible actions', (c) => c.humanGateOnActions],
  ['LLM09 Overreliance', 'output classifier + validation catch bad output', (c) => c.outputClassifier && c.validatesOutput],
  ['(privacy) PII in logs', 'redact PII before it reaches logs (9.6)', (c) => !c.logsPii],
];

function review(config: SystemConfig): [string, boolean, string][] {
  return CONTROLS.map(([risk, fix, ok]) => [risk, ok(config), fix]);
}
// endregion

const NAIVE: SystemConfig = {
  fencesUntrustedInput: false, toolsLeastPrivilege: false, validatesOutput: false,
  secretsInContext: true, dataScopedByCaller: false, outputClassifier: false,
  pinsModelVersion: false, logsPii: true, rateLimited: false, humanGateOnActions: false,
};
const HARDENED: SystemConfig = {
  fencesUntrustedInput: true, toolsLeastPrivilege: true, validatesOutput: true,
  secretsInContext: false, dataScopedByCaller: true, outputClassifier: true,
  pinsModelVersion: true, logsPii: false, rateLimited: true, humanGateOnActions: true,
};

function show(name: string, config: SystemConfig): number {
  let openRisks = 0;
  for (const [risk, ok, fix] of review(config)) {
    const mark = ok ? 'ok  ' : 'OPEN';
    console.log(`  [${mark}] ${risk}`);
    if (!ok) {
      openRisks++;
      console.log(`         fix: ${fix}`);
    }
  }
  console.log(`  ${name}: ${openRisks} open risk(s)`);
  return openRisks;
}

function main(): void {
  section('naive');
  title("The 'ship the demo' config, reviewed");
  show('naive', NAIVE);

  section('hardened');
  title('The same feature, wired with the controls');
  show('hardened', HARDENED);

  section('mindset');
  title('Why security is structural, not a prompt');
  console.log('every control is a property of the SYSTEM (fencing, scoping, gating, validation),');
  console.log('not an instruction to the model - a model can be steered; a code boundary cannot (8.6)');
  console.log('the review is executable: it runs in CI, so a regression that removes a control fails');
  console.log('map each finding to an OWASP LLM id so coverage is auditable and nothing is forgotten');

  section('boundary');
  title('The one-line test for any LLM feature');
  console.log("'if the model were actively malicious, what could it make my system DO?'");
  console.log('the answer must be bounded by code - least privilege, gates, validation, scoped data -');
  console.log("never by the model's good intentions. that is the whole of LLM security.");
}

main();
