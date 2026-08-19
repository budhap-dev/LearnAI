/**
 * Diagrams for Module 6 - RAG & knowledge.
 */
import { Arrow, Box, C, Defs, Figure, Txt } from './primitives';

/** RAG vs fine-tune vs long context decision matrix. */
export function RagDecisionMatrix() {
  const rows = [
    ['adds', 'facts, per request, with sources', 'behaviour, format, vocabulary', 'capacity to include more'],
    ['freshness', 'as fresh as the index', 'frozen at training', 'as fresh as what you send'],
    ['cost shape', 'embed once; small prompts', 'a training project, then normal', 'every token, every request'],
    ['failure', 'wrong chunk retrieved', 'forgets; still invents facts', 'lost in the middle; latency'],
    ['provenance', 'citations', 'none', 'weak'],
    ['choose when', 'knowledge that changes or is private', 'consistent behaviour on your data; 100s of examples', 'one long doc, low volume, high value'],
  ];
  const cols = ['Retrieval (RAG)', 'Fine-tuning', 'Long context'];
  return (
    <Figure
      title="Retrieval, fine-tuning and long context answer different questions"
      caption="They are rarely alternatives. Retrieval changes what the model knows right now; fine-tuning changes how it behaves; long context is a capacity you pay for on every call. Most systems prompt well, retrieve the facts, and fine-tune only when evals say the prompt cannot get there."
      viewBox="0 0 680 270"
      maxWidth={720}
    >
      {cols.map((c, i) => (
        <g key={c}>
          <rect x={130 + i * 180} y={8} width={172} height={28} rx={6} fill={i === 0 ? C.soft : C.surface} stroke={i === 0 ? C.accent : C.border} />
          <Txt x={216 + i * 180} y={22} size={11.5} bold color={C.text}>{c}</Txt>
        </g>
      ))}
      {rows.map((r, ri) => (
        <g key={r[0]}>
          <Txt x={120} y={58 + ri * 36} size={10.5} bold color={C.text} anchor="end">{r[0]}</Txt>
          {r.slice(1).map((cell, ci) => (
            <Txt key={ci} x={216 + ci * 180} y={58 + ri * 36} size={9.5} color={ri === 5 ? C.accent : C.muted}>{cell}</Txt>
          ))}
          <line x1={10} y1={74 + ri * 36} x2={670} y2={74 + ri * 36} stroke={C.border} />
        </g>
      ))}
    </Figure>
  );
}

/** The full RAG pipeline as a chain of stages. */
export function RagPipeline() {
  const id = 'rag-pipeline';
  const top = [
    { l: 'documents', s: 'source of truth' }, { l: 'chunk', s: '6.3' }, { l: 'embed', s: 'same model' }, { l: 'store + index', s: '6.4' },
  ];
  const bottom = [
    { l: 'question', s: 'per request' }, { l: 'embed', s: 'same model' }, { l: 'retrieve', s: 'top-k, hybrid' }, { l: 'rerank', s: '6.5' }, { l: 'assemble', s: 'ids + rules' }, { l: 'answer + cite', s: '6.6' },
  ];
  return (
    <Figure
      title="The RAG pipeline: an ingest path and a query path"
      caption="Ingest runs when documents change; the query path runs per request and meets the index in the middle. Every stage can be measured and swapped — and retrieval quality is the ceiling on answer quality."
      viewBox="0 0 720 230"
      maxWidth={760}
    >
      <Defs id={id} />
      <Txt x={14} y={24} size={11} bold color={C.text} anchor="start">ingest (on change)</Txt>
      {top.map((b, i) => (
        <g key={b.l}>
          <Box x={14 + i * 120} y={34} w={104} h={40} label={b.l} sub={b.s} fill={i === 3 ? C.soft : C.surface} stroke={i === 3 ? C.accent : C.border} />
          {i < top.length - 1 && <Arrow id={id} x1={120 + i * 120} y1={54} x2={132 + i * 120} y2={54} />}
        </g>
      ))}
      <Txt x={14} y={118} size={11} bold color={C.text} anchor="start">query (per request)</Txt>
      {bottom.map((b, i) => (
        <g key={b.l}>
          <Box x={14 + i * 116} y={128} w={100} h={40} label={b.l} sub={b.s} fill={i === 5 ? C.soft : C.surface} stroke={i === 2 ? C.accent : i === 5 ? C.accent : C.border} />
          {i < bottom.length - 1 && <Arrow id={id} x1={116 + i * 116} y1={148} x2={128 + i * 116} y2={148} />}
        </g>
      ))}
      <path d="M 430 76 L 430 100 L 296 100 L 296 126" fill="none" stroke={C.accent} strokeWidth={1.4} strokeDasharray="4 3" markerEnd={`url(#${id}-arrow)`} />
      <Txt x={365} y={94} size={9.5} color={C.accent}>the index is where they meet</Txt>
      <Box x={14} y={186} w={690} h={30} label="evaluate: hit@k · correctness · faithfulness · refusal  (6.7) — re-run on every change to any stage" fill={C.surface} stroke={C.correct} />
    </Figure>
  );
}

/** Chunk overlap and size vs recall. */
export function ChunkOverlap() {
  return (
    <Figure
      title="Chunk size, overlap, and what each costs"
      caption="Bigger chunks carry more context but one vector averages more ideas — specific facts stop standing out and you send more text. Smaller chunks are precise but can cut a fact in half; overlap stops that at the price of embedding (and retrieving) the same words twice."
      viewBox="0 0 640 230"
      maxWidth={680}
    >
      <Txt x={20} y={22} size={11} bold color={C.text} anchor="start">one document, 357 words</Txt>
      <rect x={20} y={32} width={600} height={18} rx={4} fill={C.border} />
      <Txt x={20} y={74} size={11} bold color={C.text} anchor="start">whole document — 1 chunk</Txt>
      <rect x={20} y={82} width={600} height={14} rx={3} fill={C.wrong} opacity={0.6} />
      <Txt x={20} y={118} size={11} bold color={C.text} anchor="start">sections (headings) — 4 chunks</Txt>
      {[0, 1, 2, 3].map((i) => <rect key={i} x={20 + i * 152} y={126} width={144} height={14} rx={3} fill={C.accent} opacity={0.7} />)}
      <Txt x={20} y={162} size={11} bold color={C.text} anchor="start">fixed 60 words, 15 overlap — 8 chunks (overlap hatched)</Txt>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <g key={i}>
          <rect x={20 + i * 76} y={170} width={96} height={14} rx={3} fill={C.correct} opacity={0.55} />
          {i > 0 && <rect x={20 + i * 76} y={170} width={20} height={14} fill={C.text} opacity={0.25} />}
        </g>
      ))}
      <Txt x={320} y={212} size={10.5} color={C.accent}>measure hit@k and words-sent per strategy on your golden set — 6.3 does exactly this</Txt>
    </Figure>
  );
}

/** Hybrid ranking: two lists fused. */
export function HybridFusion() {
  const id = 'hybrid-fusion';
  const kw = ['api-limits', 'refunds', 'billing-cycle', 'seats', 'plans'];
  const vec = ['api-limits', 'support', 'seats', 'plans', 'retention'];
  const fused = ['api-limits', 'seats', 'billing-cycle', 'plans', 'refunds'];
  const col = (x: number, title: string, items: string[], color: string) => (
    <g>
      <Txt x={x + 60} y={40} size={11} bold color={C.text}>{title}</Txt>
      {items.map((it, i) => (
        <g key={it}>
          <rect x={x} y={52 + i * 26} width={120} height={22} rx={5} fill={it === 'api-limits' ? color : C.surface} stroke={color} opacity={0.9} />
          <Txt x={x + 60} y={63 + i * 26} size={10} color={it === 'api-limits' ? '#fff' : C.text} mono>{i + 1}. {it}</Txt>
        </g>
      ))}
    </g>
  );
  return (
    <Figure
      title="Hybrid search: two rankings, one fused list"
      caption="Keyword search (BM25) ranks by exact terms; vector search ranks by meaning; reciprocal rank fusion adds 1/(k + rank) from each list so neither's raw scores need comparing. Exact tokens, ids and jargon come from the left; paraphrase comes from the right."
      viewBox="0 0 640 200"
      maxWidth={680}
    >
      <Defs id={id} />
      {col(20, 'BM25 (keywords)', kw, C.muted)}
      {col(260, 'vectors (meaning)', vec, C.accent)}
      {col(500, 'RRF (fused)', fused, C.correct)}
      <Arrow id={id} x1={142} y1={110} x2={256} y2={110} />
      <Arrow id={id} x1={382} y1={110} x2={496} y2={110} />
      <Txt x={320} y={192} size={10.5}>score = Σ 1/(60 + rank)   ·   filter by metadata first, rerank after (6.5)</Txt>
    </Figure>
  );
}

/** Two-stage retrieval: recall then precision. */
export function TwoStageRetrieval() {
  const id = 'two-stage';
  return (
    <Figure
      title="Two stages: cheap recall, then expensive precision"
      caption="First-stage retrieval scans millions of chunks cheaply and returns a few dozen candidates. A reranker reads the query and each candidate together — too slow for the corpus, fine for twenty — and orders them. Query rewriting sits in front of both."
      viewBox="0 0 680 170"
      maxWidth={720}
    >
      <Defs id={id} />
      <Box x={10} y={50} w={100} h={44} label="message" sub="chatty, vague" />
      <Arrow id={id} x1={112} y1={72} x2={138} y2={72} />
      <Box x={140} y={50} w={100} h={44} label="rewrite" sub="→ search query" stroke={C.accent} />
      <Arrow id={id} x1={242} y1={72} x2={268} y2={72} />
      <Box x={270} y={40} w={130} h={64} label="first stage" sub="BM25 + vectors · top 20" fill={C.surface} />
      <Arrow id={id} x1={402} y1={72} x2={428} y2={72} />
      <Box x={430} y={40} w={120} h={64} label="rerank" sub="query × candidate · top 3" fill={C.soft} stroke={C.accent} bold />
      <Arrow id={id} x1={552} y1={72} x2={578} y2={72} />
      <Box x={580} y={50} w={90} h={44} label="answer" sub="6.6" />
      <Txt x={335} y={125} size={10} color={C.muted}>recall: millions → 20, milliseconds</Txt>
      <Txt x={490} y={125} size={10} color={C.accent}>precision: 20 → 3, one model call</Txt>
      <Txt x={340} y={155} size={10.5}>each step is a latency and a cost — keep the ones that move hit@k on your golden set</Txt>
    </Figure>
  );
}

/** Grounded vs ungrounded answer. */
export function GroundedVsUngrounded() {
  return (
    <Figure
      title="Grounded versus ungrounded"
      caption="Same question, same passages. The grounded answer cites a passage per claim and can be checked by code (do the ids exist? do the numbers appear in the cited text?). The ungrounded one is fluent, plausible, and one of its numbers came from nowhere — and the tone gives no clue."
      viewBox="0 0 640 210"
      maxWidth={680}
    >
      <rect x={10} y={10} width={305} height={190} rx={10} fill={C.surface} stroke={C.correct} strokeWidth={1.4} />
      <Txt x={162} y={30} size={11.5} bold color={C.correct}>grounded + verified</Txt>
      <Txt x={22} y={56} size={10} anchor="start" color={C.text}>Refunds arrive within 5 business days</Txt>
      <Txt x={22} y={70} size={10} anchor="start" color={C.text}>[refunds]. Some banks take up to 10</Txt>
      <Txt x={22} y={84} size={10} anchor="start" color={C.text}>[refunds].</Txt>
      <Txt x={22} y={112} size={9.5} anchor="start" color={C.correct}>✓ ids exist in the provided passages</Txt>
      <Txt x={22} y={128} size={9.5} anchor="start" color={C.correct}>✓ "5", "10" appear in [refunds]</Txt>
      <Txt x={22} y={144} size={9.5} anchor="start" color={C.correct}>✓ every factual sentence cited</Txt>
      <Txt x={22} y={172} size={9.5} anchor="start">→ serve, render citations as links</Txt>
      <rect x={325} y={10} width={305} height={190} rx={10} fill={C.surface} stroke={C.wrong} strokeWidth={1.4} />
      <Txt x={477} y={30} size={11.5} bold color={C.wrong}>ungrounded</Txt>
      <Txt x={337} y={56} size={10} anchor="start" color={C.text}>Refunds usually arrive within 3–5</Txt>
      <Txt x={337} y={70} size={10} anchor="start" color={C.text}>business days, and we can expedite</Txt>
      <Txt x={337} y={84} size={10} anchor="start" color={C.text}>for a small fee on request.</Txt>
      <Txt x={337} y={112} size={9.5} anchor="start" color={C.wrong}>✗ no citations — nothing to check</Txt>
      <Txt x={337} y={128} size={9.5} anchor="start" color={C.wrong}>✗ "3" and "expedite for a fee" are not in any passage</Txt>
      <Txt x={337} y={144} size={9.5} anchor="start" color={C.wrong}>✗ sounds exactly as confident</Txt>
      <Txt x={337} y={172} size={9.5} anchor="start">→ would ship an invented policy</Txt>
    </Figure>
  );
}

/** The RAG eval triad. */
export function RagEvalTriad() {
  return (
    <Figure
      title="Evaluating RAG: retrieval and generation, measured separately"
      caption="hit@k says whether the right passage was found; correctness and faithfulness say what the model did with it; refusal precision says whether it declined exactly when it should. Low hit@k means fix retrieval first — nothing downstream can recover a passage that was never retrieved."
      viewBox="0 0 640 230"
      maxWidth={680}
    >
      <rect x={20} y={20} width={280} height={190} rx={12} fill={C.surface} stroke={C.accent} strokeWidth={1.4} />
      <Txt x={160} y={42} size={12} bold color={C.accent}>retrieval</Txt>
      <Txt x={36} y={70} size={10.5} anchor="start" color={C.text}>hit@k — a relevant passage is in the top k</Txt>
      <Txt x={36} y={90} size={10} anchor="start">measured per golden question; needs labelled</Txt>
      <Txt x={36} y={104} size={10} anchor="start">relevant ids; no model call</Txt>
      <Txt x={36} y={134} size={10} anchor="start" color={C.accent}>fix with: chunking (6.3), hybrid (6.4),</Txt>
      <Txt x={36} y={148} size={10} anchor="start" color={C.accent}>rewrite + rerank (6.5)</Txt>
      <Txt x={36} y={180} size={10.5} anchor="start" color={C.text} bold>the ceiling on everything to the right</Txt>
      <rect x={340} y={20} width={280} height={190} rx={12} fill={C.surface} stroke={C.correct} strokeWidth={1.4} />
      <Txt x={480} y={42} size={12} bold color={C.correct}>generation</Txt>
      <Txt x={356} y={70} size={10.5} anchor="start" color={C.text}>correctness — contains the expected answer (code)</Txt>
      <Txt x={356} y={92} size={10.5} anchor="start" color={C.text}>faithfulness — every claim supported (judge)</Txt>
      <Txt x={356} y={114} size={10.5} anchor="start" color={C.text}>refusal precision — NOT_COVERED when it should</Txt>
      <Txt x={356} y={144} size={10} anchor="start" color={C.correct}>fix with: grounding prompt + citation checks (6.6),</Txt>
      <Txt x={356} y={158} size={10} anchor="start" color={C.correct}>passage formatting, a stronger model</Txt>
      <Txt x={356} y={188} size={10} anchor="start">judges are biased — spot-check them (8.3)</Txt>
    </Figure>
  );
}
