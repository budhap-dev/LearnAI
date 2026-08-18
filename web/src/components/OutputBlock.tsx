import type { Language } from '../lib/lessons';

/**
 * Captured program output. The build step guarantees Python and TypeScript agree, so one
 * block serves both tabs. Never typed by hand: if the example changes, this changes.
 */
export function OutputBlock({
  output, marker, recorded = [],
}: {
  output: Partial<Record<Language, string>>;
  marker: string;
  recorded?: { model: string; recorded_at: string }[];
}) {
  const text = output.python ?? output.ts;
  if (text === undefined) return <p className="missing">No captured output “{marker}”.</p>;
  const rec = recorded.map((r) => `${r.model} · ${r.recorded_at}`).join(', ');
  return (
    <div className="output" role="group" aria-label="Program output">
      <div className="output-label">
        <span>Output</span>
        <span className="output-verified" title={recorded.length ? `Model responses were recorded once (${rec}) and replayed on every build; the code around them ran for real` : 'Captured from a real run of the example; regenerated on every build'}>
          {recorded.length ? `✓ real run · model response recorded with ${rec}` : '✓ captured from a real run'}
        </span>
      </div>
      <pre>
        <code>{text}</code>
      </pre>
    </div>
  );
}
