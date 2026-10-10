# CLAUDE.md

Guidance for Claude Code when working in this repo (kreep — a self-hosted Google
Keep clone: Express + WebSocket + SQLite backend, vanilla-JS frontend).

## Build & test
- `npm test` runs the unit tests and the API integration tests (`node --test`).
  The integration tests in `test/` boot a real `server.js` on a random port with
  a temporary `DATA_DIR`, so they need no setup and leave nothing behind. Keep
  them green, and add a case there for every behaviour change in a route.
- `npm run build` fingerprints `public/app.js`/CSS into `public/dist/` (git-ignored)
  and rewrites `index.html` to point at the hashed bundles. The server prefers
  `public/dist/` when present, so **rebuild after frontend changes** — Docker and
  `start.sh`/`kreep.service` already run the build; a bare `node server.js` does not.
- Frontend translations live in `public/locales/*.json`. All 7 locales must stay
  key-consistent — after adding a key, verify every locale has it.

## Workflow
- Ship every change via branch → PR → remote merge (`gh pr merge --merge
  --delete-branch`) → pull main. No local-only merges, no stale branches.
- Deploy is to the Synology NAS (see the deploy note in Claude's memory), from
  `main` after the PR is merged.

## Dependency / security status (updated 2026-10-10)

The two deferred items from the 2026-07-02 hardening pass are done: `csurf` was
replaced by `csrf-csrf` (double-submit cookie, token not bound to the session id)
and `sqlite3` is on 6.x (an npm `overrides` entry makes `connect-sqlite3` share
it). `jsdom`/`dompurify` were dropped — note text is stored verbatim and escaped
on render — and `nodemon` was replaced by `node --watch`. `npm audit` is clean.
Keep it that way: run `npm audit` before a release and prefer updating within
semver first.

Other things to know before changing the server:
- `SESSION_SECRET` is resolved in `resolveSessionSecret()`: env value, else a
  generated secret persisted in `DATA_DIR/.session-secret`. Don't reintroduce a
  hard-coded fallback.
- The CSP forbids inline script (`script-src-attr 'none'`). New UI handlers go
  through `data-action`/`data-change`/`data-input` and the dispatch tables at
  the top of `public/app.js`, never `onclick=`.
- `PUT /api/notes/:id` honours `expected_updated_at` (409 on conflict). Clients
  that must overwrite omit it.
- Schema changes go in `database.js` `initialize()` (ordered, awaited before
  `listen`); one-off data repairs are tracked in `schema_meta`.
- Upgrade notes for operators live in README → "Upgrading an existing installation".
