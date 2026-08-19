import { useState } from 'react';

/**
 * RAG vs fine-tuning vs long context vs just prompting - a weighted decision matrix. Answer
 * six questions about your situation; the options score themselves. Rules, not a model; the
 * point is to make the trade-offs explicit, not to decide for you.
 */
type Opt = 'prompt' | 'rag' | 'finetune' | 'longctx';
const OPTS: Record<Opt, string> = { prompt: 'Prompting only', rag: 'Retrieval (RAG)', finetune: 'Fine-tuning', longctx: 'Long context (send it all)' };

interface Q { text: string; choices: { label: string; weights: Partial<Record<Opt, number>> }[] }
const QUESTIONS: Q[] = [
  { text: 'What is missing from the model today?', choices: [
    { label: 'Facts it cannot know: private, recent, changing', weights: { rag: 3, longctx: 2, finetune: -2, prompt: -2 } },
    { label: 'A behaviour, format, tone or vocabulary', weights: { finetune: 3, prompt: 2, rag: 0, longctx: 0 } },
    { label: 'Not sure yet', weights: { prompt: 2, rag: 1 } },
  ] },
  { text: 'How often does the knowledge change?', choices: [
    { label: 'Daily or faster', weights: { rag: 3, longctx: 2, finetune: -3 } },
    { label: 'Monthly', weights: { rag: 2, longctx: 1, finetune: -1 } },
    { label: 'Rarely', weights: { finetune: 1, rag: 1, longctx: 1 } },
  ] },
  { text: 'How much material is there?', choices: [
    { label: 'One document or a handful of pages', weights: { longctx: 3, prompt: 2, rag: 0 } },
    { label: 'Thousands of documents', weights: { rag: 3, longctx: -3, finetune: 0 } },
    { label: 'Millions of records', weights: { rag: 3, longctx: -3, finetune: -1 } },
  ] },
  { text: 'Do you have hundreds of good examples of the desired behaviour?', choices: [
    { label: 'Yes, labelled and representative', weights: { finetune: 3, prompt: 1 } },
    { label: 'A few dozen', weights: { prompt: 2, finetune: 0 } },
    { label: 'No', weights: { finetune: -3, prompt: 1, rag: 1 } },
  ] },
  { text: 'How much traffic, and how price-sensitive?', choices: [
    { label: 'High volume, cost matters', weights: { rag: 2, finetune: 1, longctx: -3 } },
    { label: 'Low volume, high value', weights: { longctx: 2, prompt: 1 } },
    { label: 'Medium', weights: { rag: 1 } },
  ] },
  { text: 'Do answers need citations / provenance?', choices: [
    { label: 'Yes — users or auditors must see sources', weights: { rag: 3, longctx: 1, finetune: -3 } },
    { label: 'Nice to have', weights: { rag: 1 } },
    { label: 'No', weights: {} },
  ] },
];

const NOTES: Record<Opt, string> = {
  prompt: 'Always the first thing to try: examples, structure and a good system prompt fix more than people expect (Module 4). Zero infrastructure.',
  rag: 'The default for knowledge: facts stay fresh, answers cite sources, cost scales with what you retrieve, not with the corpus. Needs an index and evaluation (6.7).',
  finetune: 'Changes how the model behaves — format, tone, domain vocabulary — more reliably than it adds facts. A training project with an eval; still hallucinates facts (Module 10).',
  longctx: 'Right for one long document at low volume and high value. Pays per token on every request and loses the middle of very long prompts (2.5).',
};

export default function FinetuneVsRag() {
  const [answers, setAnswers] = useState<number[]>(QUESTIONS.map(() => -1));
  const scores: Record<Opt, number> = { prompt: 0, rag: 0, finetune: 0, longctx: 0 };
  answers.forEach((a, qi) => {
    if (a < 0) return;
    for (const [k, v] of Object.entries(QUESTIONS[qi].choices[a].weights)) scores[k as Opt] += v ?? 0;
  });
  const answered = answers.filter((a) => a >= 0).length;
  const ranked = (Object.keys(OPTS) as Opt[]).sort((a, b) => scores[b] - scores[a]);
  const max = Math.max(1, ...Object.values(scores).map(Math.abs));

  return (
    <div className="ftvr">
      <div className="explorer-head">
        <strong>RAG vs fine-tuning vs long context</strong>
        <span className="muted">a weighted matrix — rules, not a model; it makes the trade-offs explicit, it does not decide for you</span>
      </div>
      <div className="ftvr-grid">
        <div>
          {QUESTIONS.map((q, qi) => (
            <fieldset key={qi} className="ftvr-q">
              <legend>{qi + 1}. {q.text}</legend>
              {q.choices.map((c, ci) => (
                <label key={ci}><input type="radio" name={`q${qi}`} checked={answers[qi] === ci} onChange={() => setAnswers(answers.map((a, i) => (i === qi ? ci : a)))} /> {c.label}</label>
              ))}
            </fieldset>
          ))}
        </div>
        <div className="ftvr-side">
          <p className="small"><strong>Scores</strong> ({answered}/{QUESTIONS.length} answered)</p>
          {ranked.map((o) => (
            <div key={o} className="dist-row">
              <span className="dist-tok" style={{ fontFamily: 'var(--sans)' }}>{OPTS[o]}</span>
              <div className="dist-bar"><span className="dist-kept" style={{ width: `${Math.max(0, scores[o]) / max * 100}%`, background: scores[o] < 0 ? 'var(--wrong)' : undefined }} /></div>
              <span className="dist-n">{scores[o] > 0 ? '+' : ''}{scores[o]}</span>
            </div>
          ))}
          {answered > 0 && <p className="small ftvr-note"><strong>{OPTS[ranked[0]]}.</strong> {NOTES[ranked[0]]}</p>}
          <p className="muted small">Usually the answer is a combination: prompt well, retrieve the facts, fine-tune the behaviour if — and only if — evals show the prompt cannot get there.</p>
        </div>
      </div>
    </div>
  );
}
