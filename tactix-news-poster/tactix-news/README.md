# TACTIX Auto-Poster

Research -> AI illustration -> branded compositing -> AI copywriting -> post
(Bluesky + Mastodon), on a schedule via GitHub Actions.

## Pipeline

1. **`research.js`** — pulls RSS from `src/rss-sources.js`, filters out
   stories already posted (`data/posted-history.json`), and if nothing fresh
   is found, falls back to Gemini with Google Search grounding to find recent
   news/gossip/leaks. A second Gemini call picks the single best story and
   returns structured JSON (headline, category, summary, source, image seed).
2. **`image-gen.js`** — generates an illustration-only image via Gemini's
   image model. Deliberately asks for NO text/logo in the image — AI image
   models still render text unreliably.
3. **`compose.js`** — composites the branded graphic: gradient scrim,
   category tag, wrapped headline (Archivo Black), and the TX corner mark —
   all via `sharp` + SVG, so text is always pixel-perfect and on-brand.
4. **`copywrite.js` / `write-article.js`** — writes the short social caption
   and a longer editorial article body, both in the TACTIX voice (system
   prompt baked in — intelligent/authoritative/curious, no esports clichés).
5. **`store-links.js`** — rotates through the four BattleFoundry Cults3D
   stores (Fantasy/Scifi/Grimdark/Resin) so every post/article ends with a
   "get free minis" CTA — this is the actual point of the brand: driving
   traffic back to BattleFoundry.
6. **`site-generator.js`** — publishes a full news-site article into
   `docs/`: a big-masthead homepage (hero + grid, matching the brand guide's
   red/black/off-white system) and an individual article page per story.
   `docs/` is set up as a GitHub Pages source folder.
7. **`post-bluesky.js` / `post-mastodon.js`** — posts image + caption to both
   platforms.

## Enabling the site (GitHub Pages)

1. Push this repo to GitHub (see setup steps you already have).
2. Run the workflow once (or run `npm run run` locally and push `docs/`) so
   `docs/index.html` exists.
3. In the repo: **Settings → Pages** → under "Build and deployment", set
   **Source: Deploy from a branch**, branch **main**, folder **/docs**. Save.
4. GitHub gives you a URL like `https://<username>.github.io/tactix-news-poster/`
   — that's your live TACTIX site, same pattern as the BattleFoundry blog.

## Setup

```bash
npm install
cp .env.example .env   # fill in keys for local testing
```

Required secrets (set as GitHub repo secrets for Actions, or in `.env` locally):
- `GEMINI_API_KEY`
- `BLUESKY_HANDLE`, `BLUESKY_APP_PASSWORD` (an app password, not your main password)
- `MASTODON_INSTANCE_URL`, `MASTODON_ACCESS_TOKEN`

Run locally:
```bash
npm run run
```

## Things to do before going live

- **Swap the placeholder logo.** `assets/logo/tx-mark.svg` is a rough
  stand-in for the real TX mark — export the actual logo as SVG from your
  brand guide and drop it in at the same path.
- **Verify the RSS feed URLs in `src/rss-sources.js`.** These are the
  standard/likely feed URLs for each outlet, but some sites change their feed
  paths — I don't have network access to test them from here. Run
  `research.js` once locally and check the console warnings for any feeds
  that fail to parse, then fix/replace those entries.
- **Tune the image style prompt** in `image-gen.js` once you see a few real
  outputs — AI image gen consistency varies and the prompt may need
  adjusting to nail the "premium editorial, red/black grading" look.
- **`gemini-2.5-flash-image`** is the model name assumed for image gen —
  double check against Gemini's current docs in case the model id has since
  changed.
