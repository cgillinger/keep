const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { startServer, Client, expectStatus, repoRoot } = require('./helpers');

test('a missing or placeholder SESSION_SECRET is replaced by a persisted generated one', async () => {
  for (const secret of ['', 'short', 'change-this-to-a-random-string-in-production']) {
    const srv = await startServer({ NODE_ENV: 'production', SESSION_SECRET: secret });
    try {
      assert.equal(srv.exited, false, `server must keep running for secret "${secret}"`);
      const file = path.join(srv.dataDir, '.session-secret');
      assert.ok(fs.existsSync(file), 'generated secret is persisted');
      assert.ok(fs.readFileSync(file, 'utf8').trim().length >= 64);
      assert.equal(fs.statSync(file).mode & 0o777, 0o600);
      // The app works with the generated secret (login + authenticated call).
      const c = new Client(srv.base);
      await c.register('gen' + Date.now(), 'hemligt1');
      await expectStatus(await c.req('/api/me'), 200, 'me');
    } finally {
      await srv.stop();
    }
  }
});

test('migration: HTML entities stored by the old sanitizer are decoded once', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kreep-mig-'));
  const sqlite3 = require(path.join(repoRoot, 'node_modules', 'sqlite3'));
  await new Promise((resolve) => {
    const db = new sqlite3.Database(path.join(dataDir, 'keep.db'));
    db.serialize(() => {
      db.run(`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, profile_picture TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
      db.run(`CREATE TABLE notes (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, title TEXT, content TEXT, color TEXT DEFAULT '#ffffff', is_checklist INTEGER DEFAULT 0, checklist_items TEXT, is_archived INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
      db.run(`INSERT INTO users (username, password) VALUES ('old&amp;user', 'x')`);
      db.run(`INSERT INTO notes (user_id, title, content, is_checklist, checklist_items, updated_at) VALUES (1, 'A &lt; B', '2 &lt; 3 &amp;&amp; 4 &gt; 1\nTom & Jerry', 1, '[{"text":"x &gt; y","checked":false}]', '2024-01-01 00:00:00')`);
      db.run(`INSERT INTO notes (user_id, title, content) VALUES (1, 'plain', 'nothing to decode')`, () => db.close(resolve));
    });
  });

  // Point the server at the seeded directory (startServer makes its own, so override).
  const { spawn } = require('child_process');
  const port = 20000 + Math.floor(Math.random() * 20000);
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['server.js'], {
    cwd: repoRoot, stdio: 'ignore',
    env: { ...process.env, DATA_DIR: dataDir, PORT: String(port), SESSION_SECRET: 'x'.repeat(32), LOG_LEVEL: 'error' }
  });
  try {
    for (let i = 0; i < 100; i++) { try { await fetch(base + '/'); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
    const db = new sqlite3.Database(path.join(dataDir, 'keep.db'));
    const all = (q) => new Promise((res, rej) => db.all(q, (e, r) => e ? rej(e) : res(r)));
    const rows = await all('SELECT title, content, checklist_items, updated_at FROM notes ORDER BY id');
    assert.equal(rows[0].title, 'A < B');
    assert.equal(rows[0].content, '2 < 3 && 4 > 1\nTom & Jerry');
    assert.equal(JSON.parse(rows[0].checklist_items)[0].text, 'x > y');
    assert.equal(rows[0].updated_at, '2024-01-01 00:00:00', 'repair must not bump updated_at');
    assert.equal(rows[1].content, 'nothing to decode');
    assert.equal((await all('SELECT username FROM users'))[0].username, 'old&user');
    assert.equal((await all("SELECT value FROM schema_meta WHERE key='html_entities_decoded'")).length, 1);
    // Schema migrations ran: a fresh-but-old DB now has all columns and the app works.
    const c = new Client(base);
    await c.register('fresh' + Date.now(), 'hemligt1');
    await expectStatus(await c.req('/api/notes'), 200, 'list');
    db.close();
  } finally {
    child.kill('SIGKILL');
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
