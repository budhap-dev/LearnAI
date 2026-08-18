import { useState } from 'react';

/**
 * The context window as one fixed budget. Drag the parts; watch the answer get squeezed and
 * things fall off the end. Mirrors the 2.5 example's policy: oldest history first, then the
 * least-relevant documents; system prompt and answer reserve are never touched.
 */
const WINDOWS = [8_000, 32_000, 128_000, 200_000];

const PARTS = [
  { key: 'system', label: 'system prompt', hue: 262 },
  { key: 'history', label: 'conversation history', hue: 200 },
  { key: 'retrieved', label: 'retrieved documents', hue: 30 },
  { key: 'answer', label: 'answer reserve', hue: 150 },
] as const;

export default function ContextBudget() {
  const [window_, setWindow] = useState(8_000);
  const [system, setSystem] = useState(600);
  const [turns, setTurns] = useState(10);
  const [perTurn, setPerTurn] = useState(350);
  const [docs, setDocs] = useState(6);
  const [perDoc, setPerDoc] = useState(800);
  const [answer, setAnswer] = useState(1_000);

  const requested = { system, history: turns * perTurn, retrieved: docs * perDoc, answer };
  const total = Object.values(requested).reduce((a, b) => a + b, 0);
  const over = Math.max(0, total - window_);

  // Apply the policy to see what survives.
  let keptTurns = turns;
  let keptDocs = docs;
  let fitTotal = total;
  while (fitTotal > window_ && keptTurns > 2) {
    keptTurns--;
    fitTotal -= perTurn;
  }
  while (fitTotal > window_ && keptDocs > 0) {
    keptDocs--;
    fitTotal -= perDoc;
  }
  const kept = { system, history: keptTurns * perTurn, retrieved: keptDocs * perDoc, answer };
  const stillOver = fitTotal > window_;

  const scale = 100 / Math.max(window_, total);

  return (
    <div className="context-budget">
      <div className="explorer-head">
        <strong>Context budget</strong>
        <span className="muted">one window, four claimants · nothing else in this box is real</span>
      </div>

      <div className="slider-grid">
        <label>
          <span>context window <b>{window_.toLocaleString()}</b> tokens</span>
          <select value={window_} onChange={(e) => setWindow(Number(e.target.value))} aria-label="Context window size">
            {WINDOWS.map((w) => (
              <option key={w} value={w}>{w.toLocaleString()}</option>
            ))}
          </select>
        </label>
        <label>
          <span>system prompt <b>{system}</b></span>
          <input type="range" min="50" max="4000" step="50" value={system} onChange={(e) => setSystem(Number(e.target.value))} />
        </label>
        <label>
          <span>history turns <b>{turns}</b> × <b>{perTurn}</b> tokens</span>
          <input type="range" min="0" max="60" step="1" value={turns} onChange={(e) => setTurns(Number(e.target.value))} />
          <input type="range" min="50" max="1500" step="50" value={perTurn} onChange={(e) => setPerTurn(Number(e.target.value))} aria-label="tokens per turn" />
        </label>
        <label>
          <span>retrieved docs <b>{docs}</b> × <b>{perDoc}</b> tokens</span>
          <input type="range" min="0" max="40" step="1" value={docs} onChange={(e) => setDocs(Number(e.target.value))} />
          <input type="range" min="100" max="4000" step="100" value={perDoc} onChange={(e) => setPerDoc(Number(e.target.value))} aria-label="tokens per document" />
        </label>
        <label>
          <span>answer reserve <b>{answer}</b></span>
          <input type="range" min="100" max="8000" step="100" value={answer} onChange={(e) => setAnswer(Number(e.target.value))} />
        </label>
      </div>

      <p className="small"><strong>Requested</strong> — {total.toLocaleString()} tokens {over > 0 ? <span className="over">· over by {over.toLocaleString()}</span> : <span className="ok">· fits</span>}</p>
      <div className="budget-bar" role="img" aria-label={`Requested ${total} of ${window_} tokens`}>
        {PARTS.map((p) => (
          <span key={p.key} className="budget-seg" style={{ width: `${requested[p.key] * scale}%`, background: `hsl(${p.hue} 65% 55% / 0.85)` }} title={`${p.label}: ${requested[p.key].toLocaleString()}`} />
        ))}
        <span className="budget-limit" style={{ left: `${window_ * scale}%` }} aria-hidden="true" />
      </div>

      <p className="small"><strong>After the policy</strong> (drop oldest turns to a minimum of 2, then least-relevant docs) — {fitTotal.toLocaleString()} tokens
        {stillOver ? <span className="over"> · still does not fit: shrink the system prompt or the answer reserve</span> : ''}
      </p>
      <div className="budget-bar" role="img" aria-label={`Kept ${fitTotal} of ${window_} tokens`}>
        {PARTS.map((p) => (
          <span key={p.key} className="budget-seg" style={{ width: `${kept[p.key] * scale}%`, background: `hsl(${p.hue} 65% 55% / 0.85)` }} title={`${p.label}: ${kept[p.key].toLocaleString()}`} />
        ))}
        <span className="budget-limit" style={{ left: `${window_ * scale}%` }} aria-hidden="true" />
      </div>
      <ul className="legend small">
        {PARTS.map((p) => (
          <li key={p.key}><span className="swatch-dot" style={{ background: `hsl(${p.hue} 65% 55%)` }} /> {p.label}: {kept[p.key].toLocaleString()}{kept[p.key] !== requested[p.key] ? ` (dropped ${(requested[p.key] - kept[p.key]).toLocaleString()})` : ''}</li>
        ))}
      </ul>
      <p className="muted small">
        Try: a 200k window with 40 docs × 4,000 tokens — it fits, and costs ~160k input tokens
        every request. Then ask whether the answer got better. Long context is a capacity, not
        a strategy.
      </p>
    </div>
  );
}
