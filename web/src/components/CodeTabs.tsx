import { useEffect, useState } from 'react';
import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';
import typescript from 'highlight.js/lib/languages/typescript';
import { CodeBlock } from './CodeBlock';
import { LANGUAGE_LABEL, type Language } from '../lib/lessons';
import { preferredLanguage, setPreferredLanguage } from '../lib/progress';

hljs.registerLanguage('python', python);
hljs.registerLanguage('typescript', typescript);

/**
 * A traced code region shown as Python / TypeScript tabs. The choice is remembered across
 * lessons - a reader who works in TypeScript should not have to click twice per snippet.
 * All tabs on a page switch together (a shared event), which is what a reader expects.
 */
export function CodeTabs({ code, region }: { code: Partial<Record<Language, string>>; region: string }) {
  const available = (Object.keys(code) as Language[]).filter((l) => code[l]);
  const [language, setLanguage] = useState<Language>(() => {
    const preferred = preferredLanguage();
    return available.includes(preferred) ? preferred : available[0];
  });

  useEffect(() => {
    const sync = () => {
      const preferred = preferredLanguage();
      if (available.includes(preferred)) setLanguage(preferred);
    };
    window.addEventListener('language-changed', sync);
    return () => window.removeEventListener('language-changed', sync);
  }, [available]);

  function choose(l: Language) {
    setPreferredLanguage(l);
    window.dispatchEvent(new Event('language-changed'));
  }

  if (available.length === 0) return <p className="missing">No code for region “{region}”.</p>;
  const source = code[language] ?? '';
  const html = hljs.highlight(source, { language }).value;

  return (
    <div className="code-tabs">
      {available.length > 1 && (
        <div className="tablist" role="tablist" aria-label="Example language">
          {available.map((l) => (
            <button
              key={l}
              role="tab"
              aria-selected={l === language}
              className={`tab ${l === language ? 'active' : ''}`}
              onClick={() => choose(l)}
            >
              {LANGUAGE_LABEL[l]}
            </button>
          ))}
        </div>
      )}
      <CodeBlock source={source}>
        <pre>
          <code className={`hljs language-${language}`} dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
      </CodeBlock>
    </div>
  );
}
