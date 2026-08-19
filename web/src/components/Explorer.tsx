import { Suspense, lazy, type ComponentType } from 'react';

/**
 * Interactive explorers - small, client-side, key-free React islands. A note embeds one with:
 *
 *     ```explorer
 *     tokeniser
 *     ```
 *
 * Each is lazy-loaded so a lesson page pays only for the explorers it uses; the tokeniser,
 * for example, pulls in a real BPE vocabulary that has no business in the initial bundle.
 */
export interface ExplorerInfo {
  id: string;
  name: string;
  teaches: string;
  lesson: string;
  load: () => Promise<{ default: ComponentType }>;
}

export const EXPLORERS: ExplorerInfo[] = [
  {
    id: 'tokeniser',
    name: 'Tokeniser',
    teaches: 'How text becomes tokens; why counts, cost and context limits follow from it.',
    lesson: '2.2',
    load: () => import('./explorers/Tokeniser'),
  },
  {
    id: 'sampling',
    name: 'Sampling',
    teaches: 'Temperature, top-k and top-p reshape one next-token distribution - and why the same prompt gives different answers.',
    lesson: '2.7',
    load: () => import('./explorers/Sampling'),
  },
  {
    id: 'embeddings',
    name: 'Embeddings',
    teaches: 'Meaning as position: cosine similarity and nearest neighbours over a small set of phrases.',
    lesson: '2.3',
    load: () => import('./explorers/Embeddings'),
  },
  {
    id: 'attention',
    name: 'Attention',
    teaches: 'Which earlier tokens matter for this one - and how the same word means different things in context.',
    lesson: '2.4',
    load: () => import('./explorers/Attention'),
  },
  {
    id: 'context-budget',
    name: 'Context budget',
    teaches: 'One fixed window shared by the system prompt, history, retrieved documents and the answer - what gets dropped when it overflows.',
    lesson: '2.5',
    load: () => import('./explorers/ContextBudget'),
  },
  {
    id: 'gradient-descent',
    name: 'Gradient descent',
    teaches: 'How every model is trained: two parameters, a loss surface, a learning rate — step, watch it descend, crank it and watch it diverge.',
    lesson: '1.2',
    load: () => import('./explorers/GradientDescent'),
  },
  {
    id: 'confusion-matrix',
    name: 'Confusion matrix',
    teaches: 'One threshold, four outcomes: precision and recall trade against each other, and the cost of each error type picks the threshold.',
    lesson: '3.3',
    load: () => import('./explorers/ConfusionMatrix'),
  },
  {
    id: 'injection-lab',
    name: 'Injection lab',
    teaches: 'Prompt injection: see the payload ride in with the data, toggle each defence, and watch which outcomes become impossible rather than merely unlikely.',
    lesson: '4.6',
    load: () => import('./explorers/InjectionLab'),
  },
  {
    id: 'cost',
    name: 'Cost calculator',
    teaches: 'tokens × price × traffic = the bill — and what caching the stable prefix and batching buy you.',
    lesson: '5.5',
    load: () => import('./explorers/Cost'),
  },
  {
    id: 'agent-loop',
    name: 'Agent loop',
    teaches: 'The tool loop step by step — observe, decide, act, result — with the message list growing and a "what would break here" hint at every step.',
    lesson: '5.3',
    load: () => import('./explorers/AgentLoop'),
  },
  {
    id: 'chunking',
    name: 'Chunking',
    teaches: 'Fixed, sentence, heading and whole-document chunking over one real guide: where the boundaries fall, how many chunks, what overlap costs.',
    lesson: '6.3',
    load: () => import('./explorers/Chunking'),
  },
  {
    id: 'hybrid-search',
    name: 'Hybrid search',
    teaches: 'Keywords (BM25) vs meaning (real cosine scores) vs fused (RRF) over the handbook — where each wins.',
    lesson: '6.4',
    load: () => import('./explorers/HybridSearch'),
  },
  {
    id: 'rag-stepper',
    name: 'RAG stepper',
    teaches: 'The RAG pipeline stage by stage on the real recorded run: retrieve with scores, assemble the prompt, the real answer, the verification.',
    lesson: '6.2',
    load: () => import('./explorers/RagStepper'),
  },
  {
    id: 'finetune-vs-rag',
    name: 'RAG vs fine-tuning',
    teaches: 'Six questions about your situation; prompting, retrieval, fine-tuning and long context score themselves.',
    lesson: '6.1',
    load: () => import('./explorers/FinetuneVsRag'),
  },
];

const byId = Object.fromEntries(EXPLORERS.map((e) => [e.id, e]));

export function Explorer({ id }: { id: string }) {
  const info = byId[id];
  if (!info) return <p className="missing">Unknown explorer “{id}”.</p>;
  const Lazy = lazy(info.load);
  return (
    <section className="explorer" aria-label={`${info.name} explorer`}>
      <Suspense fallback={<p className="muted">Loading the {info.name.toLowerCase()} explorer…</p>}>
        <Lazy />
      </Suspense>
    </section>
  );
}
