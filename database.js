const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Data directory: DATA_DIR env (absolute or relative to the working directory)
// or ./data next to the code. Tests and non-default deployments point it
// elsewhere; the Docker image keeps the default.
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'keep.db');
const db = new sqlite3.Database(dbPath);

// Small promise wrappers so the schema setup below can run strictly in order.
const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) { err ? reject(err) : resolve(this); });
});
const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => { err ? reject(err) : resolve(rows); });
});

// Add a column if the table doesn't have it yet (idempotent migration).
async function ensureColumn(table, column, definition) {
  const columns = await all(`PRAGMA table_info(${table})`);
  if (columns.some(col => col.name === column)) return;
  await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  console.log(`Added ${column} column to ${table} table`);
}

async function initialize() {
  // Connection-level PRAGMAs. These are per-connection in SQLite and off by default:
  //  - foreign_keys=ON makes the schema's ON DELETE CASCADE rules actually fire
  //    (e.g. deleting a note removes its shares) instead of leaving orphaned rows.
  //  - busy_timeout makes a writer wait for a held lock instead of failing
  //    immediately with SQLITE_BUSY under concurrent access.
  //  - WAL journalling lets reads proceed while a write is in progress.
  await run('PRAGMA foreign_keys = ON');
  await run('PRAGMA busy_timeout = 5000');
  await run('PRAGMA journal_mode = WAL');

  // Base tables (the original schema; later columns are added by the
  // migrations below so existing databases upgrade in place).
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    profile_picture TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT,
    content TEXT,
    color TEXT DEFAULT '#ffffff',
    is_checklist INTEGER DEFAULT 0,
    checklist_items TEXT,
    is_archived INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id INTEGER NOT NULL,
    shared_by_user_id INTEGER NOT NULL,
    shared_with_user_id INTEGER NOT NULL,
    permission TEXT DEFAULT 'view',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(note_id, shared_with_user_id)
  )`);

  // AI command audit log (no content/output is logged — only metadata)
  await run(`CREATE TABLE IF NOT EXISTS note_ai_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    note_id INTEGER,
    command TEXT NOT NULL,
    status TEXT NOT NULL,
    result_item_count INTEGER,
    result_char_count INTEGER,
    error_message TEXT,
    duration_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Column migrations, in order. Each is a no-op when the column exists.
  await ensureColumn('notes', 'images', 'TEXT');
  await ensureColumn('notes', 'is_pinned', 'INTEGER DEFAULT 0');
  await ensureColumn('notes', 'processing_status', 'TEXT DEFAULT NULL');
  // Soft-delete timestamp: non-null means the note is in the trash (recoverable
  // for a grace period, then purged). NULL means the note is live.
  await ensureColumn('notes', 'deleted_at', 'DATETIME DEFAULT NULL');
  // Per-user pin on shares so a recipient can pin/unpin a shared note
  // independently of the owner's pin.
  await ensureColumn('shares', 'is_pinned', 'INTEGER DEFAULT 0');
  await ensureColumn('users', 'avatar_color', "TEXT DEFAULT '#1a73e8'");
  await ensureColumn('users', 'email', 'TEXT');
  await ensureColumn('users', 'reset_token', 'TEXT');
  await ensureColumn('users', 'reset_token_expires', 'DATETIME');
  await ensureColumn('users', 'background_theme', "TEXT DEFAULT 'default'");

  // Indexes (idempotent). Created after the migrations so they can reference
  // migrated columns on a fresh database too.
  await run(`CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes(is_archived)`);
  // The list queries always filter on owner + archived + not-deleted together.
  await run(`CREATE INDEX IF NOT EXISTS idx_notes_owner_state ON notes(user_id, is_archived, deleted_at)`);
  // Trash purge scans by deleted_at.
  await run(`CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_shares_shared_with ON shares(shared_with_user_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_shares_note_id ON shares(note_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_note_ai_log_user_created ON note_ai_log (user_id, created_at)`);

  // One account per e-mail address, so a password reset can never go to the
  // "first" of several accounts sharing one address. Partial so that accounts
  // without an e-mail (NULL) don't collide. If an existing database already
  // holds duplicates the index can't be created; log it and keep running —
  // the admin has to clean the duplicates up by hand.
  try {
    await run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL`);
  } catch (err) {
    console.error('Could not create unique e-mail index (duplicate e-mails in users table?):', err.message);
  }

  // One-off data migrations, tracked in schema_meta so each runs exactly once.
  await run(`CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY, value TEXT)`);
  await decodeHtmlEntitiesOnce();

  console.log('Database initialized');
}

// Up to and including v1.4.4 the server ran every title, note body, checklist
// item and username through DOMPurify, which HTML-serialised the text: "<" was
// stored as "&lt;", ">" as "&gt;", "&" as "&amp;" (when followed by a word
// character). The frontend escapes on render, so users saw the entities
// literally. Now that text is stored verbatim, decode what's already there.
const ENTITY_RE = /&(lt|gt|quot|#39|#x27|apos|nbsp|amp);/g;
const ENTITY_MAP = { lt: '<', gt: '>', quot: '"', '#39': "'", '#x27': "'", apos: "'", nbsp: ' ', amp: '&' };
function decodeEntities(text) {
  if (typeof text !== 'string' || text.indexOf('&') === -1) return text;
  return text.replace(ENTITY_RE, (m, name) => ENTITY_MAP[name]);
}

async function decodeHtmlEntitiesOnce() {
  const done = await all(`SELECT value FROM schema_meta WHERE key = 'html_entities_decoded'`);
  if (done.length > 0) return;

  const notes = await all(
    `SELECT id, title, content, checklist_items FROM notes
     WHERE title LIKE '%&%' OR content LIKE '%&%' OR checklist_items LIKE '%&%'`
  );
  const users = await all(`SELECT id, username FROM users WHERE username LIKE '%&%'`);

  await run('BEGIN');
  try {
    let changed = 0;
    for (const n of notes) {
      const title = decodeEntities(n.title);
      const content = decodeEntities(n.content);
      let items = n.checklist_items;
      if (typeof items === 'string' && items.indexOf('&') !== -1) {
        try {
          const parsed = JSON.parse(items);
          if (Array.isArray(parsed)) {
            for (const item of parsed) if (item && typeof item.text === 'string') item.text = decodeEntities(item.text);
            items = JSON.stringify(parsed);
          }
        } catch (e) { /* leave malformed JSON untouched */ }
      }
      if (title !== n.title || content !== n.content || items !== n.checklist_items) {
        // updated_at is deliberately left alone: this is a repair, not an edit.
        await run(`UPDATE notes SET title = ?, content = ?, checklist_items = ? WHERE id = ?`, [title, content, items, n.id]);
        changed++;
      }
    }
    for (const u of users) {
      const username = decodeEntities(u.username);
      if (username !== u.username) {
        try {
          await run(`UPDATE users SET username = ? WHERE id = ?`, [username, u.id]);
          changed++;
        } catch (e) {
          // Decoded name collides with an existing account; keep the encoded one.
          console.error(`Could not decode username for user ${u.id}: ${e.message}`);
        }
      }
    }
    await run(`INSERT INTO schema_meta (key, value) VALUES ('html_entities_decoded', ?)`, [new Date().toISOString()]);
    await run('COMMIT');
    if (changed > 0) console.log(`Decoded HTML entities in ${changed} row(s)`);
  } catch (err) {
    await run('ROLLBACK').catch(() => {});
    throw err;
  }
}

// Resolves once the schema is in place. server.js awaits this before it starts
// listening, so no request (or maintenance sweep) can hit a half-migrated
// schema after an upgrade.
db.ready = initialize();
db.dataDir = dataDir;

module.exports = db;
