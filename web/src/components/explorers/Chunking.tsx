import { useMemo, useState } from 'react';

/**
 * Chunking strategies over one real document (the "Billing guide" from the Module 6 fixture):
 * see where the boundaries fall, how many chunks you get, and how big they are. Same
 * algorithms as the 6.3 example.
 */
const DOC = `## Refund policy
Annual plans can be refunded in full within 14 days of purchase. After 14 days, annual plans are not refundable, but you can cancel auto-renewal at any time and keep access until the end of the term. Monthly plans are not refundable; cancelling stops the next charge. Refunds are issued to the original payment method and typically arrive within 5 business days, though some banks take up to 10. To request a refund, open a ticket from the billing page with the invoice number; a billing specialist replies within one business day.
## Billing cycles and invoices
Subscriptions renew automatically at the end of each cycle: monthly plans on the same calendar day each month, annual plans on the anniversary of purchase. The billing date cannot currently be moved; if you need invoices aligned to a fiscal month, switch to annual billing and choose the start date when you upgrade. Invoices are emailed to the billing contact and are available under Settings > Billing > Invoices for seven years. VAT is applied based on the billing address; add a VAT number to receive reverse-charge invoices in the EU.
## Seats and user management
You are billed for seats, not for people: a seat is a licence that can be assigned to a user and reassigned when someone leaves. Removing a user frees the seat immediately; the seat count only changes when an admin reduces it under Settings > Plan. Seat reductions take effect at the next renewal; seat additions are prorated and charged immediately. If you believe you were charged for more seats than you assigned, check the seat count on the plan page first - unassigned seats are still billed.
## Plan tiers
Starter includes up to 5 seats, 10,000 API calls per month and community support. Pro includes unlimited seats at a per-seat price, 250,000 API calls per month, SSO, audit logs and email support with a one-business-day response target. Enterprise adds a custom API quota, dedicated support with a four-hour response target, data residency options and a signed DPA. Upgrades apply immediately and are prorated; downgrades apply at the next renewal.`;

const words = (t: string) => t.split(/\s+/).filter(Boolean);

function fixed(text: string, size: number, overlap: number): string[] {
  const w = words(text);
  const out: string[] = [];
  let start = 0;
  while (start < w.length) {
    out.push(w.slice(start, start + size).join(' '));
    if (start + size >= w.length) break;
    start += Math.max(1, size - overlap);
  }
  return out;
}
function sentences(text: string, maxWords: number): string[] {
  const sents = text.replace(/\n?## [^\n]+\n/g, ' ').trim().split(/(?<=[.!?])\s+/);
  const out: string[] = [];
  let cur: string[] = [];
  for (const s of sents) {
    if (cur.length && words([...cur, s].join(' ')).length > maxWords) {
      out.push(cur.join(' '));
      cur = [];
    }
    cur.push(s);
  }
  if (cur.length) out.push(cur.join(' '));
  return out;
}
function sections(text: string): string[] {
  return text.split(/\n(?=## )/).map((p) => p.trim()).filter(Boolean);
}

const HUES = [262, 200, 150, 30, 340, 90, 20, 180];

export default function Chunking() {
  const [strategy, setStrategy] = useState<'fixed' | 'sentences' | 'sections' | 'whole'>('fixed');
  const [size, setSize] = useState(60);
  const [overlap, setOverlap] = useState(15);
  const [maxWords, setMaxWords] = useState(60);

  const chunks = useMemo(() => {
    if (strategy === 'fixed') return fixed(DOC, size, overlap);
    if (strategy === 'sentences') return sentences(DOC, maxWords);
    if (strategy === 'sections') return sections(DOC);
    return [DOC];
  }, [strategy, size, overlap, maxWords]);
  const sizes = chunks.map((c) => words(c).length);
  const total = words(DOC).length;
  const embeddedWords = sizes.reduce((a, b) => a + b, 0);

  return (
    <div className="chunking">
      <div className="explorer-head">
        <strong>Chunking</strong>
        <span className="muted">one 357-word guide, four topics · the same algorithms as the 6.3 example</span>
      </div>
      <div className="sample-row" role="group" aria-label="Strategy">
        {(['whole', 'sections', 'fixed', 'sentences'] as const).map((s) => (
          <button key={s} className={`chip ${s === strategy ? 'active' : ''}`} onClick={() => setStrategy(s)}>
            {s === 'whole' ? 'whole document' : s === 'sections' ? 'sections (headings)' : s === 'fixed' ? 'fixed words' : 'sentences'}
          </button>
        ))}
      </div>
      {strategy === 'fixed' && (
        <div className="slider-grid">
          <label><span>chunk size <b>{size}</b> words</span><input type="range" min="20" max="200" step="5" value={size} onChange={(e) => setSize(Number(e.target.value))} /></label>
          <label><span>overlap <b>{overlap}</b> words</span><input type="range" min="0" max={Math.max(0, size - 5)} step="5" value={Math.min(overlap, size - 5)} onChange={(e) => setOverlap(Number(e.target.value))} /></label>
        </div>
      )}
      {strategy === 'sentences' && (
        <div className="slider-grid">
          <label><span>max words per chunk <b>{maxWords}</b></span><input type="range" min="20" max="200" step="5" value={maxWords} onChange={(e) => setMaxWords(Number(e.target.value))} /></label>
        </div>
      )}
      <div className="stat-row" aria-live="polite">
        <div className="stat"><span className="stat-n">{chunks.length}</span><span>chunks</span></div>
        <div className="stat"><span className="stat-n">{Math.min(...sizes)}–{Math.max(...sizes)}</span><span>words each</span></div>
        <div className="stat"><span className="stat-n">{(embeddedWords / total).toFixed(2)}×</span><span>text embedded (overlap cost)</span></div>
      </div>
      <div className="chunk-view">
        {chunks.map((c, i) => (
          <div key={i} className="chunk" style={{ ['--h' as string]: HUES[i % HUES.length] }}>
            <span className="chunk-n">#{i + 1} · {words(c).length} w</span>
            {c.replace(/\n/g, ' ')}
          </div>
        ))}
      </div>
      <p className="muted small">
        Whole-document chunks retrieve well and send everything; fixed windows are predictable;
        sentences and headings end where thoughts end. Watch the "text embedded" multiplier as
        overlap grows — overlap is paid for at embedding time and again at retrieval time. 6.3
        measures what each strategy does to hit@k and to the words sent to the model.
      </p>
    </div>
  );
}
