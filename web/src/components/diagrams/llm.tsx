/**
 * Diagrams for Module 2 - How LLMs actually work.
 */
import { Arrow, Box, C, Defs, Figure, Txt } from './primitives';

/** text -> tokens -> ids -> model -> next-token probabilities -> token -> text */
export function TokenPipeline() {
  const id = 'token-pipeline';
  const y = 62;
  const stages: { label: string; sub: string; w: number }[] = [
    { label: 'text', sub: '"the token"', w: 96 },
    { label: 'tokeniser', sub: 'BPE merges', w: 96 },
    { label: 'token ids', sub: '[1820, 6602]', w: 104 },
    { label: 'model', sub: 'transformer', w: 96 },
    { label: 'next-token', sub: 'probabilities', w: 104 },
    { label: 'text', sub: '"…iser"', w: 96 },
  ];
  const gap = 26;
  let x = 10;
  const placed = stages.map((s) => {
    const p = { ...s, x };
    x += s.w + gap;
    return p;
  });
  const width = x - gap + 10;

  return (
    <Figure
      title="From text to tokens to model and back"
      caption="Everything the model does happens between the two tokeniser steps. It never sees characters — only integer ids."
      viewBox={`0 0 ${width} 150`}
      maxWidth={720}
    >
      <Defs id={id} />
      {placed.map((s, i) => (
        <g key={i}>
          <Box
            x={s.x} y={y} w={s.w} h={46} label={s.label} sub={s.sub}
            fill={i === 3 ? C.soft : C.surface}
            stroke={i === 1 || i === 4 ? C.accent : C.border}
            bold={i === 3}
          />
          {i < placed.length - 1 && (
            <Arrow id={id} x1={s.x + s.w + 2} y1={y + 23} x2={s.x + s.w + gap - 3} y2={y + 23} />
          )}
        </g>
      ))}
      <Txt x={placed[1].x + placed[1].w / 2} y={y - 18} size={11} color={C.accent}>encode</Txt>
      <Txt x={placed[4].x + placed[4].w / 2} y={y - 18} size={11} color={C.accent}>sample → decode</Txt>
      {/* the bracket under the model region */}
      <line x1={placed[2].x} y1={y + 62} x2={placed[4].x + placed[4].w} y2={y + 62} stroke={C.muted} strokeWidth={1.2} />
      <line x1={placed[2].x} y1={y + 56} x2={placed[2].x} y2={y + 62} stroke={C.muted} strokeWidth={1.2} />
      <line x1={placed[4].x + placed[4].w} y1={y + 56} x2={placed[4].x + placed[4].w} y2={y + 62} stroke={C.muted} strokeWidth={1.2} />
      <Txt x={(placed[2].x + placed[4].x + placed[4].w) / 2} y={y + 76} size={11.5}>
        the model only ever works with integers — cost, context limits and "can't count letters" all live here
      </Txt>
    </Figure>
  );
}
