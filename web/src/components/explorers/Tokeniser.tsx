import { useDeferredValue, useMemo, useState } from 'react';
import { encode, decode } from 'gpt-tokenizer/encoding/cl100k_base';

const SAMPLES: { label: string; text: string }[] = [
  { label: 'English', text: 'The quick brown fox jumps over the lazy dog because it can.' },
  { label: 'German', text: 'Der schnelle braune Fuchs springt über den faulen Hund, weil er es kann.' },
  { label: 'Hindi', text: 'तेज़ भूरी लोमड़ी आलसी कुत्ते के ऊपर कूदती है क्योंकि वह कर सकती है।' },
  { label: 'JSON', text: '{"orderId":"a3f9c2d1-7b4e-4c8a-9d2f-1e5b6c7d8e9f","total":1299.99,"currency":"GBP"}' },
  { label: 'Code', text: 'for (const [k, v] of Object.entries(map)) {\n  if (v > threshold) out.push(k);\n}' },
  { label: 'strawberry', text: 'How many r\'s are in strawberry? strawberry raspberry cranberry' },
];

// A small palette so neighbouring tokens are visibly distinct in every theme.
const HUES = [262, 200, 150, 30, 340, 90];

/**
 * Text -> tokens, live. Uses a real BPE vocabulary (cl100k, the one many OpenAI models
 * used) so the counts are representative; other model families tokenise differently and
 * the lesson says so. Runs entirely in the browser - nothing is sent anywhere.
 */
export default function Tokeniser() {
  const [text, setText] = useState(SAMPLES[0].text);
  const deferred = useDeferredValue(text);
  const [showIds, setShowIds] = useState(false);
  const [price, setPrice] = useState('3.00');

  const tokens = useMemo(() => {
    const ids = encode(deferred);
    return ids.map((id) => ({ id, text: decode([id]) }));
  }, [deferred]);

  const chars = deferred.length;
  const words = deferred.trim() ? deferred.trim().split(/\s+/).length : 0;
  const perToken = tokens.length ? (chars / tokens.length).toFixed(1) : '–';
  const priceNum = Number.parseFloat(price) || 0;
  const costOne = (tokens.length / 1_000_000) * priceNum; // pricing is per million tokens

  return (
    <div className="tokeniser">
      <div className="explorer-head">
        <strong>Tokeniser</strong>
        <span className="muted">cl100k BPE vocabulary · runs in your browser · nothing is sent anywhere</span>
      </div>

      <div className="sample-row" role="group" aria-label="Sample texts">
        {SAMPLES.map((s) => (
          <button key={s.label} className="chip" onClick={() => setText(s.text)}>
            {s.label}
          </button>
        ))}
      </div>

      <label className="sr-only" htmlFor="tokeniser-input">Text to tokenise</label>
      <textarea
        id="tokeniser-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        spellCheck={false}
      />

      <div className="stat-row" aria-live="polite">
        <div className="stat"><span className="stat-n">{tokens.length}</span><span>tokens</span></div>
        <div className="stat"><span className="stat-n">{chars}</span><span>characters</span></div>
        <div className="stat"><span className="stat-n">{words}</span><span>words</span></div>
        <div className="stat"><span className="stat-n">{perToken}</span><span>chars / token</span></div>
      </div>

      <div className="token-view" aria-label="Tokens">
        {tokens.map((t, i) => (
          <span
            key={i}
            className="token"
            style={{ ['--h' as string]: HUES[i % HUES.length] }}
            title={`token ${i + 1} · id ${t.id}`}
          >
            {showIds ? t.id : t.text.replace(/ /g, '␣').replace(/\n/g, '⏎')}
          </span>
        ))}
      </div>

      <div className="explorer-controls">
        <label>
          <input type="checkbox" checked={showIds} onChange={(e) => setShowIds(e.target.checked)} /> show token ids
        </label>
        <label>
          input price $/M tokens{' '}
          <input
            type="number" step="0.25" min="0" value={price} inputMode="decimal"
            onChange={(e) => setPrice(e.target.value)}
            aria-label="Input price in dollars per million tokens"
          />
        </label>
        <span className="muted">
          one request ≈ ${costOne.toFixed(6)} · 1M requests ≈ ${(costOne * 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </span>
      </div>

      <p className="muted small">
        Try: the same sentence in another language, a UUID, a number like 4829107, ALL CAPS.
        Watch where the boundaries fall and how the count moves. Prices are yours to enter — they
        change, so none are baked in.
      </p>
    </div>
  );
}
