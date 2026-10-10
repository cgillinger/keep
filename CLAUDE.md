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

## Deferred security TODOs

These were consciously left out of the 2026-07-02 hardening pass because each is a
**breaking** dependency upgrade that needs its own tested change. Neither is
exploitable in this app today; they're hygiene/future-proofing, not live holes.

- [ ] **Migrate off `csurf`.** `csurf` is archived and unmaintained, and it pulls
      in an old `cookie` version that `npm audit` flags. *Why it's not a live risk
      here:* the flagged `cookie` bug is about out-of-bounds characters in a
      cookie's name/path/domain, but csurf sets its own fixed cookie name — none of
      it is attacker-controlled. *The real problem:* an archived library gets no
      future security patches, so if a genuine CSRF bypass is ever found there's no
      upstream fix. *Fix:* replace with a maintained lib (e.g. `csrf-csrf` or
      `lusca`) and re-test the full CSRF flow (login, note CRUD, image upload,
      import, share) end-to-end.

- [ ] **Upgrade `sqlite3` 5 → 6 (or swap to `better-sqlite3`).** Most of the
      remaining `npm audit` "high" findings (`tar`, `cacache`, `node-gyp`,
      `@tootallnate/once`) come in through sqlite3's install/compile chain.
      *Why it's not a live risk:* those packages only run at `npm install` time to
      build the native module — they are **never reached by app users at runtime**,
      so an attacker hitting the running server can't touch them. *The real problem:*
      the audit stays noisy and the build toolchain carries known CVEs. *Fix:* bump
      to `sqlite3@6` (breaking major) and regression-test every DB path, or migrate
      to `better-sqlite3`. Left alone because it's the core data layer and the
      payoff is build-time-only.

### TL;DR of "what's the issue"
The runtime dependencies were updated (adm-zip, sharp, nodemailer, multer and the
express stack), so `npm audit` no longer reports anything reachable by app users
at runtime. What remains falls into harmless-here buckets: (1) the **sqlite3
install-time chain** (tar, cacache, node-gyp, ...) that only runs during
`npm install` to build the native module; (2) **csurf**'s old cookie dep, where
the vulnerable code path isn't reachable given how we use it; and (3) **nodemon's
dev-only chain**, which never ships to production. Worth cleaning up eventually
via the breaking upgrades above, but none of it is an open door into the running
app.
