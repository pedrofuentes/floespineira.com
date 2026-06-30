# floespineira.com

Static website for **Flo Espiñeira** — non-binary queer pro enduro rider. Migrated from WordPress
to a fast, static [Eleventy](https://www.11ty.dev/) site and deployed on **GitHub Pages**.

## Quickstart

```bash
npm install
npm run serve   # http://localhost:8080
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run build` | Build the static site into `_site/` |
| `npm run serve` | Local dev server with live reload |
| `npm run migrate` | One-time WordPress → Markdown import (already run) |
| `npm run sync:youtube` | Refresh latest YouTube videos snapshot |
| `npm run sync:instagram` | Refresh latest Instagram posts snapshot |
| `npm run sync:feeds` | Refresh both feeds |

## Architecture

- **Content:** Markdown news posts in `src/news/`, page templates in `src/`, site data in
  `src/_data/site.json`. The repo is the source of truth.
- **Look & feel:** faithful reproduction of the former BoldGrid "Crio" theme — self-hosted fonts
  (Yanone Kaffeesatz + Fira Mono), brand green `#0f9e5e`, in `src/assets/css/site.css`.
- **Social feeds:** static snapshots (`src/_data/youtube.json`, `instagram.json`) refreshed weekly
  by a GitHub Action via the official YouTube Data + Instagram Graph APIs.
- **Contact:** Web3Forms (no backend needed).
- **Deploy:** push to `main` → `.github/workflows/deploy.yml` builds and publishes to GitHub Pages.

See [AGENTS.md](./AGENTS.md) for how to add content, refresh feeds, and the remaining setup
(API keys + DNS cutover).
