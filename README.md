# democracytable.com

The Periodic Table of Democratic Engagement: 118 ways to take part in self-government, arranged like the elements.

## Pages
- `index.html` — the table (families across, depth down, AI-impact overlay, initiatives overlay, and “What’s needed”: pick 2–5 elements to see which initiatives combine them, plus an optional AI sketch of a service that would)
- `sources.html` — intellectual history and reading list (`/sources`)
- `analyze.html` — describe an initiative, see which elements it meets (`/analyze`)
- `elements.json` — the single source of truth for element data, loaded by the table, `/analyze`, and the API
- `api/analyze.js` — Vercel serverless function that calls the Claude API (modes: `match` and `suggest` for `/analyze`, `combine` for What’s needed)

## Deploy
Hosted on Vercel. Pushes to `main` deploy to production automatically once the repo is linked.

Required environment variable (Vercel → Settings → Environment Variables):
- `ANTHROPIC_API_KEY` — needed for `/analyze`
- `ANTHROPIC_MODEL` — optional, defaults to `claude-sonnet-5-5`
- `ANTHROPIC_WORKSPACE_ID` — only needed if the API key is not scoped to a workspace

`vercel.json` enables clean URLs (`/sources` instead of `/sources.html`).

## Editing elements
Edit `elements.json` only. The table (`index.html`), `/analyze`, and `api/analyze.js` all read it. Each element has `z` (number), `s` (symbol), `n` (name), `d` (description), `t` (tools), `r`/`c` (row and column in the grid), and `f` (family key, one of the keys in `FAM` in `index.html`). AI-impact ratings stay in the `AI` map in `index.html`.

Run `node scripts/check-elements.js` to validate `elements.json` (118 elements, unique numbers and positions, valid families, required fields). The same check runs in GitHub Actions on every push to `main` and every pull request.

To preview locally, serve the folder over HTTP (for example `python3 -m http.server`); opening `index.html` straight from disk will not load the JSON.
