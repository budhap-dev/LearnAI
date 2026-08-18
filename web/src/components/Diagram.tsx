import type { ComponentType } from 'react';
import { TokenPipeline } from './diagrams/llm';

/**
 * Every diagram the notes can reference, by name. A note embeds one with a fence:
 *
 *     ```diagram
 *     token-pipeline
 *     ```
 *
 * On GitHub the fence degrades to a code block naming the diagram; on the site it renders
 * as themed, inline SVG. The build step checks each fence names a diagram declared in the
 * lesson's frontmatter; this registry is where the names resolve to components.
 */
const REGISTRY: Record<string, ComponentType> = {
  'token-pipeline': TokenPipeline,
};

export function Diagram({ name }: { name: string }) {
  const Found = REGISTRY[name];
  if (!Found) return <p className="missing">Unknown diagram “{name}”.</p>;
  return <Found />;
}
