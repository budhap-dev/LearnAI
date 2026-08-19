"""
Lesson 6.3 - Chunking

Documents are embedded in pieces, and the size and shape of the pieces decide what
retrieval can find. Too big and one vector averages many ideas, so the specific fact stops
standing out; too small and a chunk loses the context that makes it meaningful. This example
chunks the same handbook four ways, embeds every variant, and measures which one actually
retrieves the right article for the golden questions - and how much text each sends along
with it. No opinions - numbers.

Run:  python3 m06_rag/l03_chunking.py
"""

from __future__ import annotations

import re

from learnai import section, title
from learnai.llm import embed
from learnai.rag import load_handbook, top_k

# region: fixed
def chunk_fixed(text: str, size: int = 60, overlap: int = 15) -> list[str]:
    """Fixed-size windows of `size` words with `overlap` words shared between neighbours.
    Dumb, predictable, and often good enough. Overlap stops a fact being split in half."""
    words = text.split()
    chunks: list[str] = []
    start = 0
    while start < len(words):
        chunks.append(" ".join(words[start:start + size]))
        if start + size >= len(words):
            break
        start += size - overlap
    return chunks
# endregion


# region: sentence
def chunk_sentences(text: str, max_words: int = 60) -> list[str]:
    """Split on sentence boundaries, then pack sentences into chunks up to `max_words`.
    Chunks end where thoughts end, so a fact is rarely cut mid-sentence."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    chunks: list[str] = []
    current: list[str] = []
    for s in sentences:
        if current and len(" ".join(current + [s]).split()) > max_words:
            chunks.append(" ".join(current))
            current = []
        current.append(s)
    if current:
        chunks.append(" ".join(current))
    return chunks
# endregion


# region: sections
def chunk_sections(text: str) -> list[str]:
    """Split on headings. Real documents have structure - use it. Here each merged guide
    is several articles separated by '## ' headings; each becomes one chunk."""
    parts = [p.strip() for p in re.split(r"\n(?=## )", text) if p.strip()]
    return parts
# endregion


def chunk_whole(text: str) -> list[str]:
    """One chunk per document: maximum context, minimum precision - the baseline."""
    return [text]


STRATEGIES = {
    "whole document": chunk_whole,
    "sections (headings)": chunk_sections,
    "fixed 60/15 words": chunk_fixed,
    "sentences <=60 words": chunk_sentences,
}


# region: corpus
def merged_guides(docs: list[dict]) -> list[dict]:
    """Real handbooks are not twelve tidy articles; they are a few long pages that each cover
    several topics. Merge the articles into three guides with headings, and remember which
    article each heading came from so hits can be scored."""
    groups = {
        "Billing guide": ["refunds", "billing-cycle", "seats", "plans"],
        "Security and access guide": ["sso", "security-incident", "password-reset", "api-limits"],
        "Data and support guide": ["retention", "export", "support", "onboarding"],
    }
    by_id = {d["id"]: d for d in docs}
    guides = []
    for title_, ids in groups.items():
        body = "\n".join(f"## {by_id[i]['title']}\n{by_id[i]['text']}" for i in ids)
        guides.append({"title": title_, "text": body, "articles": ids})
    return guides


def article_of(chunk: str, guide: dict, by_id: dict) -> set[str]:
    """Which article(s) a chunk overlaps - by checking which article texts share a distinctive
    sentence with it. Used only to score hits."""
    found = set()
    for aid in guide["articles"]:
        if any(sent[:40] in chunk for sent in by_id[aid]["text"].split(". ")):
            found.add(aid)
    return found
# endregion


# region: measure
def evaluate(strategy, guides: list[dict], golden: list[dict], by_id: dict, k: int = 3) -> dict:
    """Chunk every guide, embed all chunks, then for each answerable golden question check
    whether a top-k chunk overlaps a relevant article (hit@k), whether the top-1 does
    (hit@1), and how many words the top-k chunks would put in the prompt."""
    chunks: list[tuple[set[str], str]] = []
    for g in guides:
        for c in strategy(g["text"]):
            chunks.append((article_of(c, g, by_id), f"{g['title']}\n{c}"))
    vectors = embed([text for _, text in chunks]).vectors
    answerable = [q for q in golden if q["relevant"]]
    qvecs = embed([q["question"] for q in answerable]).vectors
    hit1 = hit3 = 0
    words = 0
    for q, qv in zip(answerable, qvecs):
        top = top_k(qv, vectors, k)
        relevant = set(q["relevant"])
        hit1 += bool(chunks[top[0][0]][0] & relevant)
        hit3 += any(chunks[i][0] & relevant for i, _ in top)
        words += sum(len(chunks[i][1].split()) for i, _ in top)
    n = len(answerable)
    return {"chunks": len(chunks), "hit1": hit1 / n, "hit3": hit3 / n, "words": words // n}
# endregion


def main() -> None:
    hb = load_handbook()
    docs, golden = hb["docs"], hb["golden"]
    by_id = {d["id"]: d for d in docs}
    guides = merged_guides(docs)

    section("shapes")
    title("One guide, four ways")
    sample = guides[0]
    print(f"{sample['title']}: {len(sample['text'].split())} words, {len(sample['articles'])} topics")
    for name, fn in STRATEGIES.items():
        pieces = fn(sample["text"])
        sizes = [len(p.split()) for p in pieces]
        print(f"  {name:22} -> {len(pieces):>2} chunk(s), {min(sizes):>3}-{max(sizes):<3} words each")

    section("measure")
    title("Retrieval quality and context cost per strategy (9 answerable golden questions)")
    print(f"  {'strategy':22} {'chunks':>6} {'hit@1':>6} {'hit@3':>6} {'words sent':>11}")
    for name, fn in STRATEGIES.items():
        r = evaluate(fn, guides, golden, by_id)
        print(f"  {name:22} {r['chunks']:>6} {r['hit1']:>6.0%} {r['hit3']:>6.0%} {r['words']:>11}")
    print("read the last two columns together: the question is not only 'did we find it' but")
    print("'how much unrelated text came with it' - that is tokens, latency, and distraction")

    section("rules")
    title("What the numbers tell you to do")
    print("1. chunk at natural boundaries (headings, sentences) and keep a little overlap")
    print("2. prepend the document title / section path to every chunk so it carries its context")
    print("3. size by the question shape: fact lookups like small chunks, 'explain X' likes larger")
    print("4. parent-child: retrieve small, return the enclosing section to the model (6.5)")
    print("5. measure hit@k AND words sent on a golden set before and after every chunking change (6.7)")


if __name__ == "__main__":
    main()
