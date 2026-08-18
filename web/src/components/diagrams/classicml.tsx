/**
 * Diagrams for Module 3 - Classic ML for engineers.
 */
import { Arrow, Box, C, Defs, Figure, Txt } from './primitives';

/** Rules vs classic ML vs LLM - the decision flow. */
export function ClassicVsLlm() {
  const id = 'classic-vs-llm';
  const q = (x: number, y: number, w: number, text: string, sub?: string) => (
    <Box x={x} y={y} w={w} h={44} label={text} sub={sub} fill={C.surface} stroke={C.border} />
  );
  return (
    <Figure
      title="Rules, classic ML, or an LLM?"
      caption="Three questions settle most cases. Written rules when the logic is known; a classic model when you have labelled tabular data and need speed, cost and explainability; an LLM when the input is free-form language and the task needs judgement over meaning."
      viewBox="0 0 690 260"
      maxWidth={720}
    >
      <Defs id={id} />
      {q(20, 20, 200, 'Can you write the rule?', 'few exceptions, known logic')}
      <Arrow id={id} x1={120} y1={66} x2={120} y2={92} />
      <Txt x={132} y={80} size={10} anchor="start" color={C.correct}>yes → </Txt>
      <Box x={20} y={94} w={200} h={40} label="rules / plain code" sub="fastest, cheapest, testable" fill={C.soft} stroke={C.correct} bold />
      <Arrow id={id} x1={222} y1={42} x2={258} y2={42} />
      <Txt x={240} y={30} size={10} color={C.muted}>no</Txt>
      {q(260, 20, 200, 'Tabular data + labels?', 'rows, columns, an outcome')}
      <Arrow id={id} x1={360} y1={66} x2={360} y2={92} />
      <Txt x={372} y={80} size={10} anchor="start" color={C.correct}>yes → </Txt>
      <Box x={260} y={94} w={200} h={40} label="classic ML" sub="regression · trees · boosting" fill={C.soft} stroke={C.accent} bold />
      <Arrow id={id} x1={462} y1={42} x2={498} y2={42} />
      <Txt x={480} y={30} size={10} color={C.muted}>no</Txt>
      {q(500, 20, 175, 'Free-form language?', 'meaning, not columns')}
      <Arrow id={id} x1={587} y1={66} x2={587} y2={92} />
      <Txt x={599} y={80} size={10} anchor="start" color={C.correct}>yes → </Txt>
      <Box x={500} y={94} w={175} h={40} label="LLM" sub="judgement over meaning" fill={C.soft} stroke={C.wrong} bold />
      <Txt x={120} y={160} size={10.5}>ms · ~free · exact · explainable</Txt>
      <Txt x={360} y={160} size={10.5}>ms · cheap · measurable · explainable-ish</Txt>
      <Txt x={587} y={160} size={10.5}>seconds · metered · verify output</Txt>
      <Txt x={345} y={200} size={11} color={C.accent} bold>often the answer is two of these: an LLM to extract structure, then a classic model or rules on it</Txt>
      <Txt x={345} y={224} size={10.5}>and: embeddings + nearest neighbour is a fourth option that needs no generation at all (Lesson 2.3)</Txt>
    </Figure>
  );
}

/** Logistic curve + a decision boundary over two features. */
export function DecisionBoundary() {
  const id = 'decision-boundary';
  const pos = [[520, 60], [560, 80], [480, 75], [590, 90], [540, 110], [500, 105], [450, 70]];
  const neg = [[300, 190], [340, 215], [290, 170], [390, 205], [330, 150], [410, 215], [350, 120]];
  return (
    <Figure
      title="A classifier is a boundary, and a score is distance from it"
      caption="Left: logistic regression squashes a weighted sum into a probability. Right: in feature space that is a straight boundary; trees draw axis-aligned steps; boosting stacks many small steps into a flexible one. Every point gets a score - the threshold decides where the line is drawn."
      viewBox="0 0 640 260"
      maxWidth={680}
    >
      <Defs id={id} />
      {/* logistic curve */}
      <Txt x={110} y={22} size={12} bold color={C.text}>the squash</Txt>
      <line x1={20} y1={220} x2={200} y2={220} stroke={C.border} />
      <line x1={110} y1={40} x2={110} y2={220} stroke={C.border} strokeDasharray="3 3" />
      <path d={`M 20 218 ${Array.from({ length: 37 }, (_, i) => { const x = 20 + i * 5; const z = (x - 110) / 18; const y = 218 - 176 / (1 + Math.exp(-z)); return `L ${x} ${y}`; }).join(' ')}`} fill="none" stroke={C.accent} strokeWidth={2} />
      <Txt x={110} y={236} size={10}>weighted sum of features →</Txt>
      <Txt x={14} y={44} size={9.5} anchor="start">p = 1</Txt>
      <Txt x={14} y={216} size={9.5} anchor="start">p = 0</Txt>
      <Txt x={120} y={130} size={9.5} anchor="start" color={C.accent}>0.5 at the boundary</Txt>
      {/* feature space */}
      <Txt x={410} y={22} size={12} bold color={C.text}>the boundary in feature space</Txt>
      <rect x={250} y={40} width={370} height={190} rx={8} fill={C.bg} stroke={C.border} />
      {pos.map(([x, y], i) => <circle key={`p${i}`} cx={x} cy={y} r={5.5} fill={C.wrong} />)}
      {neg.map(([x, y], i) => <circle key={`n${i}`} cx={x} cy={y} r={5.5} fill={C.correct} />)}
      <line x1={280} y1={60} x2={610} y2={220} stroke={C.accent} strokeWidth={2} />
      <path d="M 262 100 L 380 100 L 380 150 L 480 150 L 480 200 L 610 200" fill="none" stroke={C.muted} strokeWidth={1.4} strokeDasharray="5 3" />
      <line x1={262} y1={244} x2={286} y2={244} stroke={C.accent} strokeWidth={2} />
      <Txt x={292} y={244} size={10} anchor="start" color={C.accent}>logistic: one straight cut</Txt>
      <line x1={440} y1={244} x2={464} y2={244} stroke={C.muted} strokeWidth={1.4} strokeDasharray="5 3" />
      <Txt x={470} y={244} size={10} anchor="start" color={C.muted}>tree: axis-aligned steps</Txt>
    </Figure>
  );
}

/** Confusion matrix with a threshold slider drawn as a static picture. */
export function ConfusionMatrixDiagram() {
  return (
    <Figure
      title="Four outcomes, and every metric is arithmetic on them"
      caption="Precision: of what we flagged, how much was real. Recall: of the real, how much we caught. Moving the threshold trades one for the other; the right point depends on what a false alarm and a miss each cost."
      viewBox="0 0 620 230"
      maxWidth={660}
    >
      <Txt x={215} y={26} size={11} bold color={C.text}>predicted +</Txt>
      <Txt x={335} y={26} size={11} bold color={C.text}>predicted −</Txt>
      <Txt x={80} y={78} size={11} bold color={C.text} anchor="end">actual +</Txt>
      <Txt x={80} y={158} size={11} bold color={C.text} anchor="end">actual −</Txt>
      <rect x={155} y={40} width={120} height={70} rx={8} fill={C.correctSoft} stroke={C.correct} />
      <Txt x={215} y={68} size={13} bold color={C.correct}>TP</Txt>
      <Txt x={215} y={88} size={9.5}>caught it</Txt>
      <rect x={275} y={40} width={120} height={70} rx={8} fill={C.wrongSoft} stroke={C.wrong} />
      <Txt x={335} y={68} size={13} bold color={C.wrong}>FN</Txt>
      <Txt x={335} y={88} size={9.5}>a miss</Txt>
      <rect x={155} y={120} width={120} height={70} rx={8} fill={C.wrongSoft} stroke={C.wrong} />
      <Txt x={215} y={148} size={13} bold color={C.wrong}>FP</Txt>
      <Txt x={215} y={168} size={9.5}>a false alarm</Txt>
      <rect x={275} y={120} width={120} height={70} rx={8} fill={C.correctSoft} stroke={C.correct} />
      <Txt x={335} y={148} size={13} bold color={C.correct}>TN</Txt>
      <Txt x={335} y={168} size={9.5}>correctly ignored</Txt>
      <Txt x={510} y={60} size={11} anchor="middle" color={C.text} bold>precision = TP / (TP + FP)</Txt>
      <Txt x={510} y={78} size={10}>"of what we flagged…"</Txt>
      <Txt x={510} y={118} size={11} anchor="middle" color={C.text} bold>recall = TP / (TP + FN)</Txt>
      <Txt x={510} y={136} size={10}>"of the real ones…"</Txt>
      <Txt x={510} y={176} size={11} anchor="middle" color={C.text} bold>accuracy = (TP + TN) / all</Txt>
      <Txt x={510} y={194} size={10} color={C.wrong}>misleading when positives are rare</Txt>
      <Txt x={310} y={218} size={10.5} color={C.accent}>threshold ↑ → fewer FP, more FN · threshold ↓ → more FP, fewer FN</Txt>
    </Figure>
  );
}

/** k-means iterations, three frames. */
export function KMeansSteps() {
  const pts = [[30, 40], [45, 55], [25, 60], [50, 35], [110, 120], [125, 135], [105, 140], [130, 115], [60, 130], [40, 145], [55, 150]];
  const frames = [
    { title: '1. start', centres: [[30, 40], [110, 120], [60, 130]], assign: false },
    { title: '2. assign to nearest', centres: [[30, 40], [110, 120], [60, 130]], assign: true },
    { title: '3. move to means, repeat', centres: [[37, 47], [117, 127], [52, 142]], assign: true },
  ];
  const cols = [C.accent, C.wrong, C.correct];
  const nearest = (p: number[], cs: number[][]) => cs.reduce((bi, c, i) => ((p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 < (p[0] - cs[bi][0]) ** 2 + (p[1] - cs[bi][1]) ** 2 ? i : bi), 0);
  return (
    <Figure
      title="k-means: assign, move, repeat"
      caption="Pick k centres, assign every point to its nearest, move each centre to the mean of its points, repeat until nothing changes. Fast and simple; k is your choice, and the answer depends on how features are scaled."
      viewBox="0 0 620 210"
      maxWidth={660}
    >
      {frames.map((f, fi) => {
        const ox = 15 + fi * 200;
        return (
          <g key={f.title}>
            <rect x={ox} y={30} width={180} height={165} rx={8} fill={C.bg} stroke={C.border} />
            <Txt x={ox + 90} y={20} size={11} bold color={C.text}>{f.title}</Txt>
            {pts.map((p, i) => (
              <circle key={i} cx={ox + p[0] + 15} cy={p[1] + 30} r={4.5} fill={f.assign ? cols[nearest(p, f.centres)] : C.muted} opacity={0.85} />
            ))}
            {f.centres.map((c, i) => (
              <g key={i}>
                <line x1={ox + c[0] + 10} y1={c[1] + 25} x2={ox + c[0] + 20} y2={c[1] + 35} stroke={cols[i]} strokeWidth={2.5} />
                <line x1={ox + c[0] + 20} y1={c[1] + 25} x2={ox + c[0] + 10} y2={c[1] + 35} stroke={cols[i]} strokeWidth={2.5} />
              </g>
            ))}
          </g>
        );
      })}
    </Figure>
  );
}

/** train -> register -> serve -> monitor loop */
export function MlLifecycle() {
  const id = 'ml-lifecycle';
  return (
    <Figure
      title="From notebook to production, and round again"
      caption="Training produces a versioned artefact; a registry keeps it; serving loads it and logs every prediction with the version; monitoring watches inputs and outcomes for drift and feeds the next training run. It is a release loop, not a one-off."
      viewBox="0 0 715 210"
      maxWidth={720}
    >
      <Defs id={id} />
      <Box x={10} y={70} w={150} h={48} label="train + evaluate" sub="pipeline · held-out set" />
      <Arrow id={id} x1={162} y1={94} x2={182} y2={94} />
      <Box x={184} y={70} w={170} h={48} label="register" sub="artefact · version · metrics" fill={C.soft} stroke={C.accent} />
      <Arrow id={id} x1={356} y1={94} x2={376} y2={94} />
      <Box x={378} y={70} w={170} h={48} label="serve" sub="load once · log each call" />
      <Arrow id={id} x1={550} y1={94} x2={570} y2={94} />
      <Box x={572} y={70} w={130} h={48} label="monitor" sub="drift · outcomes" stroke={C.wrong} />
      <path d="M 637 120 L 637 160 L 85 160 L 85 122" fill="none" stroke={C.accent} strokeWidth={1.6} markerEnd={`url(#${id}-arrow)`} />
      <Txt x={360} y={174} size={10.5} color={C.accent}>drift or new labels → retrain, re-evaluate, redeploy · roll back = serve the previous version</Txt>
      <Txt x={85} y={40} size={10.5}>same feature code here…</Txt>
      <Txt x={463} y={40} size={10.5}>…and here — one function, both places</Txt>
      <Txt x={360} y={200} size={10}>this is ordinary release engineering with one new kind of artefact</Txt>
    </Figure>
  );
}

/** A small feed-forward network. */
export function NeuralNet() {
  const id = 'neural-net';
  const layers = [3, 4, 4, 1];
  const xs = [60, 220, 380, 540];
  const ys = (n: number) => Array.from({ length: n }, (_, i) => 40 + (i + 0.5) * (170 / n));
  return (
    <Figure
      title="A neural network: layers of weighted sums and squashes"
      caption="Each node takes a weighted sum of the previous layer and applies a simple non-linearity. Stack enough layers and the network can represent almost any function; train it with the same gradient loop as Lesson 1.2, automated across millions of weights. A transformer is this idea with attention added (Lesson 2.4)."
      viewBox="0 0 600 240"
      maxWidth={640}
    >
      <Defs id={id} />
      {layers.slice(0, -1).map((n, li) =>
        ys(n).map((y1, i) =>
          ys(layers[li + 1]).map((y2, j) => (
            <line key={`${li}-${i}-${j}`} x1={xs[li]} y1={y1} x2={xs[li + 1]} y2={y2} stroke={C.border} strokeWidth={1} />
          )),
        ),
      )}
      {layers.map((n, li) =>
        ys(n).map((y, i) => (
          <circle key={`${li}-${i}`} cx={xs[li]} cy={y} r={11} fill={li === 0 ? C.surface : li === layers.length - 1 ? C.soft : C.surface} stroke={li === layers.length - 1 ? C.accent : C.muted} strokeWidth={1.4} />
        )),
      )}
      <Txt x={60} y={225} size={10.5}>inputs (features)</Txt>
      <Txt x={300} y={225} size={10.5}>hidden layers: weighted sum → non-linearity</Txt>
      <Txt x={540} y={225} size={10.5}>output (score)</Txt>
      <Txt x={300} y={22} size={11} color={C.accent}>every line is a weight learned by gradient descent</Txt>
    </Figure>
  );
}
