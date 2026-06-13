// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const bcrypt = require('bcryptjs');
const WebSocket = require('ws');
const http = require('http');
const multer = require('multer');
const AdmZip = require('adm-zip');
const fs = require('fs');
const fsp = require('fs').promises;
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const { JSDOM } = require('jsdom');
const DOMPurify = require('dompurify');
const sharp = require('sharp');

const db = require('./database');
const KeepImportParser = require('./import-parser');
const BackupGenerator = require('./export-generator');
const mailer = require('./mailer');
const crypto = require('crypto');
const logger = require('./logger');
const commandProcessor = require('./command-processor');

// Initialize DOMPurify with jsdom
const window = new JSDOM('').window;
const purify = DOMPurify(window);

const app = express();
app.use(compression({ threshold: 1024 }));
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// AI command configuration (//list, //ocr) — graceful degradation if not set.
const NOTE_IMAGES_DIR = path.join(__dirname, 'data', 'note-images');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const AI_RATE_LIMIT_HOURLY = parseInt(process.env.AI_RATE_LIMIT_HOURLY || '10', 10);
const AI_RATE_LIMIT_DAILY = parseInt(process.env.AI_RATE_LIMIT_DAILY || '50', 10);
const MAX_IMAGES_PER_NOTE = parseInt(process.env.MAX_IMAGES_PER_NOTE || '30', 10);
let aiCommandsActive = process.env.AI_COMMANDS_ENABLED === 'true';
if (aiCommandsActive && !GEMINI_API_KEY) {
  logger.warn('AI_COMMANDS_ENABLED=true men GEMINI_API_KEY saknas. AI-kommandon avstängda.');
  aiCommandsActive = false;
} else if (aiCommandsActive) {
  logger.info('AI-kommandon aktiva (//list, //ocr).');
}

// ===== SECURITY MIDDLEWARE =====

// Check if running behind HTTPS (e.g., reverse proxy with TLS termination)
const isHttps = process.env.FORCE_HTTPS === 'true';

// Helmet for security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false, // IMPORTANT: disables Helmet's implicit upgrade-insecure-requests
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers (onclick, etc)
        styleSrc: ["'self'", "'unsafe-inline'"], // Inline styles needed for dynamic colors
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"]
        // NO upgrade-insecure-requests over HTTP
      }
    },

    // Enable HSTS ONLY when HTTPS is actually used
    hsts: isHttps
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        }
      : false,

    // Disable Cross-Origin policies over HTTP (they require "trustworthy" origins)
    crossOriginOpenerPolicy: isHttps ? { policy: "same-origin-allow-popups" } : false,
    crossOriginEmbedderPolicy: false, // Not needed for this app
    crossOriginResourcePolicy: false  // Not needed for this app
  })
);

// Rate limiters
// Development-friendly: More lenient limits for testing
const isDevelopment = process.env.NODE_ENV !== 'production';

const loginLimiter = rateLimit({
  windowMs: isDevelopment ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 min dev, 15 min prod
  max: isDevelopment ? 50 : 5, // 50 attempts dev, 5 prod
  handler: (req, res) => res.status(429).json({
    error: 'För många inloggningsförsök. Försök igen om 15 minuter.'
  }),
  standardHeaders: true,
  legacyHeaders: false
});

const registerLimiter = rateLimit({
  windowMs: isDevelopment ? 1 * 60 * 1000 : 60 * 60 * 1000, // 1 min dev, 1 hour prod
  max: isDevelopment ? 20 : 3, // 20 registrations dev, 3 prod
  handler: (req, res) => res.status(429).json({
    error: 'För många registreringar. Försök igen senare.'
  }),
  standardHeaders: true,
  legacyHeaders: false
});

const importLimiter = rateLimit({
  windowMs: isDevelopment ? 1 * 60 * 1000 : 60 * 60 * 1000, // 1 min dev, 1 hour prod
  max: isDevelopment ? 50 : 10, // 50 imports dev, 10 prod
  handler: (req, res) => res.status(429).json({
    error: 'För många importer. Försök igen senare.'
  }),
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isDevelopment ? 500 : 100, // 500 requests dev, 100 prod
  handler: (req, res) => res.status(429).json({
    error: 'För många förfrågningar. Var god vänta.'
  }),
  standardHeaders: true,
  legacyHeaders: false
});

const passwordResetLimiter = rateLimit({
  windowMs: isDevelopment ? 1 * 60 * 1000 : 60 * 60 * 1000, // 1 min dev, 1 hour prod
  max: isDevelopment ? 20 : 3, // 20 attempts dev, 3 prod
  handler: (req, res) => res.status(429).json({
    error: 'För många återställningsförfrågningar. Försök igen senare.'
  }),
  standardHeaders: true,
  legacyHeaders: false
});

// Body parsing and cookies
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Session configuration (SECURE) with persistent SQLite store
const sessionConfig = {
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: './data',
    table: 'sessions',
    concurrentDB: true, // Enable WAL mode for better concurrency
    touch: 3600 // Throttle session-table writes (only re-touch every hour)
  }),
  secret: process.env.SESSION_SECRET || (() => {
    logger.logSecurity('Using default session secret', {
      message: 'Set SESSION_SECRET environment variable in production'
    });
    return 'kreep-secret-change-in-production';
  })(),
  resave: false, // SQLite store handles persistence - don't save on every request
  saveUninitialized: false,
  cookie: {
    secure: false, // Allow cookies over HTTP (set to true only if using HTTPS)
    httpOnly: true, // Prevent JavaScript access
    sameSite: 'lax', // Balance between security and compatibility
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  name: 'sessionId' // Don't use default name
};

app.use(session(sessionConfig));

// CSRF protection (except for specific routes)
const csrfProtection = csrf({ cookie: true });

// Serve the built (fingerprinted) index.html for the app root when present,
// falling back to the source index.html in dev (no build run). index.html itself
// is always revalidated; the hashed bundles it points to are cached immutably.
const builtIndex = path.join(__dirname, 'public', 'dist', 'index.html');
app.get('/', (req, res, next) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(builtIndex, (err) => {
    if (err) next(); // no dist build -> let express.static serve source index.html
  });
});

// Serve static files. App code, styles and translations are NOT content-hashed,
// so they must always be revalidated (ETag) — otherwise edits never reach a
// browser that cached them. The fingerprinted bundles under /dist/ carry a
// content hash in their name, so they can be cached immutably forever.
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true, // Enable ETag for conditional requests (cheap 304s)
  lastModified: true, // Enable Last-Modified header
  setHeaders: (res, filePath) => {
    if (filePath.includes(`${path.sep}dist${path.sep}`) && !filePath.endsWith('index.html')) {
      // Content-hashed bundles: filename changes when content changes.
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (
      filePath.endsWith('.html') ||
      filePath.endsWith('.js') ||
      filePath.endsWith('.css') ||
      filePath.endsWith('.json')
    ) {
      // Always revalidate: browser checks with the server and gets 304 when
      // unchanged, fresh content when it changed. No stale code/translations.
      res.setHeader('Cache-Control', 'no-cache');
    } else {
      // Images, fonts, icons: safe to cache for a day.
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
};

// Input validation helper
function validatePassword(password) {
  if (!password || password.length < 5) {
    return 'Lösenordet måste vara minst 5 tecken långt';
  }
  return null;
}

function sanitizeInput(input, maxLength = 10000) {
  if (!input) return '';
  const sanitized = purify.sanitize(input, { ALLOWED_TAGS: [] });
  return sanitized.substring(0, maxLength);
}

function validateColor(color) {
  const validColors = [
    '#ffffff', '#f28b82', '#fbbc04', '#fff475', '#ccff90',
    '#a7ffeb', '#cbf0f8', '#aecbfa', '#d7aefb', '#fdcfe8',
    '#e6c9a8', '#e8eaed'
  ];
  return validColors.includes(color) ? color : '#ffffff';
}

// ===== WEBSOCKET WITH SECURE AUTHENTICATION =====

// Use same session config for WebSocket authentication
const sessionParser = session(sessionConfig);

const clients = new Map(); // userId -> Set<WebSocket> (a user may be connected from several tabs/devices)

wss.on('connection', (ws, req) => {
  // Create a mock response object for session parsing
  const mockRes = {
    setHeader: () => {},
    getHeader: () => {},
    end: () => {},
    writeHead: () => {}
  };

  // Parse session from cookie
  sessionParser(req, mockRes, () => {
    if (!req.session || !req.session.userId) {
      logger.logWS('Connection rejected', null, { reason: 'No valid session' });
      ws.close(1008, 'Authentication required');
      return;
    }

    const userId = req.session.userId;
    logger.logWS('Connection authenticated', userId);

    // Store connection. Keep a set per user so multiple tabs/devices all get
    // real-time updates instead of only the most recently connected one.
    let userSockets = clients.get(userId);
    if (!userSockets) {
      userSockets = new Set();
      clients.set(userId, userSockets);
    }
    userSockets.add(ws);

    const cleanup = () => {
      const set = clients.get(userId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) clients.delete(userId);
      }
    };

    ws.on('close', () => {
      logger.logWS('Connection closed', userId);
      cleanup();
    });

    ws.on('error', (error) => {
      logger.logWS('Connection error', userId, { error: error.message });
      cleanup();
    });
  });
});

function broadcastToUser(userId, data) {
  const userSockets = clients.get(userId);
  if (!userSockets) return;
  const payload = JSON.stringify(data);
  userSockets.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (error) {
        logger.error('Error broadcasting to user:', error);
      }
    }
  });
}

function broadcastToUsers(userIds, data) {
  userIds.forEach(userId => broadcastToUser(userId, data));
}

// ===== AI COMMAND TRIGGER =====
//
// Runs asynchronously after a note is saved. Updates the note multiple times
// (pending → done/failed) and broadcasts via WebSocket. Never logs note content,
// images, prompts, or AI output — only metadata in note_ai_log.
function broadcastNoteUpdate(noteId, ownerId) {
  db.get('SELECT * FROM notes WHERE id = ?', [noteId], (err, note) => {
    if (err || !note) return;
    if (note.checklist_items) {
      try { note.checklist_items = JSON.parse(note.checklist_items); } catch (e) { note.checklist_items = []; }
    }
    if (note.images) {
      try { note.images = JSON.parse(note.images); } catch (e) { note.images = []; }
    }
    broadcastToUser(ownerId, { type: 'note_updated', note });
    db.all('SELECT shared_with_user_id FROM shares WHERE note_id = ?', [noteId], (err2, shares) => {
      if (!err2 && shares) {
        shares.forEach(s => broadcastToUser(s.shared_with_user_id, { type: 'note_updated', note }));
      }
    });
  });
}

function updateNoteFields(noteId, fields) {
  return new Promise((resolve, reject) => {
    const cols = Object.keys(fields);
    const setClauses = cols.map(k => `${k} = ?`).join(', ');
    const values = [...cols.map(k => fields[k]), noteId];
    db.run(
      `UPDATE notes SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values,
      err => err ? reject(err) : resolve()
    );
  });
}

function logAiCall(userId, noteId, command, status, fields = {}) {
  db.run(
    `INSERT INTO note_ai_log (user_id, note_id, command, status, result_item_count, result_char_count, error_message, duration_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, noteId, command, status,
     fields.itemCount || null, fields.charCount || null,
     fields.error || null, fields.duration || null],
    err => { if (err) logger.error('Failed to write note_ai_log:', err); }
  );
}

function checkRaceState(noteId, expected) {
  return new Promise(resolve => {
    db.get('SELECT processing_status FROM notes WHERE id = ?', [noteId], (err, row) => {
      if (err || !row) return resolve();
      if (row.processing_status !== expected) {
        logger.warn(`AI race detected: note=${noteId} expected_status=${expected} actual_status=${row.processing_status}`);
      }
      resolve();
    });
  });
}

async function triggerAiCommand(note, cmd, triggeredByUserId) {
  const start = Date.now();
  const command = cmd.command;
  const ownerId = note.user_id;

  let images = [];
  if (note.images) {
    try { images = JSON.parse(note.images); } catch (e) { images = []; }
  }

  logger.info(`AI command triggered: command=${command} user=${triggeredByUserId} note=${note.id} images=${Array.isArray(images) ? images.length : 0}`);

  const failWith = async (message, status) => {
    try {
      await updateNoteFields(note.id, { content: message, processing_status: 'failed' });
    } catch (e) {
      logger.error('Failed to write AI error state:', e);
    }
    broadcastNoteUpdate(note.id, ownerId);
    logAiCall(triggeredByUserId, note.id, command, status, { duration: Date.now() - start });
  };

  // Only the owner may spend their API quota.
  if (triggeredByUserId !== ownerId) {
    return failWith('⚠️ Endast notens ägare kan använda AI-kommandon', 'failed');
  }
  if (note.is_archived) {
    return failWith('⚠️ AI-kommandon fungerar inte på arkiverade noter', 'failed');
  }
  if (!Array.isArray(images) || images.length === 0) {
    return failWith(`⚠️ //${command} kräver minst en bifogad bild`, 'no_images');
  }
  if (!GEMINI_API_KEY) {
    return failWith('⚠️ AI-funktioner ej konfigurerade på servern', 'no_api_key');
  }

  const limit = commandProcessor.checkAiLimit(ownerId, AI_RATE_LIMIT_HOURLY, AI_RATE_LIMIT_DAILY);
  if (!limit.allowed) {
    return failWith(`⚠️ AI-anrops-gräns nådd (${limit.reason}). Försök igen senare.`, 'rate_limited');
  }

  try {
    await updateNoteFields(note.id, {
      content: `🔄 Bearbetar //${command}...`,
      processing_status: 'pending',
    });
    broadcastNoteUpdate(note.id, ownerId);
  } catch (e) {
    logger.error('Failed to mark note pending:', e);
    return;
  }

  try {
    if (command === 'list') {
      const items = await commandProcessor.processListCommand(images, NOTE_IMAGES_DIR, GEMINI_API_KEY);
      const checklist = commandProcessor.buildChecklistFromItems(items, cmd.userText);
      await checkRaceState(note.id, 'pending');
      await updateNoteFields(note.id, {
        content: '',
        is_checklist: 1,
        checklist_items: JSON.stringify(checklist),
        processing_status: 'done',
      });
      limit.record();
      const duration = Date.now() - start;
      logger.info(`AI command success: command=list user=${ownerId} note=${note.id} duration=${duration}ms items=${items.length}`);
      logAiCall(ownerId, note.id, command, 'success', { itemCount: items.length, duration });
    } else if (command === 'ocr') {
      const text = await commandProcessor.processOcrCommand(images, NOTE_IMAGES_DIR, GEMINI_API_KEY);
      const newContent = cmd.userText
        ? `${cmd.userText}\n\n--- OCR-transkription ---\n${text}`
        : text;
      await checkRaceState(note.id, 'pending');
      await updateNoteFields(note.id, {
        content: newContent,
        is_checklist: 0,
        checklist_items: null,
        processing_status: 'done',
      });
      limit.record();
      const duration = Date.now() - start;
      logger.info(`AI command success: command=ocr user=${ownerId} note=${note.id} duration=${duration}ms chars=${text.length}`);
      logAiCall(ownerId, note.id, command, 'success', { charCount: text.length, duration });
    }
    broadcastNoteUpdate(note.id, ownerId);
  } catch (err) {
    const duration = Date.now() - start;
    logger.warn(`AI command failed: command=${command} user=${ownerId} note=${note.id} error=${err.message}`);
    try {
      await checkRaceState(note.id, 'pending');
      await updateNoteFields(note.id, {
        content: `⚠️ AI-anrop misslyckades: ${err.message}. Redigera noten och lägg tillbaka //${command} för att försöka igen.`,
        processing_status: 'failed',
      });
    } catch (e) {
      logger.error('Failed to write AI failure state:', e);
    }
    broadcastNoteUpdate(note.id, ownerId);
    logAiCall(ownerId, note.id, command, 'failed', { error: err.message, duration });
  }
}

function maybeTriggerAiCommand(noteId, triggeredByUserId) {
  if (!aiCommandsActive) return;
  db.get('SELECT * FROM notes WHERE id = ?', [noteId], (err, raw) => {
    if (err || !raw || !raw.content) return;
    const cmd = commandProcessor.parseCommand(raw.content);
    if (!cmd) return;
    setImmediate(() => {
      triggerAiCommand(raw, cmd, triggeredByUserId).catch(e => {
        logger.error(`AI command crashed for note ${noteId}: ${e.message}`);
      });
    });
  });
}

// Helper function to delete note image files from disk
async function deleteNoteImageFiles(imageFilenames) {
  if (!imageFilenames || !Array.isArray(imageFilenames)) return;

  const imageDir = path.join(__dirname, 'data', 'note-images');

  const valid = imageFilenames.filter(filename => {
    // Validate filename format to prevent path traversal
    if (!/^note_\d+_\d+\.webp$/.test(filename)) {
      logger.warn('Invalid image filename format, skipping deletion:', filename);
      return false;
    }
    return true;
  });

  await Promise.allSettled(
    valid.map(filename => fsp.unlink(path.join(imageDir, filename)))
  );
}

async function dedupImagesByHash(imageFilenames) {
  const noteImagesDir = path.join(__dirname, 'data', 'note-images');
  const seen = new Map();
  const kept = [];
  const duplicates = [];

  for (const filename of imageFilenames) {
    const filepath = path.join(noteImagesDir, filename);
    try {
      const buf = await fsp.readFile(filepath);
      const hash = crypto.createHash('sha256').update(buf).digest('hex');
      if (seen.has(hash)) {
        duplicates.push(filename);
      } else {
        seen.set(hash, filename);
        kept.push(filename);
      }
    } catch (err) {
      logger.warn(`Image file missing during dedup: ${filename}`);
      duplicates.push(filename);
    }
  }

  return { kept, duplicates };
}

// ===== AUTH ROUTES =====

// Get CSRF token
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.post('/api/register', registerLimiter, csrfProtection, async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Användarnamn och lösenord krävs' });
  }

  // Sanitize username
  const sanitizedUsername = sanitizeInput(username, 50).trim();
  if (sanitizedUsername.length < 3) {
    return res.status(400).json({ error: 'Användarnamnet måste vara minst 3 tecken' });
  }

  // Validate and sanitize email (optional)
  let sanitizedEmail = null;
  if (email && email.trim()) {
    sanitizedEmail = sanitizeInput(email, 255).trim().toLowerCase();
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      return res.status(400).json({ error: 'Ogiltig e-postadress' });
    }
  }

  // Validate password
  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12); // Increased from 10 to 12 rounds

    db.run('INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
      [sanitizedUsername, hashedPassword, sanitizedEmail],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Användarnamnet är upptaget' });
          }
          logger.error('Registration error:', err);
          return res.status(500).json({ error: 'Registrering misslyckades' });
        }

        // Set session data directly (no regeneration to avoid timing issues)
        req.session.userId = this.lastID;
        req.session.username = sanitizedUsername;

        // Save session before sending response
        req.session.save((err) => {
          if (err) {
            logger.error('Session save error:', err);
            return res.status(500).json({ error: 'Registrering misslyckades' });
          }

          logger.logAuth('User registered', sanitizedUsername, { sessionId: req.sessionID });

          res.json({
            id: this.lastID,
            username: sanitizedUsername,
            email: sanitizedEmail,
            maxImages: MAX_IMAGES_PER_NOTE,
            message: 'Registrering lyckades'
          });
        });
      }
    );
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

app.post('/api/login', loginLimiter, csrfProtection, (req, res) => {
  const { username, password, rememberMe } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Användarnamn och lösenord krävs' });
  }

  const sanitizedUsername = sanitizeInput(username, 50).trim();

  db.get('SELECT * FROM users WHERE username = ?', [sanitizedUsername], async (err, user) => {
    if (err) {
      logger.error('Login error:', err);
      return res.status(500).json({ error: 'Serverfel' });
    }

    if (!user) {
      // Generic error to prevent username enumeration
      return res.status(401).json({ error: 'Ogiltiga inloggningsuppgifter' });
    }

    try {
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Ogiltiga inloggningsuppgifter' });
      }

      // Set session data directly (no regeneration to avoid timing issues)
      req.session.userId = user.id;
      req.session.username = user.username;

      // "Fortsätt vara inloggad": extend session to 90 days when requested,
      // otherwise keep the default 7-day cookie lifetime.
      if (rememberMe) {
        req.session.cookie.maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
      }

      // Save session before sending response
      req.session.save((err) => {
        if (err) {
          logger.error('Session save error:', err);
          return res.status(500).json({ error: 'Inloggning misslyckades' });
        }

        logger.logAuth('User logged in', user.username, { sessionId: req.sessionID });

        // Clear the login attempt counter for this IP on success, so a user
        // who fumbled their password a few times isn't left near the limit.
        loginLimiter.resetKey(req.ip);

        res.json({
          id: user.id,
          username: user.username,
          avatarColor: user.avatar_color || '#1a73e8',
          backgroundTheme: user.background_theme || 'default',
          maxImages: MAX_IMAGES_PER_NOTE,
          message: 'Inloggning lyckades'
        });
      });
    } catch (error) {
      logger.error('Password comparison error:', error);
      res.status(500).json({ error: 'Serverfel' });
    }
  });
});

app.post('/api/logout', requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Logout error:', err);
      return res.status(500).json({ error: 'Utloggning misslyckades' });
    }
    res.clearCookie('sessionId');
    res.json({ message: 'Utloggad' });
  });
});

app.get('/api/me', requireAuth, (req, res) => {
  db.get('SELECT id, username, profile_picture, avatar_color, email, background_theme FROM users WHERE id = ?', [req.session.userId], (err, user) => {
    if (err || !user) {
      return res.status(500).json({ error: 'Kunde inte hämta användarinfo' });
    }
    res.set('Cache-Control', 'private, max-age=300');
    res.json({
      id: user.id,
      username: user.username,
      profilePicture: user.profile_picture,
      avatarColor: user.avatar_color || '#1a73e8',
      backgroundTheme: user.background_theme || 'default',
      email: user.email,
      maxImages: MAX_IMAGES_PER_NOTE
    });
  });
});

// ===== PASSWORD RESET ROUTES =====

// Check if email is configured (for graceful fallback)
app.get('/api/password-reset/check-config', (req, res) => {
  res.json({
    emailConfigured: mailer.isEmailConfigured()
  });
});

// Request password reset
app.post('/api/password-reset/request', passwordResetLimiter, csrfProtection, async (req, res) => {
  const { usernameOrEmail } = req.body;

  if (!usernameOrEmail || !usernameOrEmail.trim()) {
    return res.status(400).json({ error: 'Användarnamn eller e-post krävs' });
  }

  // Check if email is configured
  if (!mailer.isEmailConfigured()) {
    return res.status(503).json({
      error: 'E-post är inte konfigurerat på servern. Kontakta administratören.',
      emailNotConfigured: true
    });
  }

  const sanitizedInput = sanitizeInput(usernameOrEmail, 255).trim();

  // Find user by username or email
  db.get(
    'SELECT id, username, email FROM users WHERE username = ? OR email = ?',
    [sanitizedInput, sanitizedInput.toLowerCase()],
    async (err, user) => {
      if (err) {
        logger.error('Password reset request error:', err);
        // Generic success message to prevent user enumeration
        return res.json({ message: 'Om kontot finns kommer ett återställningsmail att skickas.' });
      }

      if (!user || !user.email) {
        // Generic success message to prevent user enumeration
        return res.json({ message: 'Om kontot finns kommer ett återställningsmail att skickas.' });
      }

      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Save token to database
      db.run(
        'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
        [resetToken, resetTokenExpires.toISOString(), user.id],
        async (err) => {
          if (err) {
            logger.error('Error saving reset token:', err);
            return res.json({ message: 'Om kontot finns kommer ett återställningsmail att skickas.' });
          }

          // Build reset URL
          const protocol = req.secure ? 'https' : 'http';
          const host = req.get('host');
          const resetUrl = `${protocol}://${host}/?reset_token=${resetToken}`;

          // Respond immediately so the user gets instant feedback; the SMTP
          // send (a slow network round-trip to Gmail) runs in the background.
          res.json({ message: 'Om kontot finns kommer ett återställningsmail att skickas.' });

          // Send email asynchronously (fire-and-forget)
          mailer.sendPasswordResetEmail(user.email, user.username, resetToken, resetUrl)
            .then((emailSent) => {
              if (emailSent) {
                logger.info(`Password reset email sent to ${user.email}`);
              } else {
                logger.error('Failed to send password reset email');
              }
            })
            .catch((err) => logger.error('Failed to send password reset email', err));
        }
      );
    }
  );
});

// Verify token and reset password
app.post('/api/password-reset/verify', passwordResetLimiter, csrfProtection, async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token och nytt lösenord krävs' });
  }

  // Validate new password
  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  // Find user with valid token
  db.get(
    'SELECT id, username, reset_token_expires FROM users WHERE reset_token = ?',
    [token],
    async (err, user) => {
      if (err) {
        logger.error('Password reset verify error:', err);
        return res.status(500).json({ error: 'Serverfel' });
      }

      if (!user) {
        return res.status(400).json({ error: 'Ogiltig eller utgången återställningslänk' });
      }

      // Check if token has expired
      const now = new Date();
      const expiresAt = new Date(user.reset_token_expires);
      if (now > expiresAt) {
        // Clear expired token
        db.run('UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [user.id]);
        return res.status(400).json({ error: 'Återställningslänken har gått ut. Begär en ny.' });
      }

      try {
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password and clear reset token
        db.run(
          'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
          [hashedPassword, user.id],
          (err) => {
            if (err) {
              logger.error('Error updating password:', err);
              return res.status(500).json({ error: 'Kunde inte uppdatera lösenordet' });
            }

            logger.info(`Password successfully reset for user: ${user.username}`);
            res.json({ message: 'Lösenordet har återställts. Du kan nu logga in.' });
          }
        );
      } catch (error) {
        logger.error('Password hashing error:', error);
        res.status(500).json({ error: 'Serverfel' });
      }
    }
  );
});

// ===== AVATAR COLOR ROUTES =====

app.post('/api/profile/avatar-color', requireAuth, apiLimiter, csrfProtection, (req, res) => {
  const { avatarColor } = req.body;

  // Validate color is a valid hex color
  if (!avatarColor || !/^#[0-9A-Fa-f]{6}$/.test(avatarColor)) {
    return res.status(400).json({ error: 'Ogiltig färg' });
  }

  db.run('UPDATE users SET avatar_color = ? WHERE id = ?', [avatarColor, req.session.userId], (err) => {
    if (err) {
      logger.error('Avatar color update error:', err);
      return res.status(500).json({ error: 'Kunde inte uppdatera avatarfärg' });
    }

    res.json({
      avatarColor,
      message: 'Avatarfärg uppdaterad'
    });
  });
});

app.post('/api/profile/background-theme', requireAuth, apiLimiter, csrfProtection, (req, res) => {
  const { theme } = req.body;

  // Validate theme is one of the allowed values
  const allowedThemes = ['default', 'warm-beige', 'soft-blue', 'mint-green', 'light-lavender', 'dark'];
  if (!theme || !allowedThemes.includes(theme)) {
    return res.status(400).json({ error: 'Ogiltigt tema' });
  }

  db.run('UPDATE users SET background_theme = ? WHERE id = ?', [theme, req.session.userId], (err) => {
    if (err) {
      logger.error('Background theme update error:', err);
      return res.status(500).json({ error: 'Kunde inte uppdatera bakgrundstema' });
    }

    res.json({
      theme,
      message: 'Bakgrundstema uppdaterat'
    });
  });
});

// Change password
app.post('/api/profile/change-password', requireAuth, apiLimiter, csrfProtection, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Både nuvarande och nytt lösenord krävs' });
  }

  // Validate new password
  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  try {
    // Get user's current password hash
    db.get('SELECT password FROM users WHERE id = ?', [req.session.userId], async (err, user) => {
      if (err) {
        logger.error('Password fetch error:', err);
        return res.status(500).json({ error: 'Kunde inte byta lösenord' });
      }

      if (!user) {
        return res.status(404).json({ error: 'Användare hittades inte' });
      }

      // Verify current password
      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(400).json({ error: 'Nuvarande lösenord är felaktigt' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.session.userId], (err) => {
        if (err) {
          logger.error('Password update error:', err);
          return res.status(500).json({ error: 'Kunde inte uppdatera lösenord' });
        }

        res.json({ message: 'Lösenord uppdaterat' });
      });
    });
  } catch (error) {
    logger.error('Change password error:', error);
    return res.status(500).json({ error: 'Kunde inte byta lösenord' });
  }
});

// ===== NOTE IMAGE ROUTES =====

const noteImageUpload = multer({
  dest: path.join(__dirname, 'data', 'uploads', 'temp'),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Endast bilder är tillåtna'));
    }
  }
});

app.post('/api/notes/image', requireAuth, csrfProtection, apiLimiter, noteImageUpload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Ingen bild uppladdad' });
  }

  try {
    const noteImagesDir = path.join(__dirname, 'data', 'note-images');
    if (!fs.existsSync(noteImagesDir)) {
      fs.mkdirSync(noteImagesDir, { recursive: true });
    }

    // Generate filename
    const filename = `note_${req.session.userId}_${Date.now()}.webp`;
    const outputPath = path.join(noteImagesDir, filename);

    // Get image metadata to check dimensions
    const metadata = await sharp(req.file.path).metadata();

    // Resize if larger than 1200px width, maintain aspect ratio
    // Use high quality settings to keep text readable
    let sharpInstance = sharp(req.file.path);

    if (metadata.width > 1200) {
      sharpInstance = sharpInstance.resize(1200, null, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    await sharpInstance
      .webp({
        quality: 88,  // High quality to keep text readable
        effort: 4     // Lower effort to reduce CPU time during upload
      })
      .toFile(outputPath);

    // Delete temp file
    try { await fsp.unlink(req.file.path); } catch (e) { /* file may already be gone */ }

    res.json({
      filename: filename,
      message: 'Bild uppladdad'
    });
  } catch (error) {
    logger.error('Note image processing error:', error);
    // Clean up temp file if exists
    if (req.file) {
      try { await fsp.unlink(req.file.path); } catch (e) { /* file may already be gone */ }
    }
    res.status(500).json({ error: 'Kunde inte bearbeta bilden' });
  }
});

app.get('/api/notes/image/:filename', (req, res) => {
  const filename = path.basename(req.params.filename); // Prevent path traversal
  const filepath = path.join(__dirname, 'data', 'note-images', filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).send('Bild hittades inte');
  }

  // Set cache headers for better performance
  // Images are immutable (filename is unique hash), cache for 1 year
  res.set({
    'Cache-Control': 'public, max-age=31536000, immutable',
    'ETag': filename // Use filename as ETag since it's content-based
  });

  res.sendFile(filepath);
});

// ===== USER ROUTES (for sharing) =====

app.get('/api/users', requireAuth, apiLimiter, (req, res) => {
  db.all(
    'SELECT id, username, avatar_color FROM users WHERE id != ? ORDER BY username',
    [req.session.userId],
    (err, users) => {
      if (err) {
        logger.error('Get users error:', err);
        return res.status(500).json({ error: 'Kunde inte hämta användare' });
      }
      res.json(users);
    }
  );
});

// ===== NOTES ROUTES =====

// Default page size for infinite scroll
const DEFAULT_PAGE_SIZE = 20;

app.get('/api/notes', requireAuth, apiLimiter, (req, res) => {
  const showArchived = req.query.archived === 'true';
  const showSharedOnly = req.query.shared === 'true';
  const limit = Math.min(parseInt(req.query.limit) || DEFAULT_PAGE_SIZE, 100); // Max 100
  const offset = parseInt(req.query.offset) || 0;
  const sortBy = req.query.sortBy === 'created_at' ? 'created_at' : 'updated_at';

  // Helper to parse JSON fields and prepare notes
  const prepareNotes = (notes, isSharedView = false) => {
    notes.forEach(note => {
      if (note.checklist_items) {
        try {
          note.checklist_items = JSON.parse(note.checklist_items);
        } catch (e) {
          note.checklist_items = [];
        }
      }
      if (note.images) {
        try {
          note.images = JSON.parse(note.images);
        } catch (e) {
          note.images = [];
        }
      }
      if (isSharedView) {
        note.isShared = true;
      } else if (note.isShared !== undefined) {
        note.isShared = !!note.isShared;
      }
    });
    return notes;
  };

  if (showSharedOnly) {
    // Get ONLY notes shared with this user (exclude archived notes)
    // First get total count
    db.get(
      `SELECT COUNT(*) as total FROM notes
       JOIN shares ON notes.id = shares.note_id
       WHERE shares.shared_with_user_id = ? AND notes.is_archived = 0`,
      [req.session.userId],
      (err, countResult) => {
        if (err) {
          logger.error('Count shared notes error:', err);
          return res.status(500).json({ error: 'Kunde inte hämta delade anteckningar' });
        }

        const total = countResult?.total || 0;

        db.all(
          `SELECT
            notes.*,
            users.username as owner_username,
            users.avatar_color as owner_avatar_color,
            shares.permission
           FROM notes
           JOIN shares ON notes.id = shares.note_id
           JOIN users ON notes.user_id = users.id
           WHERE shares.shared_with_user_id = ?
             AND notes.is_archived = 0
           ORDER BY notes.is_pinned DESC, notes.${sortBy} DESC
           LIMIT ? OFFSET ?`,
          [req.session.userId, limit, offset],
          (err, notes) => {
            if (err) {
              logger.error('Get shared notes error:', err);
              return res.status(500).json({ error: 'Kunde inte hämta delade anteckningar' });
            }

            prepareNotes(notes, true);
            res.json({
              notes,
              hasMore: offset + notes.length < total,
              total
            });
          }
        );
      }
    );
  } else if (showArchived) {
    // Get user's own archived notes only
    db.get(
      `SELECT COUNT(*) as total FROM notes WHERE user_id = ? AND is_archived = 1`,
      [req.session.userId],
      (err, countResult) => {
        if (err) {
          logger.error('Count archived notes error:', err);
          return res.status(500).json({ error: 'Kunde inte hämta arkiverade anteckningar' });
        }

        const total = countResult?.total || 0;

        db.all(
          `SELECT notes.*,
            (SELECT COUNT(*) FROM shares WHERE shares.note_id = notes.id) as share_count
           FROM notes
           WHERE user_id = ? AND is_archived = 1
           ORDER BY is_pinned DESC, ${sortBy} DESC
           LIMIT ? OFFSET ?`,
          [req.session.userId, limit, offset],
          (err, notes) => {
            if (err) {
              logger.error('Get archived notes error:', err);
              return res.status(500).json({ error: 'Kunde inte hämta arkiverade anteckningar' });
            }

            prepareNotes(notes);
            res.json({
              notes,
              hasMore: offset + notes.length < total,
              total
            });
          }
        );
      }
    );
  } else {
    // Default: Get user's own notes AND notes shared with them using UNION
    // First get total count from both sources
    db.get(
      `SELECT
        (SELECT COUNT(*) FROM notes WHERE user_id = ? AND is_archived = 0) +
        (SELECT COUNT(*) FROM notes
         JOIN shares ON notes.id = shares.note_id
         WHERE shares.shared_with_user_id = ? AND notes.is_archived = 0) as total`,
      [req.session.userId, req.session.userId],
      (err, countResult) => {
        if (err) {
          logger.error('Count all notes error:', err);
          return res.status(500).json({ error: 'Kunde inte hämta anteckningar' });
        }

        const total = countResult?.total || 0;

        // Use UNION to combine own and shared notes with pagination
        db.all(
          `SELECT * FROM (
            SELECT
              notes.id, notes.user_id, notes.title, notes.content, notes.color,
              notes.is_checklist, notes.checklist_items, notes.images,
              notes.is_archived, notes.is_pinned, notes.created_at, notes.updated_at,
              (SELECT COUNT(*) FROM shares WHERE shares.note_id = notes.id) as share_count,
              NULL as owner_username,
              NULL as owner_avatar_color,
              NULL as permission,
              0 as isShared
            FROM notes
            WHERE user_id = ? AND is_archived = 0

            UNION ALL

            SELECT
              notes.id, notes.user_id, notes.title, notes.content, notes.color,
              notes.is_checklist, notes.checklist_items, notes.images,
              notes.is_archived, notes.is_pinned, notes.created_at, notes.updated_at,
              0 as share_count,
              users.username as owner_username,
              users.avatar_color as owner_avatar_color,
              shares.permission,
              1 as isShared
            FROM notes
            JOIN shares ON notes.id = shares.note_id
            JOIN users ON notes.user_id = users.id
            WHERE shares.shared_with_user_id = ? AND notes.is_archived = 0
          )
          ORDER BY is_pinned DESC, ${sortBy} DESC
          LIMIT ? OFFSET ?`,
          [req.session.userId, req.session.userId, limit, offset],
          (err, notes) => {
            if (err) {
              logger.error('Get all notes error:', err);
              return res.status(500).json({ error: 'Kunde inte hämta anteckningar' });
            }

            prepareNotes(notes);
            res.json({
              notes,
              hasMore: offset + notes.length < total,
              total
            });
          }
        );
      }
    );
  }
});

app.post('/api/notes', requireAuth, apiLimiter, csrfProtection, async (req, res) => {
  const { title, content, color, is_checklist, checklist_items, images } = req.body;

  // Sanitize and validate
  const sanitizedTitle = sanitizeInput(title, 500);
  const sanitizedContent = sanitizeInput(content, 50000);
  const validatedColor = validateColor(color);

  let checklistData = null;
  if (is_checklist && checklist_items && Array.isArray(checklist_items)) {
    // Validate and sanitize checklist items
    const sanitizedItems = checklist_items
      .slice(0, 100) // Max 100 items
      .map(item => {
        const entry = {
          text: sanitizeInput(item.text, 1000),
          checked: !!item.checked
        };
        const conf = parseInt(item.confidence, 10);
        if (Number.isInteger(conf) && conf >= 1 && conf <= 10) {
          entry.confidence = conf;
        }
        return entry;
      });
    checklistData = JSON.stringify(sanitizedItems);
  }

  // Validate and sanitize images array
  let imagesData = null;
  let duplicatesSkipped = 0;
  if (images && Array.isArray(images)) {
    const sanitizedImages = images
      .slice(0, MAX_IMAGES_PER_NOTE)
      .map(img => path.basename(img))
      .filter(img => /^note_\d+_\d+\.webp$/.test(img));

    if (sanitizedImages.length > 0) {
      const { kept, duplicates } = await dedupImagesByHash(sanitizedImages);
      if (duplicates.length > 0) {
        deleteNoteImageFiles(duplicates);
        duplicatesSkipped = duplicates.length;
        logger.info(`Dedup: removed ${duplicates.length} duplicate image(s) on note create (user=${req.session.userId})`);
      }
      imagesData = kept.length > 0 ? JSON.stringify(kept) : null;
    }
  }

  db.run(
    `INSERT INTO notes (user_id, title, content, color, is_checklist, checklist_items, images)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [req.session.userId, sanitizedTitle, sanitizedContent, validatedColor, is_checklist ? 1 : 0, checklistData, imagesData],
    function(err) {
      if (err) {
        logger.error('Create note error:', err);
        return res.status(500).json({ error: 'Kunde inte skapa anteckning' });
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

        if (note && note.images) {
          try {
            note.images = JSON.parse(note.images);
          } catch (e) {
            note.images = [];
          }
        }

        broadcastToUser(req.session.userId, {
          type: 'note_created',
          note
        });

        res.json({ ...note, duplicatesSkipped });
        maybeTriggerAiCommand(noteId, req.session.userId);
      });
    }
  );
});

app.put('/api/notes/:id', requireAuth, apiLimiter, csrfProtection, (req, res) => {
  const { id } = req.params;
  const { title, content, color, is_checklist, checklist_items, is_archived, images } = req.body;

  // Check permission (owner or shared with edit permission)
  db.get(
    `SELECT notes.*, shares.permission
     FROM notes
     LEFT JOIN shares ON notes.id = shares.note_id AND shares.shared_with_user_id = ?
     WHERE notes.id = ? AND (notes.user_id = ? OR shares.permission = 'edit')`,
    [req.session.userId, id, req.session.userId],
    async (err, note) => {
      if (err) {
        logger.error('Check note permission error:', err);
        return res.status(500).json({ error: 'Kunde inte uppdatera anteckning' });
      }

      if (!note) {
        return res.status(404).json({ error: 'Anteckning hittades inte eller du saknar rättigheter' });
      }

      // Sanitize and validate
      const sanitizedTitle = sanitizeInput(title, 500);
      const sanitizedContent = sanitizeInput(content, 50000);
      const validatedColor = validateColor(color);

      let checklistData = null;
      if (is_checklist && checklist_items && Array.isArray(checklist_items)) {
        const sanitizedItems = checklist_items
          .slice(0, 100)
          .map(item => {
            const entry = {
              text: sanitizeInput(item.text, 1000),
              checked: !!item.checked
            };
            const conf = parseInt(item.confidence, 10);
            if (Number.isInteger(conf) && conf >= 1 && conf <= 10) {
              entry.confidence = conf;
            }
            return entry;
          });
        checklistData = JSON.stringify(sanitizedItems);
      }

      // Validate and sanitize images array
      let newImages = [];
      let duplicatesSkipped = 0;
      if (images && Array.isArray(images)) {
        const rawImages = images
          .slice(0, MAX_IMAGES_PER_NOTE)
          .map(img => path.basename(img))
          .filter(img => /^note_\d+_\d+\.webp$/.test(img));

        if (rawImages.length > 0) {
          const { kept, duplicates } = await dedupImagesByHash(rawImages);
          if (duplicates.length > 0) {
            deleteNoteImageFiles(duplicates);
            duplicatesSkipped = duplicates.length;
            logger.info(`Dedup: removed ${duplicates.length} duplicate image(s) on note update (user=${req.session.userId} note=${id})`);
          }
          newImages = kept;
        }
      }

      const imagesData = newImages.length > 0 ? JSON.stringify(newImages) : null;

      // Find and delete removed images
      let currentImages = [];
      if (note.images) {
        try {
          currentImages = JSON.parse(note.images);
        } catch (e) {
          currentImages = [];
        }
      }
      const removedImages = currentImages.filter(img => !newImages.includes(img));
      if (removedImages.length > 0) {
        deleteNoteImageFiles(removedImages);
      }

      db.run(
        `UPDATE notes
         SET title = ?, content = ?, color = ?, is_checklist = ?, checklist_items = ?,
             is_archived = ?, images = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          sanitizedTitle,
          sanitizedContent,
          validatedColor,
          is_checklist ? 1 : 0,
          checklistData,
          is_archived ? 1 : 0,
          imagesData,
          id
        ],
        function(err) {
          if (err) {
            logger.error('Update note error:', err);
            return res.status(500).json({ error: 'Kunde inte uppdatera anteckning' });
          }

          db.get('SELECT * FROM notes WHERE id = ?', [id], (err, updatedNote) => {
            if (updatedNote && updatedNote.checklist_items) {
              try {
                updatedNote.checklist_items = JSON.parse(updatedNote.checklist_items);
              } catch (e) {
                updatedNote.checklist_items = [];
              }
            }

            if (updatedNote && updatedNote.images) {
              try {
                updatedNote.images = JSON.parse(updatedNote.images);
              } catch (e) {
                updatedNote.images = [];
              }
            }

            // Broadcast to owner
            broadcastToUser(note.user_id, {
              type: 'note_updated',
              note: updatedNote
            });

            // Broadcast to all users this note is shared with
            db.all('SELECT shared_with_user_id FROM shares WHERE note_id = ?', [id], (err, shares) => {
              if (!err && shares) {
                shares.forEach(share => {
                  broadcastToUser(share.shared_with_user_id, {
                    type: 'note_updated',
                    note: updatedNote
                  });
                });
              }
            });

            res.json({ ...updatedNote, duplicatesSkipped });
            maybeTriggerAiCommand(id, req.session.userId);
          });
        }
      );
    }
  );
});

app.delete('/api/notes/:id', requireAuth, apiLimiter, csrfProtection, (req, res) => {
  const { id } = req.params;

  // Only owner can delete - also fetch images for cleanup
  db.get('SELECT user_id, images FROM notes WHERE id = ?', [id], (err, note) => {
    if (err) {
      logger.error('Check note owner error:', err);
      return res.status(500).json({ error: 'Kunde inte radera anteckning' });
    }

    if (!note || note.user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Anteckning hittades inte eller du saknar rättigheter' });
    }

    // Parse images for later cleanup
    let noteImages = [];
    if (note.images) {
      try {
        noteImages = JSON.parse(note.images);
      } catch (e) {
        noteImages = [];
      }
    }

    // Get all users this note is shared with before deleting
    db.all('SELECT shared_with_user_id FROM shares WHERE note_id = ?', [id], (err, shares) => {
      const sharedUserIds = shares ? shares.map(s => s.shared_with_user_id) : [];

      db.run('DELETE FROM notes WHERE id = ?', [id], function(err) {
        if (err) {
          logger.error('Delete note error:', err);
          return res.status(500).json({ error: 'Kunde inte radera anteckning' });
        }

        // Delete associated image files
        if (noteImages.length > 0) {
          deleteNoteImageFiles(noteImages);
        }

        // Broadcast to owner (parseInt so the id type matches the numeric note
        // ids the clients hold — otherwise their array filter never removes it).
        const deletedNoteId = parseInt(id);
        broadcastToUser(req.session.userId, {
          type: 'note_deleted',
          noteId: deletedNoteId
        });

        // Broadcast to all users it was shared with
        sharedUserIds.forEach(userId => {
          broadcastToUser(userId, {
            type: 'note_deleted',
            noteId: deletedNoteId
          });
        });

        res.json({ message: 'Anteckning raderad' });
      });
    });
  });
});

// Pin/unpin note (toggle)
app.post('/api/notes/:id/pin', requireAuth, apiLimiter, csrfProtection, (req, res) => {
  const { id } = req.params;

  // Only owner can pin/unpin
  db.get('SELECT id, user_id, is_pinned FROM notes WHERE id = ?', [id], (err, note) => {
    if (err) {
      logger.error('Check note owner error:', err);
      return res.status(500).json({ error: 'Kunde inte fästa anteckning' });
    }

    if (!note || note.user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Anteckning hittades inte eller du saknar rättigheter' });
    }

    // Toggle is_pinned
    const newPinnedState = note.is_pinned ? 0 : 1;

    db.run('UPDATE notes SET is_pinned = ? WHERE id = ?', [newPinnedState, id], function(err) {
      if (err) {
        logger.error('Pin note error:', err);
        return res.status(500).json({ error: 'Kunde inte fästa anteckning' });
      }

      res.json({ is_pinned: newPinnedState });
    });
  });
});

// ===== SHARING ROUTES =====

app.post('/api/notes/:id/share', requireAuth, apiLimiter, csrfProtection, (req, res) => {
  const { id } = req.params;
  const { userId, permission } = req.body;

  // Validate permission
  const validPermissions = ['view', 'edit'];
  const validatedPermission = validPermissions.includes(permission) ? permission : 'view';

  // Check that user owns the note
  db.get('SELECT * FROM notes WHERE id = ? AND user_id = ?', [id, req.session.userId], (err, note) => {
    if (err || !note) {
      return res.status(404).json({ error: 'Anteckning hittades inte' });
    }

    // Can't share with yourself
    if (userId === req.session.userId) {
      return res.status(400).json({ error: 'Du kan inte dela med dig själv' });
    }

    // Check that target user exists
    db.get('SELECT id, username FROM users WHERE id = ?', [userId], (err, targetUser) => {
      if (err || !targetUser) {
        return res.status(404).json({ error: 'Användare hittades inte' });
      }

      // Check if share already exists (to differentiate between new share and permission update)
      db.get(
        'SELECT * FROM shares WHERE note_id = ? AND shared_with_user_id = ?',
        [id, userId],
        (err, existingShare) => {
          if (err) {
            logger.error('Check existing share error:', err);
            return res.status(500).json({ error: 'Kunde inte kontrollera befintlig delning' });
          }

          const isNewShare = !existingShare;
          const isPermissionChange = existingShare && existingShare.permission !== validatedPermission;

          // Create or update share
          db.run(
            `INSERT OR REPLACE INTO shares (note_id, shared_by_user_id, shared_with_user_id, permission)
             VALUES (?, ?, ?, ?)`,
            [id, req.session.userId, userId, validatedPermission],
            function(err) {
              if (err) {
                logger.error('Share note error:', err);
                return res.status(500).json({ error: 'Kunde inte dela anteckning' });
              }

              // Parse note data for WebSocket
              const noteData = { ...note };
              if (noteData.checklist_items) {
                try {
                  noteData.checklist_items = JSON.parse(noteData.checklist_items);
                } catch (e) {
                  noteData.checklist_items = [];
                }
              }
              if (noteData.images) {
                try {
                  noteData.images = JSON.parse(noteData.images);
                } catch (e) {
                  noteData.images = [];
                }
              }

              if (isNewShare) {
                // Notify target user about new share
                broadcastToUser(userId, {
                  type: 'note_shared',
                  note: {
                    ...noteData,
                    owner_username: req.session.username,
                    owner_avatar_color: req.session.avatarColor || '#1a73e8',
                    permission: validatedPermission,
                    isShared: true
                  }
                });

                // Notify owner that share count changed
                broadcastToUser(req.session.userId, {
                  type: 'share_count_updated',
                  noteId: parseInt(id)
                });
              } else if (isPermissionChange) {
                // Notify target user about permission change
                broadcastToUser(userId, {
                  type: 'permission_changed',
                  noteId: parseInt(id),
                  permission: validatedPermission
                });
              }

              res.json({
                message: isNewShare ? `Delad med ${targetUser.username}` : 'Behörighet uppdaterad',
                sharedWith: targetUser,
                isNew: isNewShare
              });
            }
          );
        }
      );
    });
  });
});

app.delete('/api/notes/:noteId/share/:userId', requireAuth, apiLimiter, csrfProtection, (req, res) => {
  const { noteId, userId } = req.params;

  // Check that user owns the note
  db.get('SELECT * FROM notes WHERE id = ? AND user_id = ?', [noteId, req.session.userId], (err, note) => {
    if (err || !note) {
      return res.status(404).json({ error: 'Anteckning hittades inte' });
    }

    db.run(
      'DELETE FROM shares WHERE note_id = ? AND shared_with_user_id = ?',
      [noteId, userId],
      function(err) {
        if (err) {
          logger.error('Unshare note error:', err);
          return res.status(500).json({ error: 'Kunde inte ta bort delning' });
        }

        // Notify target user that share was removed
        broadcastToUser(parseInt(userId), {
          type: 'note_unshared',
          noteId: parseInt(noteId)
        });

        // Notify owner that share count changed
        broadcastToUser(req.session.userId, {
          type: 'share_count_updated',
          noteId: parseInt(noteId)
        });

        res.json({ message: 'Delning borttagen' });
      }
    );
  });
});

// Dismiss a share (for recipient to remove from their view)
app.delete('/api/notes/:noteId/dismiss-share', requireAuth, apiLimiter, csrfProtection, (req, res) => {
  const { noteId } = req.params;

  // Check that this note is actually shared with the user
  db.get(
    'SELECT * FROM shares WHERE note_id = ? AND shared_with_user_id = ?',
    [noteId, req.session.userId],
    (err, share) => {
      if (err || !share) {
        return res.status(404).json({ error: 'Delning hittades inte' });
      }

      db.run(
        'DELETE FROM shares WHERE note_id = ? AND shared_with_user_id = ?',
        [noteId, req.session.userId],
        function(err) {
          if (err) {
            logger.error('Dismiss share error:', err);
            return res.status(500).json({ error: 'Kunde inte ta bort delning' });
          }

          // Notify the owner that share count changed
          broadcastToUser(share.shared_by_user_id, {
            type: 'share_count_updated',
            noteId: parseInt(noteId)
          });

          res.json({ message: 'Delning borttagen från din vy' });
        }
      );
    }
  );
});

app.get('/api/notes/:id/shares', requireAuth, apiLimiter, (req, res) => {
  const { id } = req.params;

  // Check that user owns the note
  db.get('SELECT * FROM notes WHERE id = ? AND user_id = ?', [id, req.session.userId], (err, note) => {
    if (err || !note) {
      return res.status(404).json({ error: 'Anteckning hittades inte' });
    }

    db.all(
      `SELECT shares.*, users.username, users.avatar_color
       FROM shares
       JOIN users ON shares.shared_with_user_id = users.id
       WHERE shares.note_id = ?`,
      [id],
      (err, shares) => {
        if (err) {
          logger.error('Get shares error:', err);
          return res.status(500).json({ error: 'Kunde inte hämta delningar' });
        }
        res.json(shares);
      }
    );
  });
});

// ===== IMPORT ROUTES =====

const upload = multer({
  dest: path.join(__dirname, 'data', 'uploads'),
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max
  },
  fileFilter: (req, file, cb) => {
    // Server-side validation
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Endast ZIP-filer är tillåtna'));
    }
  }
});

const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(dataDir, 'uploads');
const mediaDir = path.join(dataDir, 'note-images'); // Use same directory as regular note images
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

app.post('/api/import/keep', requireAuth, importLimiter, upload.single('zipfile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Ingen fil uppladdad' });
  }

  const zipPath = req.file.path;
  const extractPath = path.join(uploadsDir, `extract_${Date.now()}_${req.session.userId}`);

  try {
    logger.info('Extracting zip file...');
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);

    logger.info('Parsing Google Keep data...');
    const parser = new KeepImportParser(extractPath, req.session.userId, mediaDir);
    const { notes, stats } = await parser.parse();

    logger.info(`Importing ${notes.length} notes...`);
    let imported = 0;
    let failed = 0;

    for (const note of notes) {
      try {
        await importNote(note);
        imported++;
      } catch (error) {
        failed++;
        logger.error('Import note error:', error);
        stats.errors.push({
          note: note.title || note.source_file,
          error: error.message
        });
      }
    }

    // Clean up
    try { await fsp.unlink(zipPath); } catch (e) { /* file may already be gone */ }
    fs.rmSync(extractPath, { recursive: true, force: true });

    res.json({
      success: true,
      imported,
      failed,
      stats
    });

  } catch (error) {
    logger.error('Import error:', error);

    // Clean up on error
    try {
      try { await fsp.unlink(zipPath); } catch (e) { /* file may already be gone */ }
      if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });
    } catch (cleanupError) {
      logger.error('Cleanup error:', cleanupError);
    }

    res.status(500).json({
      error: 'Import misslyckades',
      message: 'Ett fel uppstod vid import. Kontrollera att filen är en giltig Google Takeout export.'
    });
  }
});

function importNote(note) {
  return new Promise((resolve, reject) => {
    const checklistData = note.is_checklist && note.checklist_items
      ? JSON.stringify(note.checklist_items)
      : null;

    // Convert attachments to images array (just the filenames)
    const imagesData = note.attachments && note.attachments.length > 0
      ? JSON.stringify(note.attachments.map(att => att.stored_filename))
      : null;

    db.run(
      `INSERT INTO notes (user_id, title, content, color, is_checklist, checklist_items, is_archived, is_pinned, images, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        note.user_id,
        note.title,
        note.content,
        note.color,
        note.is_checklist,
        checklistData,
        note.is_archived,
        note.is_pinned ? 1 : 0,
        imagesData,
        note.created_at,
        note.updated_at
      ],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

// ===== EXPORT ENDPOINT =====

app.get('/api/backup/export', requireAuth, async (req, res) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const outputFilename = `kreep-backup-${timestamp}.zip`;
  const outputPath = path.join(uploadsDir, outputFilename);

  try {
    logger.info('Generating backup for user:', req.session.userId);

    const generator = new BackupGenerator(req.session.userId, db, dataDir, outputPath);
    const result = await generator.generate();

    if (!result.success) {
      throw new Error('Backup generation failed');
    }

    logger.info('Backup generated:', result.stats);

    // Send file
    res.download(outputPath, outputFilename, async (err) => {
      // Clean up file after sending
      try {
        await fsp.unlink(outputPath);
      } catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT') {
          logger.error('Failed to cleanup backup file:', cleanupError);
        }
      }

      if (err) {
        logger.error('Error sending backup:', err);
      }
    });

  } catch (error) {
    logger.error('Export error:', error);

    // Clean up on error
    try {
      await fsp.unlink(outputPath);
    } catch (cleanupError) {
      if (cleanupError.code !== 'ENOENT') {
        logger.error('Cleanup error:', cleanupError);
      }
    }

    res.status(500).json({
      error: 'Export misslyckades',
      message: 'Ett fel uppstod vid export av backup.'
    });
  }
});

// ===== ERROR HANDLING =====

app.use((err, req, res, next) => {
  logger.error('Error:', err);

  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Ogiltig förfrågan. Ladda om sidan och försök igen.' });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Filen är för stor' });
    }
    return res.status(400).json({ error: 'Filuppladdning misslyckades' });
  }

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Ett fel uppstod'
    : err.message;

  res.status(500).json({ error: message });
});

// Start server
server.listen(PORT, () => {
  logger.info(`Keep Clone running on http://localhost:${PORT}`);
  logger.info(`HTTPS mode: ${isHttps ? 'ENABLED (HSTS active)' : 'DISABLED (HTTP mode)'}`);
  logger.info('Security features enabled:');
  logger.info('  - Helmet security headers');
  logger.info('  - CSRF protection');
  logger.info('  - Rate limiting');
  logger.info('  - Secure WebSocket authentication');
  logger.info('  - Input sanitization');
  logger.info('  - Path traversal protection');
  if (!process.env.SESSION_SECRET) {
    logger.warn('⚠️  Using default session secret - Set SESSION_SECRET environment variable for production!');
  }
});
