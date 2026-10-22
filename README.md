# democracytable.com

The Periodic Table of Democratic Engagement: 118 ways to take part in self-government, arranged like the elements.

## Pages
- `index.html` — the table (families across, depth down, AI-impact overlay)
- `sources.html` — intellectual history and reading list (`/sources`)
- `analyze.html` — describe an initiative, see which elements it meets (`/analyze`)
- `elements.json` — the single source of truth for element data used by `/analyze` and the API
- `api/analyze.js` — Vercel serverless function that calls the Claude API

## Deploy
Hosted on Vercel. Pushes to `main` deploy to production automatically once the repo is linked.

Required environment variable (Vercel → Settings → Environment Variables):
- `ANTHROPIC_API_KEY` — needed for `/analyze`
- `ANTHROPIC_MODEL` — optional, defaults to `claude-sonnet-5-5`
- `ANTHROPIC_WORKSPACE_ID` — only needed if the API key is not scoped to a workspace

`vercel.json` enables clean URLs (`/sources` instead of `/sources.html`).

## Editing elements
`index.html` has its own copy of the element list in the `E` array; `elements.json` is the copy used by `/analyze`. If you change one, change the other (or regenerate `elements.json` from `index.html`).

Run `node scripts/check-elements.js` to validate `elements.json` (118 elements, unique numbers and positions, valid families, required fields) and confirm it matches the `E` array in `index.html`. The same check runs in GitHub Actions on every push to `main` and every pull request.
