/**
 * Runs every lesson example and captures two things per lesson:
 *
 *   regions  - named extracts of the source, delimited by `// region: name` / `// endregion`
 *   outputs  - stdout, split into the sections the example declared with `section("name")`
 *
 * Usage (Node 24+, no build step):
 *   node harness.ts list
 *   node harness.ts run 2.2
 *   node harness.ts capture ../../web/public/data/captures/ts
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MARKER } from './src/learnai/index.ts';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const REPO = join(ROOT, '..', '..');
const FILE_RE = /^m(\d+)_[a-z0-9_]+\/l(\d+)_[a-z0-9_]+\.ts$/;

function discover(): Map<string, string> {
  const lessons = new Map<string, string>();
  for (const dir of readdirSync(ROOT, { withFileTypes: true })) {
    if (!dir.isDirectory() || !/^m\d+_/.test(dir.name)) continue;
    for (const file of readdirSync(join(ROOT, dir.name)).sort()) {
      const rel = `${dir.name}/${file}`;
      const match = FILE_RE.exec(rel);
      if (!match) continue;
      lessons.set(`${Number(match[1])}.${Number(match[2])}`, join(ROOT, rel));
    }
  }
  return lessons;
}

function extractRegions(source: string): Record<string, string> {
  const regions: Record<string, string> = {};
  let current: string | null = null;
  let buffer: string[] = [];
  for (const line of source.split('\n')) {
    const stripped = line.trim();
    if (stripped.startsWith('// region:')) {
      current = stripped.slice('// region:'.length).trim();
      buffer = [];
    } else if (stripped === '// endregion' && current) {
      regions[current] = dedent(buffer.join('\n'));
      current = null;
    } else if (current !== null) {
      buffer.push(line);
    }
  }
  return regions;
}

function dedent(text: string): string {
  const lines = text.split('\n');
  const indents = lines.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length);
  const indent = indents.length ? Math.min(...indents) : 0;
  return lines
    .map((l) => (l.trim() ? l.slice(indent) : ''))
    .join('\n')
    .replace(/^\n+|\n+$/g, '');
}

function splitSections(stdout: string): Record<string, string> {
  const sections: Record<string, string> = {};
  let current = '_';
  let buffer: string[] = [];
  const flush = () => {
    const text = buffer.join('\n').replace(/^\n+|\n+$/g, '');
    if (current !== '_' || text) sections[current] = text;
  };
  for (const line of stdout.split('\n')) {
    if (line.startsWith(MARKER)) {
      flush();
      current = line.slice(MARKER.length).trim();
      buffer = [];
    } else {
      buffer.push(line);
    }
  }
  flush();
  return sections;
}

interface Recorded {
  model: string;
  recorded_at: string;
}

/** Run one example in its own process; return its stdout and the cassette recordings it used. */
function run(path: string): { stdout: string; recorded: Recorded[] } {
  const dir = mkdtempSync(join(tmpdir(), 'learnai-'));
  const log = join(dir, 'cassettes.jsonl');
  writeFileSync(log, '');
  try {
    const stdout = execFileSync(process.execPath, [path], {
      encoding: 'utf8',
      cwd: ROOT,
      stdio: 'pipe',
      env: { ...process.env, LEARNAI_CASSETTE_LOG: log },
    });
    const used = readFileSync(log, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Recorded);
    const unique = new Map(used.map((u) => [`${u.model}|${u.recorded_at}`, u]));
    const recorded = [...unique.values()].sort((a, b) => `${a.model}|${a.recorded_at}`.localeCompare(`${b.model}|${b.recorded_at}`));
    return { stdout, recorded };
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr ?? '';
    console.error(`example failed: ${relative(ROOT, path)}\n${stderr}`);
    process.exit(1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function capture(outDir: string): void {
  mkdirSync(outDir, { recursive: true });
  const lessons = discover();
  for (const [lessonId, path] of lessons) {
    const source = readFileSync(path, 'utf8');
    const { stdout, recorded } = run(path);
    const payload = {
      lesson: lessonId,
      language: 'ts',
      file: relative(REPO, path).split('\\').join('/'),
      regions: extractRegions(source),
      outputs: splitSections(stdout),
      // Which model + date the recorded responses came from, if the example called one.
      recorded,
    };
    writeFileSync(join(outDir, `${lessonId}.json`), JSON.stringify(payload, null, 2));
    console.log(
      `captured ${lessonId}: ${Object.keys(payload.regions).length} regions, ${Object.keys(payload.outputs).length} outputs`,
    );
  }
  console.log(`${lessons.size} lesson(s) -> ${outDir}`);
}

const [command = 'list', arg] = process.argv.slice(2);
const lessons = discover();
if (command === 'list') {
  for (const [id, path] of lessons) console.log(`${id.padEnd(6)} ${relative(ROOT, path)}`);
} else if (command === 'run') {
  const path = arg && lessons.get(arg);
  if (!path) {
    console.error(`no example for lesson ${arg}`);
    process.exit(1);
  }
  process.stdout.write(run(path).stdout);
} else if (command === 'capture') {
  capture(arg ?? 'captures');
} else {
  console.error('usage: node harness.ts list | run <id> | capture <dir>');
  process.exit(1);
}
