# Cassettes — recorded model responses

Each file is one model call, keyed by a hash of the canonical request (model, system,
messages, max_tokens, temperature). The Python and TypeScript adapters compute the same hash,
so either language can record and both replay.

- **Replay** (default, `LEARNAI_LLM_MODE=replay`): examples read from here. No key, no
  network, no SDK needed. Missing cassette ⇒ loud failure with the command to record it.
- **Record** (`LEARNAI_LLM_MODE=record`): calls the real API through the official SDK and
  writes the file. Needs credentials (`ANTHROPIC_API_KEY` or `ant auth login`) and the SDK
  (`pip install -r examples/python/requirements-record.txt` or `npm install` in `examples/ts`).
- Cassettes carry `recorded_at` and the model; the site shows both next to any output that
  replays one, and the build warns when a recording is older than six months.

Cassettes are content, reviewed like code. A re-record shows up as a diff.

A cassette with `"recorded_by": "fixture"` is a hand-written stand-in used only by the adapter
smoke tests (`examples/python/smoke_llm.py`, `examples/ts/smoke_llm.ts`) — it never appears
on the site, because no lesson makes that request.
