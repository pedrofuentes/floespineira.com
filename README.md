# floespineira.com

Static website for **Flo Espiñeira** — non-binary queer pro enduro rider.

Migrated from WordPress to a fast, static [Eleventy](https://www.11ty.dev/) site and deployed on
**GitHub Pages**. **This repo is the source of truth** — content is edited here (Markdown + data
files), committed, and auto-deployed. An assistant/agent can keep it up to date; see
[AGENTS.md](./AGENTS.md).

## Contents

- [Local development & preview](#local-development--preview)
- [Project structure](#project-structure)
- [Editing content](#editing-content)
- [Social feeds (YouTube + Instagram)](#social-feeds-youtube--instagram)
- [Secrets & security](#secrets--security)
- [Contact form](#contact-form)
- [Deployment](#deployment)
- [Go live: DNS cutover](#go-live-dns-cutover-retires-wordpress)
- [Setup checklist](#setup-checklist)
- [Tech & conventions](#tech--conventions)
- [Scripts](#scripts)

## Local development & preview

Requires **Node 20+** (see `.nvmrc`).

```bash
npm install
npm run serve      # live preview at http://localhost:8080 (auto-reloads on save)
```

Other builds:

```bash
npm run build      # one-off production build into _site/
```

The preview is the full, styled site. Stop the server with `Ctrl-C` (or `pkill -f eleventy`).

## Project structure

| What | Where |
|------|-------|
| News posts | `src/news/<slug>.md` (Markdown + frontmatter) |
| Homepage | `src/index.njk` |
| Contact page | `src/contact.njk` |
| News index | `src/news.njk` |
| Site-wide data (bio, tagline, nav, socials, colors, brand copy) | `src/_data/site.json` |
| Feed snapshots (auto-managed) | `src/_data/youtube.json`, `src/_data/instagram.json` |
| Original WordPress page HTML (reference only) | `src/_data/pages/*.json` |
| Layout & partials | `src/_includes/` (`base.njk`, `partials/`, `post.njk`) |
| Styles | `src/assets/css/site.css` |
| Fonts (self-hosted) | `src/assets/fonts/` |
| Images | `src/assets/images/` |
| Build config | `eleventy.config.js` |
| CI workflows | `.github/workflows/` |
| Output (gitignored) | `_site/` |

## Editing content

**Add a news post** — create `src/news/<slug>.md` (lowercase, hyphenated slug):

```markdown
---
layout: post.njk
title: "Flo wins the season opener"
date: 2026-03-14
slug: flo-wins-season-opener
permalink: /flo-wins-season-opener/
hero: "/assets/images/season-opener.jpg"
excerpt: "A one-sentence summary shown on the News page."
---

Post body in **Markdown**. Put images in `src/assets/images/` and reference
them as `/assets/images/<file>`.
```

Then `npm run build` to check, commit, and push `main`.

**Update the bio, tagline, nav, or socials** — edit `src/_data/site.json` (e.g. `tagline`,
`home.heroHeadline`, `socials`, `nav`), then rebuild, commit, push.

**Publishing = push to `main`.** The deploy workflow builds and publishes automatically.

## Social feeds (YouTube + Instagram)

The homepage "Latest Videos" and "Latest Photos" sections render as **static snapshots** from
`src/_data/youtube.json` and `src/_data/instagram.json` (no client-side JS, no third-party feed
widgets). A section is **hidden automatically while its data is empty**, and appears once populated.

- **Automatic:** `.github/workflows/refresh-feeds.yml` runs every Monday, pulls the latest posts via
  the official YouTube Data + Instagram Graph APIs, commits the refreshed snapshot, and redeploys.
- **On demand:** `gh workflow run refresh-feeds.yml`.
- **Locally:** copy `.env.example` to `.env`, fill in the keys, then `npm run sync:feeds`.

> The "Latest Videos" section is currently seeded with recent uploads (fetched via public YouTube
> oEmbed). "Latest Photos" stays hidden until an Instagram token is configured (see below).

## Secrets & security

Three kinds of credentials, three homes — **never commit a real secret**:

| Credential | Secret? | Where it lives |
|-----------|---------|----------------|
| **Web3Forms access key** | No — public by design (ships in the HTML form) | `src/_data/site.json` (`web3formsKey`), committed |
| **`YOUTUBE_API_KEY`** | Yes | GitHub Actions **secret** (CI) + local `.env` (gitignored) |
| **`IG_ACCESS_TOKEN`** | Yes | GitHub Actions **secret** (CI) + local `.env` (gitignored) |

**CI (the weekly job)** — store as encrypted repository secrets. They're only exposed to the
workflow at run time and never appear in logs or the repo. Set them with the GitHub CLI (the value
is read from a prompt, so it isn't echoed or saved to shell history):

```bash
gh secret set YOUTUBE_API_KEY      # paste the key when prompted
gh secret set IG_ACCESS_TOKEN      # paste the token when prompted
gh secret list                     # verify
```

Or via the web UI: **Settings → Secrets and variables → Actions → New repository secret**.

**Local runs** — `cp .env.example .env` and fill it in. `.env` is gitignored and auto-loaded by the
sync scripts (Node's built-in `--env-file-if-exists`, zero extra dependencies). Never paste secrets
into commits or chat.

**Hardening tips:** restrict the YouTube key in Google Cloud to the *YouTube Data API v3* (and an
IP/referrer if possible). The Instagram token must be a **long-lived** token; the weekly job refreshes
it automatically, but if it fully expires, regenerate and reset the secret.

## Contact form

`/contact/` posts to [Web3Forms](https://web3forms.com) (no backend). Fields: Name, Email, Message.
It uses a small inline `fetch` enhancement with an inline success message, and falls back to a plain
form POST if JavaScript is disabled. Set your free `web3formsKey` in `src/_data/site.json` to receive
messages.

## Deployment

- **Trigger:** every push to `main` runs `.github/workflows/deploy.yml`, which builds with Node 20 and
  publishes `_site/` to GitHub Pages.
- **Action pins:** every workflow `uses:` is pinned to a full 40-char commit SHA with a `# vX.Y.Z`
  comment.
- **Pages config:** source = GitHub Actions; custom domain = `floespineira.com` (via `src/CNAME`).

## Go live: DNS cutover (retires WordPress)

WordPress stays live until you point DNS. When ready:

1. At your DNS provider for `floespineira.com`, set:
   - **A** records (apex): `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - **AAAA** records (apex): `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - **CNAME** for `www` → `pedrofuentes.github.io`
2. In **Settings → Pages**, confirm the custom domain and enable **Enforce HTTPS** (after the cert
   provisions).
3. Verify https://floespineira.com loads and old post URLs resolve, **then** retire WordPress hosting.

Existing post URLs are preserved exactly (including the percent-encoded
`…flo-espin%cc%83eira…` URL), so inbound links and SEO carry over.

## Setup checklist

- [ ] Web3Forms key set in `src/_data/site.json`
- [ ] `YOUTUBE_API_KEY` secret set (`gh secret set …`)
- [ ] `IG_ACCESS_TOKEN` (long-lived) secret set — lights up "Latest Photos"
- [ ] DNS pointed at GitHub Pages + **Enforce HTTPS** enabled
- [ ] Verified live at floespineira.com, then WordPress retired

## Tech & conventions

- **Eleventy v3** + Nunjucks templates + Markdown content; **Node 20+**; ESM (`"type": "module"`).
- **SEO:** per-page `<title>`/description/OpenGraph + GA4 in `base.njk`; generated `sitemap.xml`,
  `robots.txt`, and RSS at `/feed/feed.xml` (legacy `/feed/` redirects to it); custom `404`.
- **Look & feel:** faithful reproduction of the former BoldGrid "Crio" theme — self-hosted
  *Yanone Kaffeesatz* + *Fira Mono*, brand green `#0f9e5e`.
- **Git:** commits authored as `pedrofuentes <git@pedrofuent.es>`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run serve` | Local dev server with live reload (http://localhost:8080) |
| `npm run build` | Build the static site into `_site/` |
| `npm run sync:youtube` | Refresh the YouTube videos snapshot (uses `.env` locally) |
| `npm run sync:instagram` | Refresh the Instagram posts snapshot (uses `.env` locally) |
| `npm run sync:feeds` | Refresh both feeds |
| `npm run migrate` | One-time WordPress → Markdown import (already run) |

---

See [AGENTS.md](./AGENTS.md) for the agent-oriented operating guide.
