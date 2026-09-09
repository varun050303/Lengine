# Lengine UI

Astro-based **second-brain** viewer for Lengine topic packs (knowledge reference, not the investigation learner loop).

## Purpose

- Browse approved topic content (currently CSRF-focused homepage)
- Visual diagrams, mindmap pillars, claims/sources, crosslinks
- Loads canonical JSON from `../content/` at build/dev time

The **investigation** product (specimen → hypotheses → experiments → evidence → reveal) lives under `investigation/` + `cli/investigate.js`, not this UI.

## Run

From repo root:

```bash
npm run ui          # dev server (astro in ui/)
npm run ui:build    # production build
```

Or from `ui/`:

```bash
npm install
npm run dev         # http://localhost:4321
npm run build
npm run preview
```

Requires Node `>=22.12.0` (see `ui/package.json`).

## Content path

`src/utils/csrf-knowledge.ts` resolves content as:

1. `process.cwd()/content` (if present)
2. else `process.cwd()/../content` (when cwd is `ui/`)

Run the dev server from `ui/` (or use root scripts that prefix correctly).

## Structure

```
ui/
├── src/pages/index.astro          # Main shell (mindmap / diagrams / knowledge views)
├── src/components/VisualDiagramsViewer.astro
├── src/utils/
│   ├── csrf-knowledge.ts          # Loads topic pack from content/
│   ├── csrf-mindmap.ts
│   ├── data.ts                    # Manifest / graph helpers
│   ├── visual-diagrams.ts
│   └── mermaid-definitions.ts
└── src/styles/global.css
```

## Known constraints

- Homepage is hard-wired to the CSRF pack for now
- Canonical topic names and mechanism labels are shown (reference UI, not pre-reveal investigation)
- Keep files small when editing via API; prefer one-file commits
