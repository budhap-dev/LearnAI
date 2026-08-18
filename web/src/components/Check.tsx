import { useState } from 'react';

/**
 * An inline "check yourself" card, placed at the point in a lesson where a misconception
 * usually forms. Not scored - the value is the correction landing at the right moment.
 *
 * Authored as a fence in the notes:
 *
 *     ```check
 *     A model 'hallucinates' a fact. Is that a bug in the model?
 *     - Yes - the model malfunctioned
 *     - * No - it produced the most plausible continuation without grounds; that is the mechanism
 *     why: A language model is a next-token sampler, not a database. The fix is context or verification.
 *     ```
 *
 * The first non-empty line is the question, `- ` lines are options (`- * ` marks the right one),
 * and `why:` is the explanation shown after any answer.
 */
export interface CheckSpec {
  question: string;
  options: string[];
  answer: number;
  why: string;
}

export function parseCheck(body: string): CheckSpec | null {
  const lines = body.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim());
  if (lines.length < 3) return null;
  const question = lines[0].trim();
  const options: string[] = [];
  let answer = -1;
  let why = '';
  for (const line of lines.slice(1)) {
    const t = line.trim();
    if (t.startsWith('- ')) {
      const text = t.slice(2).trim();
      if (text.startsWith('* ')) {
        answer = options.length;
        options.push(text.slice(2).trim());
      } else {
        options.push(text);
      }
    } else if (t.startsWith('why:')) {
      why = t.slice(4).trim();
    } else if (why) {
      why += ' ' + t; // continuation lines of the explanation
    }
  }
  if (options.length < 2 || answer < 0) return null;
  return { question, options, answer, why };
}

export function Check({ spec }: { spec: CheckSpec }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <aside className="check" aria-label="Check yourself">
      <p className="check-label">Check yourself</p>
      <p className="check-q">{spec.question}</p>
      <ul className="options">
        {spec.options.map((o, i) => {
          const state = picked === null ? '' : i === spec.answer ? 'correct' : i === picked ? 'wrong' : 'muted';
          return (
            <li key={i}>
              <button className={`option ${state}`} disabled={picked !== null} onClick={() => setPicked(i)}>
                <span className="letter">{String.fromCharCode(65 + i)}</span>
                <span>{o}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {picked !== null && (
        <p className="check-why" aria-live="polite">
          <strong>{picked === spec.answer ? 'Right.' : 'Not quite.'}</strong> {spec.why}
        </p>
      )}
    </aside>
  );
}
