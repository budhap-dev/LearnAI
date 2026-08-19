import { useState } from 'react';

/**
 * The RAG pipeline, one stage at a time, using the real recorded run from Lesson 6.2: the
 * question, the retrieved articles with their real cosine scores, the assembled prompt, the
 * model's real answer and its citations. Nothing here calls a model.
 */
const RUNS = [
  {
    question: 'I bought an annual plan 10 days ago - can I get my money back?',
    hits: [['refunds', 0.769, 'Annual plans can be refunded in full within 14 days of purchase. After 14 days…'], ['billing-cycle', 0.588, 'Subscriptions renew automatically at the end of each cycle…'], ['retention', 0.524, 'Customer data is retained for the life of the subscription and for 30 days after cancellation…']] as [string, number, string][],
    answer: 'Yes, you can get a full refund within 14 days of purchase [refunds]. Since you bought the annual plan 10 days ago, you are still within the refund period. To request a refund, open a ticket from the billing page with the invoice number; a billing specialist replies within one business day. Refunds are issued to the original payment method and typically arrive within 5 business days, though some banks take up to 10.',
    verdict: 'Grounded: the claim is cited to [refunds] and every number appears in that article. Note the last two sentences carry no citation — the 6.6 verifier would flag them for review even though they are correct.',
  },
  {
    question: 'What happens when we go over our API rate limit?',
    hits: [['api-limits', 0.804, 'Each API key is limited to 60 requests per minute on Starter… Exceeding the limit returns HTTP 429 with a Retry-After header…'], ['plans', 0.578, 'Starter includes up to 5 seats, 10,000 API calls per month…'], ['security-incident', 0.557, 'If you believe you have found a vulnerability…']] as [string, number, string][],
    answer: 'When you go over your API rate limit, you will receive an HTTP 429 status code with a Retry-After header. Clients should back off exponentially and honor the header provided [api-limits].',
    verdict: 'Grounded and cited. Two of the three retrieved articles were irrelevant — that is normal; the model ignored them. Reranking (6.5) would drop them before the prompt.',
  },
  {
    question: 'Do you offer student discounts?',
    hits: [['seats', 0.523, 'You are billed for seats, not for people…'], ['refunds', 0.464, 'Annual plans can be refunded in full within 14 days…'], ['plans', 0.463, 'Starter includes up to 5 seats…']] as [string, number, string][],
    answer: 'NOT_COVERED',
    verdict: 'The refusal path: retrieval returned the three least-bad articles (scores are low and flat), and the model — told to answer only from them — said NOT_COVERED instead of inventing a policy. Route to a human.',
  },
];

const STAGES = ['ingest', 'embed question', 'retrieve', 'assemble', 'answer', 'verify'] as const;

export default function RagStepper() {
  const [ri, setRi] = useState(0);
  const [stage, setStage] = useState(0);
  const run = RUNS[ri];

  const body = () => {
    switch (STAGES[stage]) {
      case 'ingest':
        return <p>Once, ahead of time: 12 handbook articles → embedded with <code>nomic-embed-text</code> (768 dimensions) → stored next to their text and ids. The "vector store" is exactly that: id, title, text, vector — plus an index when there are many.</p>;
      case 'embed question':
        return <p>Per request: the question is embedded with the <em>same</em> model. That one vector is the only per-request embedding cost. <code>"{run.question}"</code> → 768 numbers.</p>;
      case 'retrieve':
        return (
          <>
            <p>Cosine similarity against every stored vector, top 3 kept (brute force here; an ANN index at scale — 6.4):</p>
            <ol className="emb-list">
              {run.hits.map(([id, s, preview]) => (
                <li key={id}><span><strong>{id}</strong> <span className="muted small">{preview}</span></span><span className="dist-n">{s.toFixed(3)}</span></li>
              ))}
            </ol>
          </>
        );
      case 'assemble':
        return (
          <pre className="loop-messages"><code>{`system: You answer customer questions using ONLY the provided articles. Cite the article id in square brackets after each claim, like [refunds]. If the articles do not contain the answer, reply exactly NOT_COVERED.

user: Articles:

${run.hits.map(([id]) => `[${id}] …full article text…`).join('\n\n')}

Question: ${run.question}`}</code></pre>
        );
      case 'answer':
        return <p className="rag-answer">{run.answer}</p>;
      case 'verify':
        return <p>{run.verdict}</p>;
    }
  };

  return (
    <div className="rag-stepper">
      <div className="explorer-head">
        <strong>RAG stepper</strong>
        <span className="muted">the real recorded run from 6.2 · scores and answers are from the model, not invented</span>
      </div>
      <div className="sample-row" role="group" aria-label="Questions">
        {RUNS.map((r, i) => (
          <button key={i} className={`chip ${i === ri ? 'active' : ''}`} onClick={() => { setRi(i); setStage(0); }}>{r.question.slice(0, 38)}…</button>
        ))}
      </div>
      <ol className="rag-stages">
        {STAGES.map((s, i) => (
          <li key={s} className={i === stage ? 'current' : i < stage ? 'done' : ''} onClick={() => setStage(i)}>{i + 1}. {s}</li>
        ))}
      </ol>
      <div className="loop-detail">{body()}</div>
      <div className="explorer-controls">
        <button onClick={() => setStage(Math.max(0, stage - 1))} disabled={stage === 0}>← Back</button>
        <button onClick={() => setStage(Math.min(STAGES.length - 1, stage + 1))} disabled={stage === STAGES.length - 1}>Step →</button>
        <span className="muted">the model only ever sees what retrieval put in front of it</span>
      </div>
    </div>
  );
}
