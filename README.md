# Wortgarten

An offline-first German vocabulary and grammar trainer for Turkish speakers.
It is an installable PWA: cards and progress live on the device, and account
sync, push reminders and an AI sentence check are optional add-ons.

**Live demo:** https://wortgarten-beta.vercel.app (works without an account; the interface is German with Turkish hints)

## Features

- **Daily 20-minute session.** Automatically mixes new, due and difficult words with spaced repetition (`lib/review-scheduler.ts`).
- **Word lookup.** Bundled WikDict German-Turkish dictionary, Wiktionary inflection tables, verb government (Rektion) and licensed images (`app/api/lookup`).
- **Grammar practice.** Reference tables, fill-in-the-table recall, article, case and inflection drills, and a rule library.
- **Examples and patterns.** Every word has at least one pattern with a Turkish gloss; example sentences come from Tatoeba.
- **Plain-German definitions.** Card explanations only use a fixed A1–A2 defining vocabulary (`lib/defining-vocabulary.txt`), and a test enforces it.
- **Themed word packs.** About 1,900 bundled entries (core A1–B1 words, frequency lists, workplace, shopping, adverbs and more), plus JSON import for your own lists (`docs/import-format.md`).
- **Offline.** A service worker caches the app shell, build assets and images (`public/sw.js`).
- **Sync across devices.** Optional email login; cards and progress sync through Supabase.
- **Reminders.** Web Push notifications, sent by an hourly scheduled job.
- **Speaking practice.** Microphone recording for exam-style and pattern drills.

## Stack

- Next.js 16 (App Router, route handlers), React 19, TypeScript
- IndexedDB for local storage, service worker for offline use
- Supabase (Postgres, Auth, RLS, `SECURITY DEFINER` RPCs) for optional sync and push storage
- Web Push with VAPID (`@block65/webcrypto-web-push`)
- `node:test` and esbuild for tests, ESLint, GitHub Actions CI
- Deployed on Vercel

## Architecture in short

```
Browser PWA ── IndexedDB (source of truth) ── service worker (offline)
     │
Next.js route handlers ── dictionary / examples / inflections (local data first, rate limited)
     │                └── push settings + dispatch, optional AI check
Supabase ── sync table behind RLS + commit RPC, push store behind secret-gated RPC
GitHub Actions ── CI (lint, typecheck, test, build) + hourly push dispatch
```

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Engineering highlights

- **Local-first by design.** The app is fully usable with no account or network; sync is an add-on that batches local changes and merges remote ones.
- **Database access through one audited door.** The sync table has RLS enabled and forced, with all direct privileges revoked. Users can only read their own rows with a verified email, and every write goes through a `SECURITY DEFINER` function with an empty `search_path` that takes the owner from `auth.uid()`, validates keys and sizes, and rejects stale writes with optimistic versioning.
- **No service-role key in the app.** The push store is reachable only through an RPC gated by a hash of a server-only secret.
- **Hardened outbound requests.** Push endpoints must match known push-service hosts and redirects are not followed. Lookup routes only call fixed upstream hosts with encoded parameters. The cron secret is checked with a constant-time comparison.
- **Optional AI feedback without handling user tokens in the browser.** "Sign in with ChatGPT" uses PKCE with the code exchange on the server, and the refresh token sits in an AES-GCM sealed `HttpOnly` cookie. The feature stays hidden until it is configured.
- **Content treated as code.** Tests check content consistency, for example that every word has a pattern and that definitions stay inside the defining vocabulary. `npm run audit:app` adds static checks for linguistics, SRS flows, sync/API and CSS.
- **Tests:** 515 `node:test` cases (514 pass, 1 skipped because it needs a private card export).

## Getting started

Requires Node 22.

```bash
npm ci
cp .env.example .env.local   # optional: everything works without it
npm run dev                  # http://localhost:3000
```

Checks (the same ones CI runs):

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

### Environment variables

All are optional. Without them the app runs local-first and the related feature stays off.

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Account sync and push subscription store |
| `WORTGARTEN_PUSH_STORE_SECRET` | Gate for the push store RPC (64 hex characters) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push signing |
| `WORTGARTEN_PUSH_CRON_SECRET` / `CRON_SECRET` | Authorizes `/api/push/dispatch` |
| `OPENAI_SIWC_CLIENT_ID`, `SIWC_SESSION_SECRET` | Enable the AI sentence check (SIWC client ids are limited-access) |
| `OPENAI_SIWC_CLIENT_SECRET`, `SIWC_REDIRECT_URI`, `OPENAI_SIWC_MODEL` | Optional SIWC settings |

The hourly push workflow (`.github/workflows/push-dispatch.yml`) needs a repository variable `WORTGARTEN_URL` and a secret `WORTGARTEN_PUSH_CRON_SECRET`; without them it skips.

### Database

The Supabase schema is in `supabase/migrations/`. Apply the files in order with the Supabase CLI or the SQL editor.

## Project layout

- `app/` pages and API route handlers
- `components/` UI components
- `lib/` learning logic, dictionary, sync and push; `*.json` files are reviewed content
- `public/vocabulary-art/` licensed images
- `scripts/` content and image generation scripts, plus `scripts/audit/`
- `tests/` `node:test` suites
- `supabase/migrations/` database schema

## Content and licenses

The **code** is MIT licensed (see [LICENSE](LICENSE)). The bundled **content** keeps its own licenses:

| Content | Source | License |
| --- | --- | --- |
| Example sentences | Tatoeba contributors | CC BY 2.0 FR |
| German-Turkish dictionary | WikDict / FreeDict | CC BY-SA 3.0 (`public/dictionaries/LICENSE.txt`) |
| Inflections, patterns | Wiktionary | CC BY-SA 4.0 |
| Frequency list | Buchmeier | CC BY-SA 4.0 |
| Photos | Wikimedia Commons, per-file author and license | various CC licenses (`lib/wiki-photos.json`, `lib/reviewed-photos.json`) |
| Emoji | OpenMoji 17.0.0 / Twemoji 17.0.3 | CC BY-SA 4.0 / CC BY 4.0 |
| Icons | Lucide | ISC (Feather parts MIT) |
| Teaching illustrations | original to this project | CC BY 4.0 |

Full attributions are listed in `public/visual-sources.html`.

## How it was built

I built Wortgarten with AI coding assistants (Claude Code and OpenAI Codex).
I set the product direction, the learning design and the architecture and
security decisions, and I reviewed and tested the generated code. I also curated
the learning content and its sources.

## Status

Personal project, deployed as a public beta. The AI sentence
check is implemented but switched off until a SIWC client id is available.
