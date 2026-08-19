import { useState } from 'react';

/**
 * The tool loop, step by step: observe → decide → act → result → decide again, with a step
 * cap. Scripted from the recorded trace in Lesson 5.3 (no model runs here); each step shows
 * the message list the model would receive and a "what would break here" hint.
 */
interface Step {
  title: string;
  who: 'code' | 'model' | 'tool';
  detail: string;
  messagesAdded: string[];
  breaks: string;
}

const SCENARIOS: { name: string; question: string; steps: Step[] }[] = [
  {
    name: 'Happy path',
    question: 'What is the total for order ORD-1042 including shipping?',
    steps: [
      { title: 'Send the question + tool schemas', who: 'code', detail: 'messages = [user]; tools = [get_order, calculate]. The model sees the descriptions and decides whether a tool is needed.', messagesAdded: ['user: What is the total for order ORD-1042 including shipping?'], breaks: 'Vague tool descriptions → the model guesses the total from nothing.' },
      { title: 'Model proposes a call', who: 'model', detail: 'stop_reason = tool_use · tool_calls = [get_order({"order_id": "ORD-1042"})]. No prose yet — a structured request.', messagesAdded: ['assistant: [tool_call get_order {"order_id":"ORD-1042"}]'], breaks: 'Forgetting to append this assistant turn → the model loses the thread next call.' },
      { title: 'Code validates and runs the tool', who: 'tool', detail: 'order_id parsed as a string, looked up with least privilege. Result returned as data: {"status":"shipped","items":[…],"shipping":45}.', messagesAdded: ['tool(get_order): {"status":"shipped","items":[…],"shipping":45}'], breaks: 'Trusting arguments blindly → an injected document can steer the tool (Lesson 4.6).' },
      { title: 'Model proposes the arithmetic', who: 'model', detail: 'Because the description said "use this for any maths", it calls calculate("(12.5 * 40) + (185 * 2) + 45") instead of adding in its head.', messagesAdded: ['assistant: [tool_call calculate {"expression":"(12.5 * 40) + (185 * 2) + 45"}]'], breaks: 'No calculator → the model does arithmetic itself and is sometimes wrong (Lesson 2.8).' },
      { title: 'Code allow-lists and evaluates', who: 'tool', detail: 'Characters allow-listed, no eval of arbitrary code. Result {"result": 915} goes back as a message.', messagesAdded: ['tool(calculate): {"result":915}'], breaks: 'eval() on the raw string → arbitrary code execution from a prompt.' },
      { title: 'Model answers in prose', who: 'model', detail: 'stop_reason = end_turn: "The total for order ORD-1042, including shipping, is $915." The loop ends.', messagesAdded: ['assistant: The total for order ORD-1042, including shipping, is $915.'], breaks: 'No step cap → a confused model could call tools forever; 3 steps used of 5 here.' },
    ],
  },
  {
    name: 'Tool error',
    question: 'What is the status of order ORD-9999?',
    steps: [
      { title: 'Send the question + tool schemas', who: 'code', detail: 'Same contract, different order id.', messagesAdded: ['user: What is the status of order ORD-9999?'], breaks: '' },
      { title: 'Model proposes a call', who: 'model', detail: 'get_order({"order_id": "ORD-9999"}).', messagesAdded: ['assistant: [tool_call get_order {"order_id":"ORD-9999"}]'], breaks: '' },
      { title: 'The lookup fails — as data', who: 'tool', detail: 'Result: {"error": "no order with id \'ORD-9999\'"}. An error message, not an exception; the loop continues.', messagesAdded: ['tool(get_order): {"error":"no order with id \'ORD-9999\'"}'], breaks: 'Raising an exception instead → loop ends, user sees a 500, model never gets to recover.' },
      { title: 'Model explains', who: 'model', detail: 'end_turn: "The order with ID ORD-9999 does not exist. Please check the order ID and try again." No invented order.', messagesAdded: ['assistant: The order with ID "ORD-9999" does not exist…'], breaks: 'Without the error as data the model might invent a plausible status to be helpful (Lesson 2.6).' },
    ],
  },
];

const WHO = { code: { label: 'your code', hue: 200 }, model: { label: 'model', hue: 262 }, tool: { label: 'tool', hue: 30 } };

export default function AgentLoop() {
  const [si, setSi] = useState(0);
  const [step, setStep] = useState(0);
  const sc = SCENARIOS[si];
  const cur = sc.steps[step];
  const messages = sc.steps.slice(0, step + 1).flatMap((s) => s.messagesAdded);
  const cap = 5;

  return (
    <div className="agent-loop">
      <div className="explorer-head">
        <strong>Agent loop</strong>
        <span className="muted">scripted from the recorded trace in 5.3 · observe → decide → act → result · step cap {cap}</span>
      </div>
      <div className="sample-row" role="group" aria-label="Scenarios">
        {SCENARIOS.map((s, i) => (
          <button key={s.name} className={`chip ${i === si ? 'active' : ''}`} onClick={() => { setSi(i); setStep(0); }}>{s.name}</button>
        ))}
      </div>
      <p className="small"><strong>Question:</strong> {sc.question}</p>

      <ol className="loop-steps">
        {sc.steps.map((s, i) => (
          <li key={i} className={`loop-step ${i === step ? 'current' : i < step ? 'done' : ''}`} onClick={() => setStep(i)}>
            <span className="loop-who" style={{ ['--h' as string]: WHO[s.who].hue }}>{WHO[s.who].label}</span>
            <span>{s.title}</span>
          </li>
        ))}
      </ol>

      <div className="loop-detail">
        <p><strong>{cur.title}</strong> — {cur.detail}</p>
        {cur.breaks && <p className="small over">What would break here: {cur.breaks}</p>}
      </div>

      <p className="small"><strong>Messages the model receives next</strong> ({messages.length}; grows every step — Lesson 2.5):</p>
      <pre className="loop-messages"><code>{messages.join('\n')}</code></pre>

      <div className="explorer-controls">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>← Back</button>
        <button onClick={() => setStep(Math.min(sc.steps.length - 1, step + 1))} disabled={step === sc.steps.length - 1}>Step →</button>
        <span className="muted">model calls used: {sc.steps.slice(0, step + 1).filter((s) => s.who === 'model').length} of cap {cap}</span>
      </div>
    </div>
  );
}
