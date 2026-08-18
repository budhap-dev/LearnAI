import { useState, type ReactNode } from 'react';

interface Props {
  /** The raw source text, used for the clipboard. */
  source: string;
  children: ReactNode;
}

/**
 * A code card with a copy-to-clipboard button. The snippets are traced extracts of runnable examples.
 *
 */
export function CodeBlock({ source, children }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable (insecure context / permission) - fail quietly */
    }
  }

  return (
    <div className="code-card">
      <button
        type="button"
        className={`copy-button ${copied ? 'copied' : ''}`}
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy code'}
        title="Copy code"
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
      {children}
    </div>
  );
}
