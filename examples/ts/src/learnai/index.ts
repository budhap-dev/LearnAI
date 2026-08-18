/**
 * Tiny helpers shared by every TypeScript example.
 *
 * The examples are ordinary scripts you can run on their own with Node 24+ (which runs
 * TypeScript directly). When run by the harness (`node harness.ts capture`) their stdout
 * is split into named sections, and each section becomes an <Output> block on the site -
 * so the site can never show output the code did not really produce.
 */

export const MARKER = '@@section:';

/** Start a named output section. Everything printed until the next call belongs to it. */
export function section(name: string): void {
  console.log(`${MARKER}${name}`);
}

/** A heading inside a section - purely cosmetic. */
export function title(text: string): void {
  console.log(text);
  console.log('-'.repeat(text.length));
}
