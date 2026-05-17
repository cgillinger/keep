const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'keep.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    profile_picture TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Notes table
  db.run(`CREATE TABLE IF NOT EXISTS notes (
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

  // Shares table - for sharing notes between users
  db.run(`CREATE TABLE IF NOT EXISTS shares (
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

  // Migration: Add images column to notes if it doesn't exist
  db.all("PRAGMA table_info(notes)", (err, columns) => {
    if (err) {
      console.error('Error checking notes schema:', err);
      return;
    }

    const hasImages = columns.some(col => col.name === 'images');
    if (!hasImages) {
      db.run(`ALTER TABLE notes ADD COLUMN images TEXT`, (err) => {
        if (err) {
          console.error('Error adding images column:', err);
        } else {
          console.log('Added images column to notes table');
        }
      });
    }

    const hasPinned = columns.some(col => col.name === 'is_pinned');
    if (!hasPinned) {
      db.run(`ALTER TABLE notes ADD COLUMN is_pinned INTEGER DEFAULT 0`, (err) => {
        if (err) {
          console.error('Error adding is_pinned column:', err);
        } else {
          console.log('Added is_pinned column to notes table');
        }
      });
    }

    const hasProcessingStatus = columns.some(col => col.name === 'processing_status');
    if (!hasProcessingStatus) {
      db.run(`ALTER TABLE notes ADD COLUMN processing_status TEXT DEFAULT NULL`, (err) => {
        if (err) {
          console.error('Error adding processing_status column:', err);
        } else {
          console.log('Added processing_status column to notes table');
        }
      });
    }
  });

  // AI command audit log (no content/output is logged — only metadata)
  db.run(`CREATE TABLE IF NOT EXISTS note_ai_log (
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

  db.run(`CREATE INDEX IF NOT EXISTS idx_note_ai_log_user_created ON note_ai_log (user_id, created_at)`);

  // Migration: Add avatar_color column to users if it doesn't exist
  db.all("PRAGMA table_info(users)", (err, columns) => {
    if (err) {
      console.error('Error checking users schema:', err);
      return;
    }

    const hasAvatarColor = columns.some(col => col.name === 'avatar_color');
    if (!hasAvatarColor) {
      db.run(`ALTER TABLE users ADD COLUMN avatar_color TEXT DEFAULT '#1a73e8'`, (err) => {
        if (err) {
          console.error('Error adding avatar_color column:', err);
        } else {
          console.log('Added avatar_color column to users table');
        }
      });
    }

    const hasEmail = columns.some(col => col.name === 'email');
    if (!hasEmail) {
      db.run(`ALTER TABLE users ADD COLUMN email TEXT`, (err) => {
        if (err) {
          console.error('Error adding email column:', err);
        } else {
          console.log('Added email column to users table');
        }
      });
    }

    const hasResetToken = columns.some(col => col.name === 'reset_token');
    if (!hasResetToken) {
      db.run(`ALTER TABLE users ADD COLUMN reset_token TEXT`, (err) => {
        if (err) {
          console.error('Error adding reset_token column:', err);
        } else {
          console.log('Added reset_token column to users table');
        }
      });
    }

    const hasResetTokenExpires = columns.some(col => col.name === 'reset_token_expires');
    if (!hasResetTokenExpires) {
      db.run(`ALTER TABLE users ADD COLUMN reset_token_expires DATETIME`, (err) => {
        if (err) {
          console.error('Error adding reset_token_expires column:', err);
        } else {
          console.log('Added reset_token_expires column to users table');
        }
      });
    }

    const hasBackgroundTheme = columns.some(col => col.name === 'background_theme');
    if (!hasBackgroundTheme) {
      db.run(`ALTER TABLE users ADD COLUMN background_theme TEXT DEFAULT 'default'`, (err) => {
        if (err) {
          console.error('Error adding background_theme column:', err);
        } else {
          console.log('Added background_theme column to users table');
        }
      });
    }
  });

  console.log('Database initialized');
});

module.exports = db;
