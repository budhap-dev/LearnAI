/**
 * Lesson 5.2 - Streaming
 *
 * A model writes one token at a time, so a 300-token answer takes seconds. Streaming sends
 * the pieces as they are produced instead of the whole thing at the end - the difference
 * between a spinner and a page that starts reading back to you after a fraction of a second.
 *
 * This example shows what a stream actually looks like (the chunk boundaries are real - the
 * cassette stores them), how to accumulate it, how to handle JSON that arrives in pieces, and
 * how to stop early. Timings are not printed because replay has none; Lesson 9.3 measures them.
 *
 * Run:  node m05_apis/l02_streaming.ts
 */

import { section, title } from '../src/learnai/index.ts';
import { stream } from '../src/learnai/llm.ts';

// region: consume
/**
 * Iterate the stream, keep every chunk. In a UI you would append each chunk to the page as
 * it arrives; here we collect them so the boundaries can be shown.
 */
async function readStream(prompt: string, maxTokens = 120): Promise<[string[], string]> {
  const s = stream(prompt, { maxTokens });
  const chunks: string[] = [];
  for await (const chunk of s) chunks.push(chunk);
  return [chunks, chunks.join('')];
}
// endregion

// region: partial-json
/**
 * Structured output also streams - as a growing prefix of a JSON document. You cannot
 * JSON.parse a prefix, so either: (a) wait for the end, (b) try to parse after every chunk
 * and use the first success, or (c) use a streaming/partial JSON parser. This is (b), the
 * cheapest approach that is still correct: parse attempts fail until the document closes,
 * then succeed.
 */
function extractJsonProgressively(chunks: string[]): [number, string][] {
  const events: [number, string][] = [];
  let buffer = '';
  for (let i = 1; i <= chunks.length; i++) {
    buffer += chunks[i - 1];
    try {
      JSON.parse(buffer);
      events.push([i, 'complete JSON - parse succeeds']);
      break;
    } catch {
      if (i === 1 || i === 3 || i === chunks.length) events.push([i, 'incomplete - parse fails, keep buffering']);
    }
  }
  return events;
}
// endregion

// region: cancel
/**
 * Stop consuming after a budget. Breaking out of the loop is the cancellation signal: a real
 * client closes the connection and the model stops generating, so you stop paying for tokens
 * nobody will read. (The cassette still holds the full recording, so replay cannot show the
 * saving - the accounting below is from the recording.)
 */
async function streamWithBudget(prompt: string, maxChunks: number): Promise<[string, boolean]> {
  const s = stream(prompt, { maxTokens: 200 });
  let text = '';
  let stoppedEarly = false;
  let i = 0;
  for await (const chunk of s) {
    text += chunk;
    if (++i >= maxChunks) {
      stoppedEarly = true;
      break;
    }
  }
  return [text, stoppedEarly];
}
// endregion

const pyRepr = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;

async function main(): Promise<void> {
  section('chunks');
  title('What a stream looks like: the chunk boundaries are real');
  const [chunks, text] = await readStream('Explain in two sentences why streaming improves perceived latency for a chat UI.');
  console.log(`${chunks.length} chunks, ${text.length} characters`);
  console.log('first chunks:', chunks.slice(0, 8).map(pyRepr).join(' | '));
  console.log('text:', text.trim());

  section('partial-json');
  title('JSON arrives in pieces; parse attempts fail until it closes');
  const [jchunks, jtext] = await readStream(
    'Reply with only a JSON object with keys "city" and "country" for the capital of Portugal. No prose.',
    60,
  );
  console.log(`${jchunks.length} chunks -> ${jtext.trim()}`);
  for (const [i, what] of extractJsonProgressively(jchunks)) {
    console.log(`  after chunk ${String(i).padStart(2)}: ${what}`);
  }
  console.log('for live UIs use a partial-JSON parser or render fields as they become parseable');

  section('cancel');
  title('Stopping early: break the loop, close the connection, stop paying');
  const [partial, stopped] = await streamWithBudget('List ten practical tips for writing clear commit messages, one per line.', 12);
  console.log(`consumed 12 chunks then stopped: ${stopped ? 'True' : 'False'}`);
  console.log('received so far:', partial.trim().replace(/\n/g, ' / ').slice(0, 160), '...');

  section('takeaway');
  title('What streaming changes');
  console.log('UX: time-to-first-token replaces time-to-last-token as the number users feel');
  console.log('Code: accumulate; parse JSON only when complete (or with a partial parser); handle a mid-stream error');
  console.log('Cost: cancel = close the connection; you stop paying for what nobody reads');
  console.log('Ops: stream through your gateway too, or the gateway becomes the spinner (Lesson 9.2)');
}

await main();
