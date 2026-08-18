/** Adapter smoke test: replays a fixture cassette. Run: node smoke_llm.ts */
import { complete } from './src/learnai/llm.ts';

const c = await complete('Reply with exactly: adapter smoke test ok', {
  system: 'You are a test double. Reply with the exact text requested and nothing else.',
  maxTokens: 32,
});
console.log(`text='${c.text}' model=${c.model} tokens=${c.inputTokens}+${c.outputTokens} replayed=${c.replayed} recorded=${c.recordedAt}`);
