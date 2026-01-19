const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const WebSocket = require('ws');
const http = require('http');

const db = require('./database');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'keep-clone-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if using HTTPS
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
};

// WebSocket connections
const clients = new Map();

wss.on('connection', (ws, req) => {
  const sessionCookie = req.headers.cookie;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'auth' && data.userId) {
        clients.set(data.userId, ws);
      }
    } catch (e) {
      console.error('WebSocket message error:', e);
    }
  });

  ws.on('close', () => {
    for (let [userId, client] of clients.entries()) {
      if (client === ws) {
        clients.delete(userId);
      }
    }
  });
});

function broadcastToUser(userId, data) {
  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(data));
  }
}

// ===== AUTH ROUTES =====

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run('INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username already exists' });
          }
          return res.status(500).json({ error: 'Registration failed' });
        }

        req.session.userId = this.lastID;
        req.session.username = username;
        res.json({
          id: this.lastID,
          username,
          message: 'Registration successful'
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({
      id: user.id,
      username: user.username,
      message: 'Login successful'
    });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out' });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({
    id: req.session.userId,
    username: req.session.username
  });
});

// ===== NOTES ROUTES =====

app.get('/api/notes', requireAuth, (req, res) => {
  const showArchived = req.query.archived === 'true';

  db.all(
    'SELECT * FROM notes WHERE user_id = ? AND is_archived = ? ORDER BY updated_at DESC',
    [req.session.userId, showArchived ? 1 : 0],
    (err, notes) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch notes' });
      }

      // Parse checklist items if present
      notes.forEach(note => {
        if (note.checklist_items) {
          try {
            note.checklist_items = JSON.parse(note.checklist_items);
          } catch (e) {
            note.checklist_items = [];
          }
        }
      });

      res.json(notes);
    }
  );
});

app.post('/api/notes', requireAuth, (req, res) => {
  const { title, content, color, is_checklist, checklist_items } = req.body;

  const checklistData = is_checklist && checklist_items
    ? JSON.stringify(checklist_items)
    : null;

  db.run(
    `INSERT INTO notes (user_id, title, content, color, is_checklist, checklist_items)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [req.session.userId, title || '', content || '', color || '#ffffff', is_checklist ? 1 : 0, checklistData],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create note' });
      }

      const noteId = this.lastID;
      db.get('SELECT * FROM notes WHERE id = ?', [noteId], (err, note) => {
        if (note && note.checklist_items) {
          try {
            note.checklist_items = JSON.parse(note.checklist_items);
          } catch (e) {
            note.checklist_items = [];
          }
        }

        broadcastToUser(req.session.userId, {
          type: 'note_created',
          note
        });

        res.json(note);
      });
    }
  );
});

app.put('/api/notes/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { title, content, color, is_checklist, checklist_items, is_archived } = req.body;

  const checklistData = is_checklist && checklist_items
    ? JSON.stringify(checklist_items)
    : null;

  db.run(
    `UPDATE notes
     SET title = ?, content = ?, color = ?, is_checklist = ?, checklist_items = ?,
         is_archived = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    [
      title || '',
      content || '',
      color || '#ffffff',
      is_checklist ? 1 : 0,
      checklistData,
      is_archived ? 1 : 0,
      id,
      req.session.userId
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update note' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Note not found' });
      }

      db.get('SELECT * FROM notes WHERE id = ?', [id], (err, note) => {
        if (note && note.checklist_items) {
          try {
            note.checklist_items = JSON.parse(note.checklist_items);
          } catch (e) {
            note.checklist_items = [];
          }
        }

        broadcastToUser(req.session.userId, {
          type: 'note_updated',
          note
        });

        res.json(note);
      });
    }
  );
});

app.delete('/api/notes/:id', requireAuth, (req, res) => {
  const { id } = req.params;

  db.run(
    'DELETE FROM notes WHERE id = ? AND user_id = ?',
    [id, req.session.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete note' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Note not found' });
      }

      broadcastToUser(req.session.userId, {
        type: 'note_deleted',
        noteId: id
      });

      res.json({ message: 'Note deleted' });
    }
  );
});

// Start server
server.listen(PORT, () => {
  console.log(`Keep Clone running on http://localhost:${PORT}`);
});
