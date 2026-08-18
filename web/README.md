# LearnAI — web

The static site. React 19 + TypeScript + Vite, HashRouter, no backend.

```bash
npm install
npm run dev       # runs both example harnesses, builds content, starts Vite
npm run build     # same, then tsc + vite build -> dist/
npm run preview
```

`npm run capture` runs `examples/python` and `examples/ts` and writes their traced code
regions and captured output to `public/data/captures/`. `npm run content` validates every
`docs/module-N/*.md` frontmatter, checks each ```code / ```output / ```diagram / ```explorer
fence resolves, checks Python and TypeScript output agree, and writes `public/data/*.json` and
`src/content/lessons/*.md`. Both are gitignored - regenerated on every build.

Requires Node 24+ (runs the TypeScript examples directly) and Python 3.12+.
