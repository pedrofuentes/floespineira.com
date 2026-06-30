# AGENTS.md — operating guide for floespineira.com

Static site for **Flo Espiñeira** (pro enduro rider), built with **Eleventy (11ty)** and
deployed to **GitHub Pages**. This repo is the **source of truth** — the old WordPress site is
being retired. An agent (you) keeps the site up to date by editing content here, committing, and
pushing.

## Conventions

- **Git identity:** name `pedrofuentes`, email `git@pedrofuent.es`.
- **Every commit** ends with: `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`
- **GitHub Actions** `uses:` are pinned to a full 40-char commit SHA with a trailing `# vX.Y.Z`.
- **Node 20+** (`.nvmrc` = 20). ESM project (`"type": "module"`).
- **Deploy = push to `main`.** The `deploy.yml` workflow builds and publishes automatically.

## Commands

```bash
npm install        # one-time
npm run serve      # local preview at http://localhost:8080 (live reload)
npm run build      # build to _site/
npm run sync:feeds # refresh YouTube + Instagram snapshots (needs API creds; see below)
```

## Where content lives

| What | Where |
|------|-------|
| News posts | `src/news/<slug>.md` (Markdown + frontmatter) |
| Homepage | `src/index.njk` |
| Contact page | `src/contact.njk` |
| News index | `src/news.njk` |
| Site-wide data (bio, nav, socials, colors, brand copy) | `src/_data/site.json` |
| Feed snapshots (auto-managed) | `src/_data/youtube.json`, `src/_data/instagram.json` |
| Original WordPress page HTML (reference only) | `src/_data/pages/*.json` |
| Layout / partials | `src/_includes/` (`base.njk`, `partials/`, `post.njk`) |
| Styles | `src/assets/css/site.css` |
| Images | `src/assets/images/` |

## How to: add a news post

1. Create `src/news/<slug>.md`. Use a lowercase, hyphenated slug.
2. Frontmatter (the `permalink` is the public URL — keep it `/<slug>/`):

   ```markdown
   ---
   layout: post.njk
   title: "Flo wins the season opener"
   date: 2026-03-14
   slug: flo-wins-season-opener
   permalink: /flo-wins-season-opener/
   hero: "/assets/images/season-opener.jpg"
   excerpt: "A short one-sentence summary shown on the News page."
   ---

   Your post body in **Markdown**. Drop images in `src/assets/images/` and
   reference them as `/assets/images/<file>`.
   ```

3. `npm run build` to verify, then commit + push `main`.

## How to: update the bio, tagline, nav, or socials

Edit `src/_data/site.json` (e.g. `tagline`, `home.heroHeadline`, `socials`, `nav`). Rebuild, commit, push.

## How to: refresh the YouTube / Instagram feeds

Feeds render as **static snapshots** from `src/_data/youtube.json` and `src/_data/instagram.json`.
They are refreshed automatically every Monday by `.github/workflows/refresh-feeds.yml`, and can be
run on demand: `gh workflow run refresh-feeds.yml`. Locally: `npm run sync:feeds` (needs env vars).

The homepage **hides** the Latest Videos / Latest Photos sections while their data arrays are empty,
and shows them automatically once the snapshots are populated.

## ⚠️ One-time setup still required (provide these, then re-run the relevant step)

1. **Web3Forms key (contact form).** Get a free access key at https://web3forms.com and replace
   `web3formsKey` in `src/_data/site.json` (it is public-by-design — safe to commit).
2. **YouTube Data API key.** Create one in Google Cloud (YouTube Data API v3), then:
   `gh secret set YOUTUBE_API_KEY`.
3. **Instagram Graph API token.** Connect the IG account to a Facebook Page + Meta app, generate a
   **long-lived** token, then `gh secret set IG_ACCESS_TOKEN`. The weekly job refreshes the token; if
   it ever fully expires, regenerate and reset the secret.
4. **DNS cutover (final step — retires WordPress).** The repo ships a `CNAME` (`floespineira.com`)
   so Pages serves the apex domain. When ready to go live:
   - Point DNS for `floespineira.com` at GitHub Pages: apex `A` records `185.199.108.153`,
     `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (and `AAAA` `2606:50c0:8000/8001/8002/8003::153`),
     plus `www` `CNAME` → `pedrofuentes.github.io`.
   - In repo **Settings → Pages**, confirm the custom domain and enable **Enforce HTTPS**.
   - Verify the site loads at https://floespineira.com and all old URLs resolve, **then** retire the
     WordPress hosting.

## Architecture notes

- 11ty config: `eleventy.config.js` (passthrough assets, `posts` collection, date + RSS filters).
- SEO: per-page `<title>`/description/OpenGraph + GA4 in `base.njk`; `sitemap.xml`, `robots.txt`,
  RSS at `/feed/feed.xml` (legacy `/feed/` redirects to it).
- Existing post URLs are preserved exactly (including the encoded `…flo-espin%cc%83eira…` slug) for SEO.
