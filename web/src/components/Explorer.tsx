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
