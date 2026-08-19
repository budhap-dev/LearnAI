"""
Lesson 5.2 - Streaming

A model writes one token at a time, so a 300-token answer takes seconds. Streaming sends
the pieces as they are produced instead of the whole thing at the end - the difference
between a spinner and a page that starts reading back to you after a fraction of a second.

This example shows what a stream actually looks like (the chunk boundaries are real - the
cassette stores them), how to accumulate it, how to handle JSON that arrives in pieces, and
how to stop early. Timings are not printed because replay has none; Lesson 9.3 measures them.

Run:  python3 m05_apis/l02_streaming.py
"""

from __future__ import annotations

import json

from learnai import section, title
from learnai.llm import stream

# region: consume
def read_stream(prompt: str, max_tokens: int = 120) -> tuple[list[str], str]:
    """Iterate the stream, keep every chunk. In a UI you would append each chunk to the
    page as it arrives; here we collect them so the boundaries can be shown."""
    s = stream(prompt, max_tokens=max_tokens)
    chunks = [chunk for chunk in s]
    return chunks, "".join(chunks)
# endregion


# region: partial-json
def extract_json_progressively(chunks: list[str]) -> list[tuple[int, str]]:
    """Structured output also streams - as a growing prefix of a JSON document. You cannot
    json.loads a prefix, so either: (a) wait for the end, (b) try to parse after every chunk
    and use the first success, or (c) use a streaming/partial JSON parser. This is (b),
    the cheapest approach that is still correct: parse attempts fail until the document
    closes, then succeed."""
    events: list[tuple[int, str]] = []
    buffer = ""
    for i, chunk in enumerate(chunks, 1):
        buffer += chunk
        try:
            json.loads(buffer)
            events.append((i, "complete JSON - parse succeeds"))
            break
        except json.JSONDecodeError:
            if i in (1, 3) or i == len(chunks):
                events.append((i, "incomplete - parse fails, keep buffering"))
    return events
# endregion


# region: cancel
def stream_with_budget(prompt: str, max_chunks: int) -> tuple[str, bool]:
    """Stop consuming after a budget. Breaking out of the loop is the cancellation signal:
    a real client closes the connection and the model stops generating, so you stop
    paying for tokens nobody will read. (The cassette still holds the full recording, so
    replay cannot show the saving - the accounting below is from the recording.)"""
    s = stream(prompt, max_tokens=200)
    text = ""
    stopped_early = False
    for i, chunk in enumerate(s, 1):
        text += chunk
        if i >= max_chunks:
            stopped_early = True
            break
    return text, stopped_early
# endregion


def main() -> None:
    section("chunks")
    title("What a stream looks like: the chunk boundaries are real")
    chunks, text = read_stream("Explain in two sentences why streaming improves perceived latency for a chat UI.")
    print(f"{len(chunks)} chunks, {len(text)} characters")
    print("first chunks:", " | ".join(repr(c) for c in chunks[:8]))
    print("text:", text.strip())

    section("partial-json")
    title("JSON arrives in pieces; parse attempts fail until it closes")
    jchunks, jtext = read_stream(
        'Reply with only a JSON object with keys "city" and "country" for the capital of Portugal. No prose.',
        max_tokens=60,
    )
    print(f"{len(jchunks)} chunks -> {jtext.strip()}")
    for i, what in extract_json_progressively(jchunks):
        print(f"  after chunk {i:>2}: {what}")
    print("for live UIs use a partial-JSON parser or render fields as they become parseable")

    section("cancel")
    title("Stopping early: break the loop, close the connection, stop paying")
    partial, stopped = stream_with_budget("List ten practical tips for writing clear commit messages, one per line.", max_chunks=12)
    print(f"consumed 12 chunks then stopped: {stopped}")
    print("received so far:", partial.strip().replace("\n", " / ")[:160], "...")

    section("takeaway")
    title("What streaming changes")
    print("UX: time-to-first-token replaces time-to-last-token as the number users feel")
    print("Code: accumulate; parse JSON only when complete (or with a partial parser); handle a mid-stream error")
    print("Cost: cancel = close the connection; you stop paying for what nobody reads")
    print("Ops: stream through your gateway too, or the gateway becomes the spinner (Lesson 9.2)")


if __name__ == "__main__":
    main()
