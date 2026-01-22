const express = require('express');
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
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const { JSDOM } = require('jsdom');
const DOMPurify = require('dompurify');
const sharp = require('sharp');

const db = require('./database');
const KeepImportParser = require('./import-parser');
const mailer = require('./mailer');
const crypto = require('crypto');

// Initialize DOMPurify with jsdom
const window = new JSDOM('').window;
const purify = DOMPurify(window);

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// ===== SECURITY MIDDLEWARE =====

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
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
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiters
// Development-friendly: More lenient limits for testing
const isDevelopment = process.env.NODE_ENV !== 'production';

const loginLimiter = rateLimit({
  windowMs: isDevelopment ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 min dev, 15 min prod
  max: isDevelopment ? 50 : 5, // 50 attempts dev, 5 prod
  message: 'För många inloggningsförsök. Försök igen om 15 minuter.',
  standardHeaders: true,
  legacyHeaders: false
});

const registerLimiter = rateLimit({
  windowMs: isDevelopment ? 1 * 60 * 1000 : 60 * 60 * 1000, // 1 min dev, 1 hour prod
  max: isDevelopment ? 20 : 3, // 20 registrations dev, 3 prod
  message: 'För många registreringar. Försök igen senare.',
  standardHeaders: true,
  legacyHeaders: false
});

const importLimiter = rateLimit({
  windowMs: isDevelopment ? 1 * 60 * 1000 : 60 * 60 * 1000, // 1 min dev, 1 hour prod
  max: isDevelopment ? 50 : 10, // 50 imports dev, 10 prod
  message: 'För många importer. Försök igen senare.',
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isDevelopment ? 500 : 100, // 500 requests dev, 100 prod
  message: 'För många förfrågningar. Var god vänta.',
  standardHeaders: true,
  legacyHeaders: false
});

const passwordResetLimiter = rateLimit({
  windowMs: isDevelopment ? 1 * 60 * 1000 : 60 * 60 * 1000, // 1 min dev, 1 hour prod
  max: isDevelopment ? 20 : 3, // 20 attempts dev, 3 prod
  message: 'För många återställningsförfrågningar. Försök igen senare.',
  standardHeaders: true,
  legacyHeaders: false
});

// Body parsing and cookies
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session configuration (SECURE) with persistent SQLite store
const sessionConfig = {
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: './data',
    table: 'sessions',
    concurrentDB: true // Enable WAL mode for better concurrency
  }),
  secret: process.env.SESSION_SECRET || (() => {
    console.error('WARNING: Using default session secret! Set SESSION_SECRET environment variable!');
    return 'keep-clone-secret-change-in-production';
  })(),
  resave: false, // SQLite store handles persistence - don't save on every request
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent JavaScript access
    sameSite: 'lax', // Balance between security and compatibility
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  name: 'sessionId' // Don't use default name
};

app.use(session(sessionConfig));

// CSRF protection (except for specific routes)
const csrfProtection = csrf({ cookie: true });

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

// Input validation helper
function validatePassword(password) {
  if (!password || password.length < 12) {
    return 'Lösenordet måste vara minst 12 tecken långt';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Lösenordet måste innehålla minst en stor bokstav';
  }
  if (!/[a-z]/.test(password)) {
    return 'Lösenordet måste innehålla minst en liten bokstav';
  }
  if (!/[0-9]/.test(password)) {
    return 'Lösenordet måste innehålla minst en siffra';
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

const clients = new Map(); // userId -> WebSocket connection

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
      console.log('WebSocket connection rejected: No valid session');
      ws.close(1008, 'Authentication required');
      return;
    }

    const userId = req.session.userId;
    console.log(`WebSocket authenticated for user ${userId}`);

    // Store connection
    clients.set(userId, ws);

    ws.on('close', () => {
      console.log(`WebSocket closed for user ${userId}`);
      clients.delete(userId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for user ${userId}:`, error);
      clients.delete(userId);
    });
  });
});

function broadcastToUser(userId, data) {
  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    try {
      client.send(JSON.stringify(data));
    } catch (error) {
      console.error('Error broadcasting to user:', error);
    }
  }
}

function broadcastToUsers(userIds, data) {
  userIds.forEach(userId => broadcastToUser(userId, data));
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
          console.error('Registration error:', err);
          return res.status(500).json({ error: 'Registrering misslyckades' });
        }

        // Regenerate session to prevent fixation
        req.session.regenerate((err) => {
          if (err) {
            console.error('Session regeneration error:', err);
            return res.status(500).json({ error: 'Registrering misslyckades' });
          }

          req.session.userId = this.lastID;
          req.session.username = sanitizedUsername;

          // Save session before sending response
          req.session.save((err) => {
            if (err) {
              console.error('Session save error:', err);
              return res.status(500).json({ error: 'Registrering misslyckades' });
            }

            res.json({
              id: this.lastID,
              username: sanitizedUsername,
              email: sanitizedEmail,
              message: 'Registrering lyckades'
            });
          });
        });
      }
    );
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Serverfel' });
  }
});

app.post('/api/login', loginLimiter, csrfProtection, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Användarnamn och lösenord krävs' });
  }

  const sanitizedUsername = sanitizeInput(username, 50).trim();

  db.get('SELECT * FROM users WHERE username = ?', [sanitizedUsername], async (err, user) => {
    if (err) {
      console.error('Login error:', err);
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

      // Regenerate session to prevent fixation
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration error:', err);
          return res.status(500).json({ error: 'Inloggning misslyckades' });
        }

        req.session.userId = user.id;
        req.session.username = user.username;

        // Save session before sending response
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            return res.status(500).json({ error: 'Inloggning misslyckades' });
          }

          res.json({
            id: user.id,
            username: user.username,
            avatarColor: user.avatar_color || '#1a73e8',
            message: 'Inloggning lyckades'
          });
        });
      });
    } catch (error) {
      console.error('Password comparison error:', error);
      res.status(500).json({ error: 'Serverfel' });
    }
  });
});

app.post('/api/logout', requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Utloggning misslyckades' });
    }
    res.clearCookie('sessionId');
    res.json({ message: 'Utloggad' });
  });
});

app.get('/api/me', requireAuth, (req, res) => {
  db.get('SELECT id, username, profile_picture, avatar_color, email FROM users WHERE id = ?', [req.session.userId], (err, user) => {
    if (err || !user) {
      return res.status(500).json({ error: 'Kunde inte hämta användarinfo' });
    }
    res.json({
      id: user.id,
      username: user.username,
      profilePicture: user.profile_picture,
      avatarColor: user.avatar_color || '#1a73e8',
      email: user.email
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
        console.error('Password reset request error:', err);
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
            console.error('Error saving reset token:', err);
            return res.json({ message: 'Om kontot finns kommer ett återställningsmail att skickas.' });
          }

          // Build reset URL
          const protocol = req.secure ? 'https' : 'http';
          const host = req.get('host');
          const resetUrl = `${protocol}://${host}/?reset_token=${resetToken}`;

          // Send email
          const emailSent = await mailer.sendPasswordResetEmail(
            user.email,
            user.username,
            resetToken,
            resetUrl
          );

          if (emailSent) {
            console.log(`Password reset email sent to ${user.email}`);
          } else {
            console.error('Failed to send password reset email');
          }

          // Always return generic success message
          res.json({ message: 'Om kontot finns kommer ett återställningsmail att skickas.' });
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
        console.error('Password reset verify error:', err);
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
              console.error('Error updating password:', err);
              return res.status(500).json({ error: 'Kunde inte uppdatera lösenordet' });
            }

            console.log(`Password successfully reset for user: ${user.username}`);
            res.json({ message: 'Lösenordet har återställts. Du kan nu logga in.' });
          }
        );
      } catch (error) {
        console.error('Password hashing error:', error);
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
      console.error('Avatar color update error:', err);
      return res.status(500).json({ error: 'Kunde inte uppdatera avatarfärg' });
    }

    res.json({
      avatarColor,
      message: 'Avatarfärg uppdaterad'
    });
  });
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
        effort: 6     // More effort for better compression
      })
      .toFile(outputPath);

    // Delete temp file
    fs.unlinkSync(req.file.path);

    res.json({
      filename: filename,
      message: 'Bild uppladdad'
    });
  } catch (error) {
    console.error('Note image processing error:', error);
    // Clean up temp file if exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
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

  res.sendFile(filepath);
});

// ===== USER ROUTES (for sharing) =====

app.get('/api/users', requireAuth, apiLimiter, (req, res) => {
  db.all(
    'SELECT id, username, avatar_color FROM users WHERE id != ? ORDER BY username',
    [req.session.userId],
    (err, users) => {
      if (err) {
        console.error('Get users error:', err);
        return res.status(500).json({ error: 'Kunde inte hämta användare' });
      }
      res.json(users);
    }
  );
});

// ===== NOTES ROUTES =====

app.get('/api/notes', requireAuth, apiLimiter, (req, res) => {
  const showArchived = req.query.archived === 'true';
  const showShared = req.query.shared === 'true';

  if (showShared) {
    // Get notes shared with this user
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
       ORDER BY notes.is_pinned DESC, notes.updated_at DESC`,
      [req.session.userId],
      (err, notes) => {
        if (err) {
          console.error('Get shared notes error:', err);
          return res.status(500).json({ error: 'Kunde inte hämta delade anteckningar' });
        }

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
          note.isShared = true;
        });

        res.json(notes);
      }
    );
  } else {
    // Get user's own notes
    db.all(
      `SELECT notes.*,
        (SELECT COUNT(*) FROM shares WHERE shares.note_id = notes.id) as share_count
       FROM notes
       WHERE user_id = ? AND is_archived = ?
       ORDER BY is_pinned DESC, updated_at DESC`,
      [req.session.userId, showArchived ? 1 : 0],
      (err, notes) => {
        if (err) {
          console.error('Get notes error:', err);
          return res.status(500).json({ error: 'Kunde inte hämta anteckningar' });
        }

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
        });

        res.json(notes);
      }
    );
  }
});

app.post('/api/notes', requireAuth, apiLimiter, csrfProtection, (req, res) => {
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
      .map(item => ({
        text: sanitizeInput(item.text, 1000),
        checked: !!item.checked
      }));
    checklistData = JSON.stringify(sanitizedItems);
  }

  // Validate and sanitize images array
  let imagesData = null;
  if (images && Array.isArray(images)) {
    // Only keep filenames, max 10 images, sanitize filenames
    const sanitizedImages = images
      .slice(0, 10)
      .map(img => path.basename(img))
      .filter(img => /^note_\d+_\d+\.webp$/.test(img));
    if (sanitizedImages.length > 0) {
      imagesData = JSON.stringify(sanitizedImages);
    }
  }

  db.run(
    `INSERT INTO notes (user_id, title, content, color, is_checklist, checklist_items, images)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [req.session.userId, sanitizedTitle, sanitizedContent, validatedColor, is_checklist ? 1 : 0, checklistData, imagesData],
    function(err) {
      if (err) {
        console.error('Create note error:', err);
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

        res.json(note);
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
    (err, note) => {
      if (err) {
        console.error('Check note permission error:', err);
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
          .map(item => ({
            text: sanitizeInput(item.text, 1000),
            checked: !!item.checked
          }));
        checklistData = JSON.stringify(sanitizedItems);
      }

      // Validate and sanitize images array
      let imagesData = null;
      if (images && Array.isArray(images)) {
        const sanitizedImages = images
          .slice(0, 10)
          .map(img => path.basename(img))
          .filter(img => /^note_\d+_\d+\.webp$/.test(img));
        if (sanitizedImages.length > 0) {
          imagesData = JSON.stringify(sanitizedImages);
        }
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
            console.error('Update note error:', err);
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

            res.json(updatedNote);
          });
        }
      );
    }
  );
});

app.delete('/api/notes/:id', requireAuth, apiLimiter, csrfProtection, (req, res) => {
  const { id } = req.params;

  // Only owner can delete
  db.get('SELECT user_id FROM notes WHERE id = ?', [id], (err, note) => {
    if (err) {
      console.error('Check note owner error:', err);
      return res.status(500).json({ error: 'Kunde inte radera anteckning' });
    }

    if (!note || note.user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Anteckning hittades inte eller du saknar rättigheter' });
    }

    // Get all users this note is shared with before deleting
    db.all('SELECT shared_with_user_id FROM shares WHERE note_id = ?', [id], (err, shares) => {
      const sharedUserIds = shares ? shares.map(s => s.shared_with_user_id) : [];

      db.run('DELETE FROM notes WHERE id = ?', [id], function(err) {
        if (err) {
          console.error('Delete note error:', err);
          return res.status(500).json({ error: 'Kunde inte radera anteckning' });
        }

        // Broadcast to owner
        broadcastToUser(req.session.userId, {
          type: 'note_deleted',
          noteId: id
        });

        // Broadcast to all users it was shared with
        sharedUserIds.forEach(userId => {
          broadcastToUser(userId, {
            type: 'note_deleted',
            noteId: id
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
      console.error('Check note owner error:', err);
      return res.status(500).json({ error: 'Kunde inte fästa anteckning' });
    }

    if (!note || note.user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Anteckning hittades inte eller du saknar rättigheter' });
    }

    // Toggle is_pinned
    const newPinnedState = note.is_pinned ? 0 : 1;

    db.run('UPDATE notes SET is_pinned = ? WHERE id = ?', [newPinnedState, id], function(err) {
      if (err) {
        console.error('Pin note error:', err);
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

      // Create share
      db.run(
        `INSERT OR REPLACE INTO shares (note_id, shared_by_user_id, shared_with_user_id, permission)
         VALUES (?, ?, ?, ?)`,
        [id, req.session.userId, userId, validatedPermission],
        function(err) {
          if (err) {
            console.error('Share note error:', err);
            return res.status(500).json({ error: 'Kunde inte dela anteckning' });
          }

          // Notify target user via WebSocket
          broadcastToUser(userId, {
            type: 'note_shared',
            note: {
              ...note,
              owner_username: req.session.username,
              permission: validatedPermission
            }
          });

          res.json({
            message: `Delad med ${targetUser.username}`,
            sharedWith: targetUser
          });
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
          console.error('Unshare note error:', err);
          return res.status(500).json({ error: 'Kunde inte ta bort delning' });
        }

        // Notify user via WebSocket
        broadcastToUser(parseInt(userId), {
          type: 'note_unshared',
          noteId: parseInt(noteId)
        });

        res.json({ message: 'Delning borttagen' });
      }
    );
  });
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
          console.error('Get shares error:', err);
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

const uploadsDir = path.join(__dirname, 'data', 'uploads');
const mediaDir = path.join(__dirname, 'data', 'note-images'); // Use same directory as regular note images
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
    console.log('Extracting zip file...');
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);

    console.log('Parsing Google Keep data...');
    const parser = new KeepImportParser(extractPath, req.session.userId, mediaDir);
    const { notes, stats } = await parser.parse();

    console.log(`Importing ${notes.length} notes...`);
    let imported = 0;
    let failed = 0;

    for (const note of notes) {
      try {
        await importNote(note);
        imported++;
      } catch (error) {
        failed++;
        console.error('Import note error:', error);
        stats.errors.push({
          note: note.title || note.source_file,
          error: error.message
        });
      }
    }

    // Clean up
    fs.unlinkSync(zipPath);
    fs.rmSync(extractPath, { recursive: true, force: true });

    res.json({
      success: true,
      imported,
      failed,
      stats
    });

  } catch (error) {
    console.error('Import error:', error);

    // Clean up on error
    try {
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
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

// ===== ERROR HANDLING =====

app.use((err, req, res, next) => {
  console.error('Error:', err);

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
  console.log(`Keep Clone running on http://localhost:${PORT}`);
  console.log('Security features enabled:');
  console.log('  - Helmet security headers');
  console.log('  - CSRF protection');
  console.log('  - Rate limiting');
  console.log('  - Secure WebSocket authentication');
  console.log('  - Input sanitization');
  console.log('  - Path traversal protection');
  if (!process.env.SESSION_SECRET) {
    console.warn('\n⚠️  WARNING: Using default session secret!');
    console.warn('   Set SESSION_SECRET environment variable for production!\n');
  }
});
