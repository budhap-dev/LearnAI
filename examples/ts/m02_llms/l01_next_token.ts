/**
 * Lesson 2.1 - What an LLM is
 *
 * A language model is a function from "the text so far" to "a probability for every possible
 * next token". Generation is a loop: predict, pick, append, repeat. That is the whole thing.
 *
 * This example builds the smallest possible language model - a bigram model that only looks
 * at the previous word - so the loop is visible with nothing hidden. A real LLM replaces the
 * counting table with a neural network that looks at thousands of previous tokens, but the
 * loop is identical.
 *
 * Run:  node m02_llms/l01_next_token.ts
 */

import { section, title } from '../src/learnai/index.ts';

// region: corpus
const CORPUS = `
the model predicts the next token
the model reads the prompt
the prompt is a list of tokens
a token is a fragment of text
the next token is chosen from a distribution
the distribution comes from the model
`;
const END = '<end>'; // a special token that marks where a line stopped
// endregion

type Model = Map<string, Map<string, number>>;

// region: train
/** Count, for every word, which word followed it. That table *is* the model. */
function train(text: string): Model {
  const following: Model = new Map();
  for (const line of text.trim().split('\n')) {
    const words = [...line.split(/\s+/), END];
    for (let i = 0; i + 1 < words.length; i++) {
      const counts = following.get(words[i]) ?? new Map<string, number>();
      counts.set(words[i + 1], (counts.get(words[i + 1]) ?? 0) + 1);
      following.set(words[i], counts);
    }
  }
  return following;
}

/** Turn raw counts into probabilities: this is what a real model outputs at every step. */
function nextTokenDistribution(model: Model, current: string): Map<string, number> {
  const counts = model.get(current) ?? new Map<string, number>();
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const dist = new Map<string, number>();
  for (const tok of [...counts.keys()].sort()) dist.set(tok, counts.get(tok)! / total);
  return dist;
}
// endregion

// region: generate
/**
 * The autoregressive loop: predict a distribution, pick the most likely token, append, and
 * feed the longer text back in. Stops at <end> or when the budget runs out.
 *
 * Picking the single most likely token is called *greedy decoding*. Lesson 2.7 replaces
 * this line with sampling, which is where temperature and randomness come from.
 */
function generate(model: Model, prompt: string, maxTokens = 12): string[] {
  const tokens = prompt.split(/\s+/);
  for (let i = 0; i < maxTokens; i++) {
    const dist = nextTokenDistribution(model, tokens[tokens.length - 1]);
    if (dist.size === 0) break;
    // Highest probability; ties -> alphabetically last (matches the Python twin exactly).
    let chosen = '';
    let best = -1;
    for (const [tok, p] of dist) if (p > best || (p === best && tok > chosen)) [chosen, best] = [tok, p];
    if (chosen === END) break;
    tokens.push(chosen);
  }
  return tokens;
}
// endregion

function main(): void {
  const model = train(CORPUS);

  section('distribution');
  title('What the model outputs: a distribution over the next token');
  for (const word of ['the', 'model', 'token']) {
    const dist = nextTokenDistribution(model, word);
    console.log(`after '${word}':`);
    const rows = [...dist].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
    for (const [tok, p] of rows) {
      console.log(`  ${tok.padEnd(14)} ${p.toFixed(3)}  ${'#'.repeat(Math.floor(p * 20 + 0.5))}`);
    }
  }

  section('generate');
  title('Generation is a loop: predict, pick, append, repeat');
  for (const prompt of ['the', 'a token', 'the next']) {
    console.log(`${`'${prompt}'`.padEnd(14)} -> ${generate(model, prompt).join(' ')}`);
  }

  section('no-lookup');
  title('There is no lookup - the model continues text it has never seen');
  console.log(generate(model, 'the prompt predicts').join(' '));
  console.log("'prompt predicts' never appears in the corpus; the model does not notice - it just");
  console.log('continues from the last word it recognises. Fluent, plausible, and not checked.');
}

main();
