# Architecture

## Overview

```
Browser (PWA)
 ├─ React UI (app/, components/)
 ├─ Learning logic (lib/: scheduler, packs, grammar, dictionary)
 ├─ IndexedDB  ── source of truth for cards and progress (lib/sync-local.ts, lib/learning-records.ts)
 └─ Service worker (public/sw.js) ── offline shell, build assets, images

Next.js route handlers (app/api/*)
 ├─ lookup, examples, meaning-de, quick-word, dictionary-search, word-inflections
 │    local data first, then fixed upstream hosts (Wiktionary etc.), rate limited
 ├─ sync/config      ── exposes the public Supabase URL + publishable key
 ├─ push/*           ── subscription settings, test push, hourly dispatch
 └─ ai/*             ── optional "Sign in with ChatGPT" sentence check

Supabase (Postgres)
 ├─ wortgarten_sync_items + wortgarten_sync_commit()  (sync)
 └─ wortgarten_push schema + wortgarten_push_store()   (push subscriptions)

GitHub Actions
 ├─ ci.yml             lint, typecheck, test, build on Node 22
 └─ push-dispatch.yml  hourly call to /api/push/dispatch (needs WORTGARTEN_URL var + secret)
```

## Local-first data

Cards, review state and settings live in IndexedDB. The app is fully usable
without an account or network. Sync is an add-on: `lib/sync-engine.ts`,
`lib/sync-cycle.ts` and `lib/sync-coordinator.ts` push local changes and pull
remote ones in batches.

## Sync and database security

- `wortgarten_sync_items` has RLS enabled and forced. All table privileges are
  revoked from `anon` and `authenticated`; an authenticated user can only
  `select` their own rows and only with a verified, non-anonymous email
  (`wortgarten_private.verified_user()`).
- All writes go through `wortgarten_sync_commit(...)`, a `SECURITY DEFINER`
  function with an empty `search_path`. It takes the owner from `auth.uid()`,
  validates keys and payload size, and uses optimistic versioning: a write with
  a stale base version is rejected and returned as a conflict for the client
  to merge.
- The push schema has no direct grants. Access is only through
  `wortgarten_push_store(p_secret, ...)`, gated by a hash of a 64-hex-char
  server-only secret (`WORTGARTEN_PUSH_STORE_SECRET`).
- No service-role key is used anywhere in the app.

## Web Push

Subscriptions are stored server side. Push endpoints are checked against an
allowlist of known push-service hosts (no arbitrary outbound requests) and
delivery does not follow redirects. `/api/push/dispatch` compares the cron
secret with a constant-time hash comparison. Payloads are encrypted with
`@block65/webcrypto-web-push` (VAPID).

## AI sentence check (optional, off by default)

The "write your own sentence" screen can send a sentence to an AI check that
runs on the learner's own ChatGPT plan via OpenAI's "Sign in with ChatGPT"
(SIWC). It stays hidden until `OPENAI_SIWC_CLIENT_ID` and
`SIWC_SESSION_SECRET` are set; SIWC client ids are currently limited-access.

- Authorization code flow with PKCE (S256); the code exchange happens on the
  server, the browser never sees a token.
- Only the rotating refresh token is kept, in an AES-GCM sealed cookie
  (`HttpOnly`, `SameSite=Lax`, 30 days).
- Each check refreshes the token and calls the Responses API with
  `store: false`; the answer is accepted only after `response.completed`.
- Only the sentence, the target pattern and its meaning are sent.
- Rate limited per instance.

A second mode lets a learner paste their own OpenAI API key. That key stays in
the browser (`localStorage`) and requests go straight from the browser to
`api.openai.com`; it never touches this server. The trade-off is that any XSS
on the origin could read it, which is why the app avoids injected HTML (the
only `dangerouslySetInnerHTML` is a static theme script).

## HTTP headers

`next.config.ts` sets `nosniff`, a strict referrer policy, anti-framing
(`X-Frame-Options` + `frame-ancestors 'none'`) and a Permissions-Policy that
only allows the microphone (used for speaking practice).

## Rate limiting

`lib/rate-limit.ts` is an in-memory, per-instance limiter applied to the
lookup and AI routes. It is a cost guard, not a global quota: on serverless
platforms every instance has its own counter.

## Tests and audits

- `npm test` runs the `node:test` suites in `tests/` (scheduler, sync engine,
  push transport, API helpers, content consistency, UI contracts).
- `npm run audit:app` runs extra static checks in `scripts/audit/`
  (linguistics, spaced-repetition flows, sync/API, CSS).
