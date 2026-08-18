import type { Language } from '../lib/lessons';

/**
 * Captured program output. The build step guarantees Python and TypeScript agree, so one
 * block serves both tabs. Never typed by hand: if the example changes, this changes.
 */
export function OutputBlock({ output, marker }: { output: Partial<Record<Language, string>>; marker: string }) {
  const text = output.python ?? output.ts;
  if (text === undefined) return <p className="missing">No captured output “{marker}”.</p>;
  return (
    <div className="output" role="group" aria-label="Program output">
      <div className="output-label">
        <span>Output</span>
        <span className="output-verified" title="Captured from a real run of the example; regenerated on every build">
          ✓ captured from a real run
        </span>
      </div>
      <pre>
        <code>{text}</code>
      </pre>
    </div>
  );
}
