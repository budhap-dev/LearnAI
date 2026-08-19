"""
Runs every lesson example and captures two things per lesson:

  regions  - named extracts of the source, delimited by `# region: name` / `# endregion`
  outputs  - stdout, split into the sections the example declared with `section("name")`

Usage:
  python3 -m harness list
  python3 -m harness run 2.2                       # run one lesson, print its output
  python3 -m harness capture ../../web/public/data/captures/python
  python3 -m harness cassettes                     # which lesson uses each recording; orphans
  python3 -m harness prune                         # delete recordings nothing uses
"""

from __future__ import annotations

import io
import json
import os
import re
import runpy
import sys
import tempfile
from contextlib import redirect_stdout
from pathlib import Path

from learnai import MARKER

ROOT = Path(__file__).parent
FILE_RE = re.compile(r"^m(\d+)_[a-z0-9_]+/l(\d+)_[a-z0-9_]+\.py$")


def discover() -> dict[str, Path]:
    """Map lesson id ("2.2") -> example file, from the mNN_topic/lNN_name.py convention."""
    lessons: dict[str, Path] = {}
    for path in sorted(ROOT.glob("m*_*/l*_*.py")):
        match = FILE_RE.match(path.relative_to(ROOT).as_posix())
        if not match:
            continue
        lesson_id = f"{int(match.group(1))}.{int(match.group(2))}"
        lessons[lesson_id] = path
    return lessons


def extract_regions(source: str) -> dict[str, str]:
    regions: dict[str, str] = {}
    current: str | None = None
    buffer: list[str] = []
    for line in source.splitlines():
        stripped = line.strip()
        if stripped.startswith("# region:"):
            current = stripped.removeprefix("# region:").strip()
            buffer = []
        elif stripped == "# endregion" and current:
            regions[current] = dedent("\n".join(buffer))
            current = None
        elif current is not None:
            buffer.append(line)
    return regions


def dedent(text: str) -> str:
    lines = [l for l in text.splitlines() if l.strip()]
    if not lines:
        return text
    indent = min(len(l) - len(l.lstrip()) for l in lines)
    return "\n".join(l[indent:] if l.strip() else "" for l in text.splitlines()).strip("\n")


def split_sections(stdout: str) -> dict[str, str]:
    sections: dict[str, str] = {}
    current = "_"
    buffer: list[str] = []
    for line in stdout.splitlines():
        if line.startswith(MARKER):
            sections[current] = "\n".join(buffer).strip("\n")
            current = line.removeprefix(MARKER).strip()
            buffer = []
        else:
            buffer.append(line)
    sections[current] = "\n".join(buffer).strip("\n")
    sections.pop("_", None) if not sections.get("_") else None
    return sections


def run(path: Path) -> tuple[str, list[dict]]:
    """Run one example; return its stdout and the list of cassette recordings it used."""
    out = io.StringIO()
    with tempfile.NamedTemporaryFile("w+", suffix=".jsonl", delete=False) as log:
        os.environ["LEARNAI_CASSETTE_LOG"] = log.name
        try:
            with redirect_stdout(out):
                runpy.run_path(str(path), run_name="__main__")
        finally:
            os.environ.pop("LEARNAI_CASSETTE_LOG", None)
        log.seek(0)
        used = [json.loads(line) for line in log if line.strip()]
    os.unlink(log.name)
    return out.getvalue(), used


def capture(out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    lessons = discover()
    for lesson_id, path in lessons.items():
        source = path.read_text(encoding="utf-8")
        stdout, used = run(path)
        payload = {
            "lesson": lesson_id,
            "language": "python",
            "file": path.relative_to(ROOT.parent.parent).as_posix(),
            "regions": extract_regions(source),
            "outputs": split_sections(stdout),
            # Which model + date the recorded responses came from, if the example called one.
            "recorded": [{"model": m, "recorded_at": d} for m, d in sorted({(u["model"], u["recorded_at"]) for u in used})],
        }
        (out_dir / f"{lesson_id}.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(f"captured {lesson_id}: {len(payload['regions'])} regions, {len(payload['outputs'])} outputs")
    print(f"{len(lessons)} lesson(s) -> {out_dir}")


def cassettes(prune: bool = False) -> int:
    """Audit examples/shared/cassettes: which lesson uses each recording, and which recordings
    nothing uses any more (safe to delete). `prune` deletes the orphans."""
    from learnai.llm import CASSETTES  # noqa: PLC0415

    used_by: dict[str, set[str]] = {}
    targets = {**discover(), "smoke": ROOT / "smoke_llm.py"}  # the adapter smoke test has a fixture too
    for lesson_id, path in targets.items():
        try:
            _, used = run(path)
        except Exception as e:  # noqa: BLE001 - an unrecorded lesson is reported, not fatal
            print(f"{lesson_id:6} could not run: {str(e).splitlines()[0][:80]}")
            continue
        for u in used:
            used_by.setdefault(u["key"], set()).add(lesson_id)
    on_disk = sorted(p.stem for p in CASSETTES.glob("*.json"))
    orphans = [k for k in on_disk if k not in used_by]
    for key in on_disk:
        meta = json.loads((CASSETTES / f"{key}.json").read_text(encoding="utf-8"))
        who = ", ".join(sorted(used_by.get(key, ()))) or "UNUSED"
        print(f"{key}  {meta['response']['model']:12} {meta['recorded_at']}  {who}")
    print(f"{len(on_disk)} cassettes, {len(used_by)} in use, {len(orphans)} unused")
    if prune:
        for key in orphans:
            (CASSETTES / f"{key}.json").unlink()
        print(f"deleted {len(orphans)} unused cassette(s)")
    return 0


def main(argv: list[str]) -> int:
    command = argv[1] if len(argv) > 1 else "list"
    lessons = discover()
    if command == "list":
        for lesson_id, path in lessons.items():
            print(f"{lesson_id:6} {path.relative_to(ROOT)}")
        return 0
    if command == "run":
        lesson_id = argv[2]
        if lesson_id not in lessons:
            print(f"no example for lesson {lesson_id}", file=sys.stderr)
            return 1
        sys.stdout.write(run(lessons[lesson_id])[0])
        return 0
    if command == "capture":
        capture(Path(argv[2] if len(argv) > 2 else "captures"))
        return 0
    if command in ("cassettes", "prune"):
        return cassettes(prune=command == "prune")
    print(__doc__)
    return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
