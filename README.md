# TLDRWire

AI-powered news summarizer that fetches headlines from Google News RSS feeds and produces concise, customizable rundowns using Google's Gemini model.

----

## What this project is

TLDRWire is a small Next.js application (React + TypeScript) that:

- Aggregates headlines from Google News RSS (region + category aware).
- Uses a server-side call to Google's Gemini API to generate human-friendly summaries and bullet takeaways.
- Provides a lightweight SPA experience with presets, persistence, compact reading mode, and export/share utilities.

This repo contains both the frontend UI (pages + components) and the server-side API route that orchestrates RSS parsing, article scoring/deduplication, and LLM prompting.

## Highlights / Features

- Region- and category-based feeds (global + several country presets).
- Writing style presets (neutral, concise bullets, market analyst, executive brief, etc.).
- Compact mode for dense reading, copy/share/export/print actions.
- Client-side caching (short TTL) and server-side in-memory cache + in-flight dedupe to reduce LLM calls.
- RSS parsing via `rss-parser`, content sanitization via `DOMPurify` + `marked` for client rendering.
- Designed for deployment to Vercel (includes a `deploy:vercel` script).

## Tech stack

- Next.js (app pages in `pages/`)
- React + TypeScript
- rss-parser
- Google Generative AI client (`@google/generative-ai`) used server-side
- DOMPurify + marked for safe markdown -> HTML rendering in browser

See `package.json` for versions and scripts.

## Quick start (local development)

Requirements:

- Node.js >= 16
- npm >= 8

1. Install dependencies

```powershell
npm install
```

2. Provide your Gemini API key

Create a `.env.local` at the project root (not checked into Git) and add the key used by the server:

```text
# Example .env.local
GEMINI_API_KEY=sk-xxxx-your-gemini-key-xxxx
# (If you use a different provider/config, set the appropriate env vars.)
```

Important: The application expects the server-side code to access the Gemini API key (the key must not be bundled into client assets). In Vercel you should set `GEMINI_API_KEY` in Project Environment Variables.

3. Run the app

```powershell
npm run dev
```

Open http://localhost:3000 in your browser.

## Available npm scripts

- `npm run dev` — run development server
- `npm run build` — build for production
- `npm run start` — start production server
- `npm run lint` — run ESLint
- `npm run test` — run Jest tests (project has a Jest config)
- `npm run pre-deploy` — lint + test + security check before deploy
- `npm run deploy:vercel` — deploy to Vercel (CLI deploy)

## How to use

- Choose region, language, category and style in the left form.
- Adjust timeframe (hours) and how many articles to consider.
- Optionally add a keyword filter to focus the summarizer.
- Click "Generate TL;DR" or press Ctrl/Cmd + Enter.
- Use presets (Morning Brief, Tech Digest, Market Pulse, LT Local) for quick configurations.
- When results appear you can copy, share, export as text, or print the summary.

## Architecture & important bits

- pages/index.tsx — main UI glue: loads preferences, registers service worker, performs health check.
- components/NewsForm.tsx — UI for selecting region/category/style and controls.
- components/NewsOutput.tsx — renders sanitized markdown into the page and provides actions (copy/share/export).
- hooks/useApi.ts — client-side helper that sends POST requests to `/api/tldr`, performs caching, timeout and retry logic.
- pages/api/tldr.ts — server endpoint that:
  - builds a list of RSS URLs for the selected region & category
  - fetches and normalizes feed items (rss-parser)
  - scores, deduplicates and selects a diversified set of articles
  - builds a prompt and calls the Gemini LLM to generate a summary
  - caches the generated summary (in-memory) and returns metadata

Server-side code expects a valid Gemini API key. If missing, the API responds with a helpful error instructing you to configure the key.

## Environment variables

At minimum set:

- GEMINI_API_KEY — API key for Google Gemini (server-side only)

Other environment variables may be used by deployment platforms (for example Vercel secrets or functions timeout settings).

## Caching, rate-limits and costs

- The app uses short-lived in-memory caches on the server and deduplication of in-flight identical requests to avoid duplicate LLM calls.
- Client-side also keeps a small cache for a few minutes to avoid re-requesting the server frequently.
- Because LLM calls incur cost, avoid very short TTLs in production and monitor usage.

## Deployment

- Recommended: Vercel (serverless functions + automatic Next.js support). The repo already contains a `vercel.json` and a `deploy:vercel` npm script.
- Set `GEMINI_API_KEY` in Vercel project settings (Environment Variables) before deploying.

## Troubleshooting

- "GEMINI_API_KEY missing" — Make sure you set `GEMINI_API_KEY` in `.env.local` for local dev or in Vercel env vars for production. The client performs a health check at `/api/healthz` and will warn if the key is missing.
- RSS fetch timeouts — The RSS parser has a timeout; flaky feeds may be skipped. Try increasing network timeout in `pages/api/tldr.ts` if you see frequent fetch problems.
- Invalid JSON responses — If the API returns HTML or a non-JSON error, confirm your environment (e.g., serverless platform returning an error page) and check server logs.

## Tests & quality

- Jest is configured in `package.json` — add tests under a `__tests__` folder or alongside modules.
- Linting via ESLint / `eslint-config-next` is included.

## Contributing

1. Fork the repo.
2. Create a branch: `git checkout -b feat/my-feature`
3. Lint and run tests locally: `npm run lint && npm run test`
4. Open a concise PR describing your changes.

Please avoid committing secrets. Use `.env.local` for local testing.

## License

This project is MIT licensed. See the `LICENSE` file (if present) or the license field in `package.json`.

----

If you'd like, I can also add a short troubleshooting script, a sample `.env.local.example`, or badges for build/test coverage. Tell me which extras you'd like next.