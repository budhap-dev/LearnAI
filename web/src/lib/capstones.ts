/**
 * The capstones: end-to-end guide pages that assemble the modules into whole systems. Generated
 * into src/content/capstones/ from docs/capstones/ by the content build. Small metadata is
 * bundled; each guide's Markdown body is lazy per route.
 */
import capstonesRaw from '../content/capstones/capstones.json';

export interface Capstone {
  id: string;
  title: string;
  summary: string;
  modules: number[];
  diagram?: string;
}

export const CAPSTONES: Capstone[] = capstonesRaw as Capstone[];

const bodies = import.meta.glob('../content/capstones/*.md', { query: '?raw', import: 'default' });

export async function loadCapstone(id: string): Promise<string | null> {
  const load = bodies[`../content/capstones/${id}.md`];
  return load ? ((await load()) as string) : null;
}
