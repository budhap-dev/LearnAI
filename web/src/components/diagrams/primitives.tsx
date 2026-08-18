/**
 * Shared building blocks for lesson diagrams.
 *
 * Every colour is a CSS custom property, so diagrams follow all six themes
 * automatically - the same tokens the rest of the page uses.
 */
import type { ReactNode } from 'react';

export const C = {
  text: 'var(--text)',
  muted: 'var(--muted)',
  accent: 'var(--accent)',
  soft: 'var(--accent-soft)',
  border: 'var(--border)',
  surface: 'var(--surface)',
  bg: 'var(--bg)',
  correct: 'var(--correct)',
  correctSoft: 'var(--correct-soft)',
  wrong: 'var(--wrong)',
  wrongSoft: 'var(--wrong-soft)',
};

const FONT = 'var(--sans)';
const MONO = 'var(--mono)';

export function Box({
  x, y, w, h, label, sub, fill = C.surface, stroke = C.border, mono = false, bold = false,
}: {
  x: number; y: number; w: number; h: number;
  label: string; sub?: string;
  fill?: string; stroke?: string; mono?: boolean; bold?: boolean;
}) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={fill} stroke={stroke} strokeWidth={1.4} />
      <text
        x={cx} y={sub ? cy - 7 : cy} dominantBaseline="central" textAnchor="middle"
        fontFamily={mono ? MONO : FONT} fontSize={13} fontWeight={bold ? 700 : 500} fill={C.text}
      >
        {label}
      </text>
      {sub && (
        <text x={cx} y={cy + 10} dominantBaseline="central" textAnchor="middle"
          fontFamily={MONO} fontSize={10.5} fill={C.muted}>
          {sub}
        </text>
      )}
    </g>
  );
}

export function Txt({
  x, y, children, size = 12, color = C.muted, anchor = 'middle', mono = false, bold = false,
}: {
  x: number; y: number; children: ReactNode; size?: number; color?: string;
  anchor?: 'start' | 'middle' | 'end'; mono?: boolean; bold?: boolean;
}) {
  return (
    <text x={x} y={y} dominantBaseline="central" textAnchor={anchor}
      fontFamily={mono ? MONO : FONT} fontSize={size} fill={color} fontWeight={bold ? 700 : 400}>
      {children}
    </text>
  );
}

/** A straight arrow. `head` picks the marker; define markers once per diagram with <Defs>. */
export function Arrow({
  x1, y1, x2, y2, id, dashed = false, color = C.muted, width = 1.6,
  head = 'arrow',
}: {
  x1: number; y1: number; x2: number; y2: number; id: string;
  dashed?: boolean; color?: string; width?: number; head?: 'arrow' | 'triangle' | 'none';
}) {
  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={color} strokeWidth={width}
      strokeDasharray={dashed ? '5 4' : undefined}
      markerEnd={head === 'none' ? undefined : `url(#${id}-${head})`}
    />
  );
}

/** Arrowhead definitions, namespaced per diagram so several SVGs coexist on one page. */
export function Defs({ id }: { id: string }) {
  return (
    <defs>
      {/* filled arrowhead: dependency / flow */}
      <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="9" refY="5"
        markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 1 L 9 5 L 0 9 z" fill={C.muted} />
      </marker>
      {/* hollow triangle: UML inheritance */}
      <marker id={`${id}-triangle`} viewBox="0 0 12 12" refX="11" refY="6"
        markerWidth="11" markerHeight="11" orient="auto-start-reverse">
        <path d="M 1 1.5 L 11 6 L 1 10.5 z" fill={C.surface} stroke={C.muted} strokeWidth="1.3" />
      </marker>
    </defs>
  );
}

/** The outer wrapper: responsive, labelled for screen readers, captioned. */
export function Figure({
  title, caption, viewBox, children, maxWidth = 640,
}: {
  title: string; caption: string; viewBox: string; children: ReactNode; maxWidth?: number;
}) {
  return (
    <figure className="diagram">
      <svg viewBox={viewBox} role="img" aria-label={title} style={{ maxWidth }}>
        {children}
      </svg>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
