const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { startServer, repoRoot } = require('./helpers');

const sqlite3 = require(path.join(repoRoot, 'node_modules', 'sqlite3'));

function withDb(dir, fn) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(path.join(dir, 'keep.db'));
    fn(db, (err, value) => { db.close(); err ? reject(err) : resolve(value); });
  });
}
const indexNames = (dir) => withDb(dir, (db, done) =>
  db.all("SELECT name FROM sqlite_master WHERE type = 'index'", (err, rows) => done(err, rows && rows.map(r => r.name))));
const exec = (dir, sql) => withDb(dir, (db, done) => db.exec(sql, done));

test('migration: redundant indexes from older versions are dropped, the covering ones stay', async () => {
  const seed = await startServer();
  let second;
  try {
    const dir = seed.dataDir;
    await exec(dir, 'CREATE INDEX idx_notes_user_id ON notes(user_id); CREATE INDEX idx_notes_archived ON notes(is_archived); CREATE INDEX idx_shares_note_id ON shares(note_id);');
    assert.ok((await indexNames(dir)).includes('idx_notes_user_id'));

    // Restart on the same data directory: initialize() must drop them.
    seed.child.kill('SIGTERM');
    await new Promise(r => { seed.child.on('exit', r); setTimeout(r, 3000); });
    second = await startServer({ DATA_DIR: dir });
    const after = await indexNames(dir);
    for (const gone of ['idx_notes_user_id', 'idx_notes_archived', 'idx_shares_note_id']) {
      assert.ok(!after.includes(gone), `${gone} dropped`);
    }
    for (const kept of ['idx_notes_owner_state', 'idx_notes_deleted_at', 'idx_shares_shared_with']) {
      assert.ok(after.includes(kept), `${kept} kept`);
    }
  } finally {
    if (second) await second.stop();
    await seed.stop();
  }
});
