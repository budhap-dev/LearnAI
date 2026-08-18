/**
 * Content build step. docs/ is the single source of truth; everything here is generated
 * on every build and gitignored, so the site can never drift from the notes or the code.
 *
 *   docs/module-N/<id>.md            lesson notes with typed frontmatter (validated here)
 *   docs/modules.json                module metadata
 *   public/data/captures/{python,ts}/<id>.json   regions + outputs captured by the harnesses
 *
 * Produces:
 *   src/content/lessons/<id>.md      the notes, copied (bundled per lesson by Vite)
 *   public/data/lessons/<id>.json    per-lesson code regions and captured outputs, both languages
 *   public/data/syllabus.json        every lesson's frontmatter + module metadata
 *   public/data/search-index.json    plaintext per lesson for full-text search
 *
 * Any error names the file. A broken lesson breaks the build, not the student.
 * Run automatically by `npm run build`; requires `npm run capture` to have run first.
 */
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

const here = (p) => new URL(p, import.meta.url).pathname;
const DOCS = here('../../docs/');
const CAPTURES = here('../public/data/captures/');
const OUT_NOTES = here('../src/content/lessons/');
const OUT_LESSONS = here('../public/data/lessons/');
const OUT_SYLLABUS = here('../public/data/syllabus.json');
const OUT_SEARCH = here('../public/data/search-index.json');

const LEVELS = ['basic', 'intermediate', 'advanced'];
const AUDIENCES = ['orientation', 'builder', 'architect'];
const LANGUAGES = ['python', 'ts'];

const Frontmatter = z.object({
  id: z.string().regex(/^\d+\.\d+$/, 'id must look like "2.2"'),
  module: z.number().int().positive(),
  title: z.string().min(1),
  level: z.enum(LEVELS),
  summary: z.string().min(1),
  objectives: z.array(z.string().min(1)).min(1),
  prerequisites: z.array(z.string()).default([]),
  estimatedMinutes: z.number().int().positive(),
  audiences: z.array(z.enum(AUDIENCES)).min(1),
  pathwayOrder: z.record(z.enum(AUDIENCES), z.union([z.number().int(), z.literal('skip')])),
  languages: z.array(z.enum(LANGUAGES)).default([]),
  explorers: z.array(z.string()).default([]),
  diagrams: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

const errors = [];
const fail = (file, message) => errors.push(`${file}: ${message}`);

/** Split a Markdown file into { frontmatter, body }. */
function splitFrontmatter(raw) {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
  if (!match) return null;
  return { frontmatter: parseYaml(match[1]), body: raw.slice(match[0].length) };
}

/** Every ```lang fence body, by fence language. */
function fences(body) {
  const found = { code: [], output: [], diagram: [], explorer: [] };
  for (const m of body.matchAll(/```(code|output|diagram|explorer)\n([\s\S]*?)```/g)) {
    found[m[1]].push(m[2].trim());
  }
  return found;
}

/** Reduce Markdown to searchable plaintext. */
function toPlainText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function readCapture(language, id) {
  const path = join(CAPTURES, language, `${id}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(await readFile(path, 'utf8'));
}

// ---- modules -------------------------------------------------------------------------

const modules = JSON.parse(await readFile(join(DOCS, 'modules.json'), 'utf8'));
const moduleIds = new Set(modules.map((m) => m.id));

// ---- lessons -------------------------------------------------------------------------

await rm(OUT_NOTES, { recursive: true, force: true });
await rm(OUT_LESSONS, { recursive: true, force: true });
await mkdir(OUT_NOTES, { recursive: true });
await mkdir(OUT_LESSONS, { recursive: true });

const lessons = [];
const searchIndex = [];

for (const dir of await readdir(DOCS, { withFileTypes: true })) {
  if (!dir.isDirectory() || !/^module-\d+$/.test(dir.name)) continue;

  for (const file of await readdir(join(DOCS, dir.name))) {
    if (!file.endsWith('.md')) continue;
    const rel = `docs/${dir.name}/${file}`;
    const raw = await readFile(join(DOCS, dir.name, file), 'utf8');

    const split = splitFrontmatter(raw);
    if (!split) {
      fail(rel, 'missing frontmatter block');
      continue;
    }

    const parsed = Frontmatter.safeParse(split.frontmatter);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) fail(rel, `${issue.path.join('.')}: ${issue.message}`);
      continue;
    }
    const fm = parsed.data;

    if (fm.id !== basename(file, '.md')) fail(rel, `id "${fm.id}" does not match the file name`);
    if (!moduleIds.has(fm.module)) fail(rel, `module ${fm.module} is not in docs/modules.json`);
    if (dir.name !== `module-${fm.module}`) fail(rel, `module ${fm.module} but file is in ${dir.name}`);

    // Merge the captured code and output for every language the lesson claims to have.
    const code = {};   // region -> { python?: string, ts?: string }
    const output = {}; // marker -> { python?: string, ts?: string }
    const files = {};
    for (const language of fm.languages) {
      const capture = await readCapture(language, fm.id);
      if (!capture) {
        fail(rel, `languages lists "${language}" but no capture exists - is there an example file for ${fm.id}?`);
        continue;
      }
      files[language] = capture.file;
      for (const [region, text] of Object.entries(capture.regions)) (code[region] ??= {})[language] = text;
      for (const [marker, text] of Object.entries(capture.outputs)) (output[marker] ??= {})[language] = text;
    }

    // Every fence must resolve, in every language the lesson has.
    const used = fences(split.body);
    for (const region of used.code) {
      for (const language of fm.languages) {
        if (!code[region]?.[language]) fail(rel, `\`\`\`code ${region} - no "# region: ${region}" in the ${language} example`);
      }
    }
    for (const marker of used.output) {
      for (const language of fm.languages) {
        if (output[marker]?.[language] === undefined) fail(rel, `\`\`\`output ${marker} - no section("${marker}") in the ${language} example`);
      }
    }
    for (const name of used.diagram) {
      if (!fm.diagrams.includes(name)) fail(rel, `\`\`\`diagram ${name} is used but not declared in frontmatter diagrams`);
    }
    for (const name of used.explorer) {
      if (!fm.explorers.includes(name)) fail(rel, `\`\`\`explorer ${name} is used but not declared in frontmatter explorers`);
    }
    // Both languages should show the same output - the examples are twins by design.
    for (const [marker, byLang] of Object.entries(output)) {
      if (byLang.python !== undefined && byLang.ts !== undefined && byLang.python !== byLang.ts) {
        fail(rel, `output "${marker}" differs between Python and TypeScript - the examples must agree`);
      }
    }

    lessons.push(fm);
    await writeFile(join(OUT_NOTES, `${fm.id}.md`), split.body);
    await writeFile(join(OUT_LESSONS, `${fm.id}.json`), JSON.stringify({ id: fm.id, files, code, output }));
    searchIndex.push({
      id: fm.id,
      title: fm.title,
      module: fm.module,
      level: fm.level,
      summary: fm.summary,
      objectives: fm.objectives,
      tags: fm.tags,
      text: toPlainText(split.body).slice(0, 4000),
    });
  }
}

// Cross-lesson checks.
const ids = new Set(lessons.map((l) => l.id));
for (const l of lessons) {
  for (const p of l.prerequisites) {
    if (!ids.has(p)) console.warn(`  warning: ${l.id} lists prerequisite ${p}, which is not written yet`);
  }
}

if (errors.length) {
  console.error('Content build failed:\n' + errors.map((e) => '  ' + e).join('\n'));
  process.exit(1);
}

const byId = (a, b) => a.id.localeCompare(b.id, undefined, { numeric: true });
lessons.sort(byId);
searchIndex.sort(byId);
await writeFile(OUT_SYLLABUS, JSON.stringify({ modules, lessons }));
await writeFile(OUT_SEARCH, JSON.stringify(searchIndex));

console.log(`Content: ${lessons.length} lesson(s) validated -> src/content/lessons/, public/data/lessons/`);
console.log(`Syllabus: ${modules.length} modules -> public/data/syllabus.json`);
console.log(`Search: ${searchIndex.length} lessons -> public/data/search-index.json`);
