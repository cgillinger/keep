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

  console.log('Database initialized');
}

// Resolves once the schema is in place. server.js awaits this before it starts
// listening, so no request (or maintenance sweep) can hit a half-migrated
// schema after an upgrade.
db.ready = initialize();
db.dataDir = dataDir;

module.exports = db;
