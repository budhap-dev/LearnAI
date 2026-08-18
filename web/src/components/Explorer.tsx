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
