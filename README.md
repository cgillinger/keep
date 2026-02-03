# Kreep - Private Google Keep for Families

[🇸🇪 Svenska versionen](#svenska-swedish-version)

A secure, self-hosted Google Keep clone with sharing features, customizable profiles, and import from Google Keep.

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![Docker](https://img.shields.io/badge/docker-supported-2496ED?logo=docker&logoColor=white)
![Platform](https://img.shields.io/badge/platform-linux%20%7C%20macOS%20%7C%20windows-lightgrey)

> **⚠️ Hobby Project - Provided "AS IS"**
>
> This is a personal hobby project shared freely under MIT license. No support, bug fixes, or feature requests are guaranteed. Use at your own risk. Feel free to fork and modify for your needs.

## ✨ Features

- 📝 **Notes:** Create, edit, and organize notes
- ☑️ **Checklists:** Checkable task lists
- 🎨 **Color Coding:** 12 colors to choose from
- 📌 **Pin Notes:** Keep important notes at the top
- 📦 **Archive:** Archive notes you don't want to see right now
- 🔍 **Search:** Find notes quickly
- 👥 **Share:** Share notes with family members (view or edit)
- 👤 **Personal Profiles:** Avatar colors, background themes, and initials
- 🌙 **Night Mode:** WCAG-compliant dark theme for comfortable reading
- 🎨 **Background Themes:** 5 light themes + night mode
- 📥 **Import:** Import your existing notes from Google Keep
- 📤 **Export:** Export backup of all your notes
- 🔄 **Real-time:** Automatically syncs across all devices
- 🔐 **Security:** Enterprise-grade security with CSRF, rate limiting, XSS protection, etc.
- 🔑 **Password Reset:** Email-based recovery (optional)

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or later (recommended)
- npm (included with Node.js)
- Approximately 200 MB disk space (for dependencies and data)

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/cgillinger/keep.git
cd keep
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**

Create a `.env` file in the project's root directory:

```bash
cp .env.example .env
```

**Edit `.env` and configure:**

**REQUIRED:**
```env
SESSION_SECRET=your_secure_random_string_here
```

Generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**OPTIONAL - Email for password reset:**

If you want users to be able to reset forgotten passwords, configure SMTP:

```env
# Email for password reset (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your.family@gmail.com
SMTP_PASS=your_app_password_here
EMAIL_FROM=Kreep <your.family@gmail.com>
```

**For Gmail:**
1. Enable 2-factor authentication on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Create an app password for "Kreep"
4. Use the app password (not your regular password) in `SMTP_PASS`

**For other email services:**
- **Outlook/Hotmail:** `smtp-mail.outlook.com`, port 587
- **Yahoo:** `smtp.mail.yahoo.com`, port 587
- **Custom SMTP:** Contact your email provider for settings

**NOTE:** If email is not configured, the app works fully, but without password reset. Users who forget passwords must create new accounts.

**Complete example `.env`:**
```env
# Required
SESSION_SECRET=a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8

# Optional
PORT=3000

# Email (optional, for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=family@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
EMAIL_FROM=Kreep <family@gmail.com>
```

4. **Start the server:**
```bash
npm start
```

5. **Open in browser:**
```
http://localhost:3000
```

### First Use

1. Click "Register"
2. Create an account (minimum 3 characters username, 12+ characters password)
3. Log in
4. Customize your profile (click on your initials):
   - Choose avatar color
   - Choose background theme (including night mode)
   - Enable/disable dates on notes
5. Start creating notes!

**What is created automatically:**
- `data/keep.db` - SQLite database (created on first start)
- `data/sessions/` - Session database
- `data/media/` - Imported attachments from Google Keep

**Tip:** Back up the `data/` folder regularly to save your notes!

## 📦 Docker (recommended for production)

The repo includes all necessary files for Docker:
- ✅ `Dockerfile` - Container configuration
- ✅ `docker-compose.yml` - Orchestration and volumes
- ✅ `.dockerignore` - Excludes unnecessary files
- ✅ `.env.example` - Environment variable template

### With Docker Compose (RECOMMENDED)

**Step 1: Create .env file**

```bash
# Copy example file
cp .env.example .env

# Generate secure SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Edit `.env`** and set at least `SESSION_SECRET`:
```env
SESSION_SECRET=your_generated_secret_here
PORT=3000

# Optional: Email for password reset
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# ...
```

**Step 2: Start with Docker Compose**

```bash
# Build and start (first time)
docker-compose up -d

# View logs (real-time)
docker-compose logs -f

# Stop (keeps data)
docker-compose down

# Restart after code changes
docker-compose up -d --build
```

**Step 3: Open in browser**
```
http://localhost:3000
```

**Step 4: Register first user**
1. Click "Register"
2. Create account
3. Start using!

### What happens automatically?

**Data persistence:**
- `./data/keep.db` - Database (created automatically)
- `./data/sessions/` - Sessions
- `./data/media/` - Imported images

All data is stored in `./data/` on your machine and survives:
- ✅ Container restarts (`docker-compose restart`)
- ✅ Container updates (`docker-compose up -d`)
- ✅ Docker Compose down/up
- ❌ **WARNING:** `docker-compose down -v` removes volumes!

**Backup:** Copy the entire `./data/` folder for backups.

### Manual Docker (without docker-compose)

If you prefer to run Docker directly:

```bash
# Build image
docker build -t kreep .

# Run container
docker run -d \
  --name kreep \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e SESSION_SECRET="your_secure_secret_here" \
  -e NODE_ENV=production \
  --restart unless-stopped \
  kreep

# View logs
docker logs -f kreep

# Stop and remove
docker stop kreep
docker rm kreep
```

**Tips for manual Docker:**
- Add `-e PORT=8080` for different port
- Add SMTP variables for email: `-e SMTP_HOST=...`
- Use `--env-file .env` to read from .env file

### Synology NAS with Container Manager

**Method 1: With docker-compose.yml (easiest)**

1. **Prepare project folder:**
   - Open File Station
   - Create folder: `/docker/keep` (or any location)

2. **Upload files:**
   - Upload **all** files from repo to the folder
   - Or use Git (if installed): `git clone https://github.com/cgillinger/keep.git`

3. **Create .env file:**
   - Create new file in project folder: `.env`
   - Copy content from `.env.example`
   - Set at least: `SESSION_SECRET=your_secure_secret`
   - Generate secret on your computer: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

4. **Use Container Manager:**
   - Open Container Manager in DSM
   - Go to **Project** (not Container or Image)
   - Click **Create**
   - Select project folder (`/docker/keep`)
   - Container Manager automatically finds `docker-compose.yml`
   - Click **Next** → **Done**

5. **Start:**
   - Project starts automatically
   - Connect via: `http://[synology-ip]:3000`

**Method 2: Manual container (more advanced)**

If docker-compose doesn't work:
1. Container Manager → Image → Add → From file
2. Select `Dockerfile` from project folder
3. Build image
4. Container → Create
5. Configure:
   - Port: 3000:3000
   - Volume: Map `/docker/keep/data` → `/app/data`
   - Environment: Add `SESSION_SECRET`, `NODE_ENV=production`

**Tips for Synology:**
- ✅ Data in `./data/` automatically included in Hyper Backup
- ✅ Use Synology Firewall for security
- ✅ Configure reverse proxy for HTTPS (optional)
- ✅ Schedule restart in Task Scheduler (optional)

### Tailscale Access (recommended for security)

For secure remote access without exposing the server publicly:

1. **Install Tailscale:**
   - On server/NAS: Follow instructions at tailscale.com
   - On your devices: Download Tailscale app

2. **Connect via Tailscale network:**
   ```
   http://[tailscale-ip]:3000
   ```
   - Find Tailscale IP in Tailscale app
   - No port forwarding needed
   - Encrypted connection automatically

3. **Benefits:**
   - ✅ No internet exposure
   - ✅ End-to-end encryption
   - ✅ Works behind NAT/firewall
   - ✅ Access from mobile/computer anywhere

### Docker Troubleshooting

**Problem: Container won't start**

```bash
# Show detailed logs
docker-compose logs

# Or for manual Docker
docker logs kreep
```

**Common errors:**

**"SESSION_SECRET not configured"**
- Solution: Check that `.env` exists and contains SESSION_SECRET

**"Port already in use"**
- Solution: Change external port in docker-compose.yml:
  ```yaml
  ports:
    - "8080:3000"  # Use 8080 instead
  ```

**"Permission denied" for data folder**
- Solution (Linux):
  ```bash
  sudo chown -R $USER:$USER ./data
  chmod -R 755 ./data
  ```

**Container stops after startup**
- Check logs: `docker-compose logs`
- Common: Database file corrupt → Delete `data/keep.db` and restart

**Cannot connect to container**
- Check that container is running: `docker-compose ps`
- Check port: `docker-compose port kreep 3000`
- Test locally first: `curl http://localhost:3000`

**Update to new version**
```bash
# Stop container
docker-compose down

# Pull latest changes
git pull

# Rebuild and start
docker-compose up -d --build
```

**Complete reset (DELETES ALL DATA!)**
```bash
docker-compose down -v  # -v deletes volumes!
rm -rf data/
docker-compose up -d
```

## 📚 Documentation

- **[FEATURES.md](./FEATURES.md)** - Complete feature and security documentation
- **[IMPORT-GUIDE.md](./IMPORT-GUIDE.md)** - Detailed guide for Google Keep import
- **[INSTALL-SYSTEMD.md](./INSTALL-SYSTEMD.md)** - Installation as systemd service on Linux
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - 🔒 HTTPS/HTTP configuration guide for different environments
- **[LOGGING.md](./LOGGING.md)** - 📊 Logging, monitoring, and troubleshooting guide

### Quick Guides

**Customize your profile:**
1. Click on your initials in the header
2. Choose avatar color (10 colors)
3. Choose background theme:
   - Default (white)
   - Warm beige
   - Soft blue
   - Mint green
   - Light lavender
   - Night mode (dark, WCAG-compliant)
4. Enable "Show when created" to see creation date on notes

**Share a note:**
1. Open the note
2. Click the share icon (👥)
3. Choose "View" or "Edit" for family member
4. They get immediate access with real-time sync!

**Import from Google Keep:**
1. Go to [Google Takeout](https://takeout.google.com/)
2. Select only "Keep" and download
3. Click on your profile → "📥 Import from Google Keep"
4. Select zip file and import
5. See [IMPORT-GUIDE.md](./IMPORT-GUIDE.md) for more details

## 📥 Import from Google Keep

Kreep has built-in import from Google Keep! Move all your notes easily.

### Quick Instructions

1. **Export from Google:** Go to [Google Takeout](https://takeout.google.com/), select only "Keep", download zip
2. **Import:** Open profile → "📥 Import from Google Keep", select zip file, click "Import"
3. **Done!** All notes imported with colors, checklists, and attachments

### What is imported?

✅ **Imported:**
- Notes with titles and content
- Checklists with checked status
- Color coding (12 Google Keep colors mapped to corresponding)
- Archived notes
- Timestamps (created/updated)
- Attachments (images, files)

❌ **NOT imported:**
- Trash
- Labels/tags
- Reminders
- Shares (become private notes)

For detailed guide and troubleshooting, see [IMPORT-GUIDE.md](./IMPORT-GUIDE.md)

## 🔐 Security

Kreep is built with security first, suitable for Tailscale access or private networks:

- ✅ **Strong authentication:** Bcrypt hashing (12 rounds), 12+ character passwords
- ✅ **CSRF protection:** All changes protected with tokens
- ✅ **Rate limiting:** Prevents brute-force (5 login attempts/15 min in production)
- ✅ **XSS protection:** DOMPurify sanitizes all user input
- ✅ **Security headers:** Helmet with CSP, HSTS, X-Frame-Options
- ✅ **Path traversal protection:** Safe file handling
- ✅ **Secure sessions:** HTTP-only, SameSite strict cookies
- ✅ **WebSocket auth:** Validated session on all WS connections
- ✅ **SQL injection protection:** Parameterized queries

**Rate limits (production):**
- Login: 5 attempts / 15 minutes
- Register: 3 registrations / hour
- Import: 10 imports / hour
- API: 100 calls / minute

**Development mode has more generous limits for testing.**

Read more in [FEATURES.md#security-features](./FEATURES.md#säkerhetsfunktioner)

## 👥 Share Notes

Share notes with family members:

**Two permission levels:**
- **View:** Can read and check checkboxes
- **Edit:** Can make changes to the note

**How to share:**
1. Open the note
2. Click the share icon (👥)
3. Select family member and permission
4. Done! Real-time synchronization activated

**Features:**
- See who has shared notes with you
- Real-time updates when someone changes
- Avatars show who owns/shares the note
- Toggle between "My notes" and "Shared with me"

## 🏗️ Architecture

**Backend:**
- Node.js + Express
- SQLite for database
- WebSocket (ws) for real-time sync
- Session-based authentication

**Frontend:**
- Vanilla JavaScript (no framework)
- Modular CSS architecture (6 files)
- Responsive design
- Real-time updates

**Security:**
- helmet - HTTP security headers
- express-rate-limit - Rate limiting
- csurf - CSRF protection
- bcryptjs - Password hashing
- dompurify + jsdom - XSS prevention
- sharp - Safe image optimization

## 📊 Database Structure

```
users
  ├─ id
  ├─ username (unique)
  ├─ password_hash
  ├─ email (nullable)
  ├─ avatar_color
  ├─ background_theme
  ├─ reset_token (nullable)
  ├─ reset_token_expires (nullable)
  └─ created_at

notes
  ├─ id
  ├─ user_id → users.id
  ├─ title
  ├─ content
  ├─ color
  ├─ is_checklist
  ├─ checklist_items (JSON)
  ├─ images (JSON array)
  ├─ is_archived
  ├─ is_pinned
  ├─ created_at
  └─ updated_at

shares
  ├─ id
  ├─ note_id → notes.id (CASCADE)
  ├─ shared_by_user_id → users.id
  ├─ shared_with_user_id → users.id
  ├─ permission (view/edit)
  └─ created_at
```

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Log in
- `POST /api/auth/logout` - Log out
- `GET /api/me` - Check session
- `GET /api/csrf-token` - Get CSRF token
- `POST /api/auth/request-reset` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Notes
- `GET /api/notes?archived=true&shared=true` - Get notes
- `POST /api/notes` - Create note (CSRF)
- `PUT /api/notes/:id` - Update note (CSRF)
- `DELETE /api/notes/:id` - Delete note (CSRF)
- `PUT /api/notes/:id/pin` - Pin/unpin note (CSRF)
- `PUT /api/notes/:id/archive` - Archive/restore note (CSRF)

### Sharing
- `POST /api/notes/:id/share` - Share note (CSRF)
- `DELETE /api/notes/:noteId/share/:userId` - Unshare (CSRF)
- `GET /api/notes/:id/shares` - Get shares
- `GET /api/users` - List users (for sharing)

### Profile & Data
- `POST /api/profile/avatar-color` - Change avatar color (CSRF)
- `POST /api/profile/background-theme` - Change background theme (CSRF)
- `POST /api/import` - Import Google Keep (CSRF)
- `GET /api/export` - Export backup (ZIP)

## 🔧 Configuration

### Environment Variables

All configurations are done via the `.env` file:

```env
# Required
SESSION_SECRET=your_secure_secret_here

# Optional
PORT=3000
NODE_ENV=production

# HTTPS Configuration (optional)
# Set to 'true' if running behind a reverse proxy with TLS termination
# This enables HSTS (HTTP Strict Transport Security) headers
FORCE_HTTPS=false

# Email (optional, for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=family@gmail.com
SMTP_PASS=app_password_here
EMAIL_FROM=Kreep <family@gmail.com>
```

#### FORCE_HTTPS (Advanced Configuration)

**Default:** `false`

**When to use:**
- Set to `true` **ONLY** if running behind HTTPS reverse proxy with TLS termination (e.g., Nginx, Traefik, Caddy)
- Leave as `false` for HTTP-only deployments (Docker, LAN, Tailscale without HTTPS)

**What it does:**
- When `true`: Enables HSTS (HTTP Strict Transport Security) headers
- When `false`: Disables HTTPS-only security headers, allowing the app to work correctly over HTTP

**Example scenarios:**

✅ **HTTP deployment (Docker on Synology, LAN access):**
```env
FORCE_HTTPS=false  # or omit entirely
```

✅ **HTTPS deployment (behind Nginx reverse proxy):**
```env
FORCE_HTTPS=true
```

⚠️ **Common mistake:** Setting `FORCE_HTTPS=true` when accessing via HTTP will cause connection issues.

### Change Port

**Method 1: Via .env file (RECOMMENDED)**

Edit `.env`:
```env
PORT=8080
```

Restart server:
```bash
npm start
```

App now runs on `http://localhost:8080`

**Method 2: Via command line (temporary)**

```bash
PORT=8080 npm start
```

This applies only to this session.

**For Docker (see Docker port configuration below)**

### Docker Port Configuration

Docker has two ports to configure:
- **Internal port** - port inside Docker container (where app runs)
- **External port** - port on your computer/server (where you connect)

**Format:** `external:internal`

**Example 1: Run app on port 8080 outside container**
```yaml
# docker-compose.yml
services:
  kreep:
    ports:
      - "8080:3000"  # External:Internal
    # App runs on port 3000 inside container
    # You connect via http://localhost:8080
```

**Example 2: Change both internal and external port**
```yaml
services:
  kreep:
    environment:
      - PORT=8080      # Internal port changed
    ports:
      - "8080:8080"    # Both ports 8080
```

**Example 3: Use port 80 (standard HTTP)**
```yaml
services:
  kreep:
    ports:
      - "80:3000"      # Connect via http://localhost (no port needed)
```

**Tips:**
- Leave internal port as 3000 if possible (simpler)
- Only change external port to avoid port conflicts
- Port 80 requires root/admin on many systems

### Data Location

Data is stored in `./data/`:
- `keep.db` - SQLite database
- `sessions/` - Session database
- `media/` - Imported attachments from Google Keep

### Rate Limiting

Adjust in `server.js` (production values):
```javascript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // 5 attempts
});
```

## 🐛 Troubleshooting

### Server won't start

**Problem:** Port 3000 already in use

**Solution:**

**Option 1: Change port (recommended)**
```bash
# Add to .env
echo "PORT=8080" >> .env
npm start
```

**Option 2: Find and stop process on port 3000**
```bash
# Find process on port 3000
lsof -i :3000
# Kill process
kill -9 <PID>
```

**Option 3: Temporary port change**
```bash
PORT=8080 npm start
```

**Problem:** "SESSION_SECRET not configured" or session errors

**Solution:**
- Check that you have created a `.env` file in project root
- Make sure `SESSION_SECRET` is set to a long, random string
- Generate a new secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

**Problem:** Missing modules or npm errors

**Solution:**
```bash
# Clean and reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Cannot log in

**Problem:** Incorrect password or username

**Solution:**
- Check that username is correct (case-sensitive)
- If you forgot password:
  - With email configured: Use "Forgot password?"
  - Without email: Create new account
- Check that caps lock is not on

### Import not working

**Problem:** Wrong file format or corrupt zip

**Solution:**
- See [IMPORT-GUIDE.md](./IMPORT-GUIDE.md) for detailed troubleshooting
- Check that file is a Google Takeout export (.zip)
- Try unpacking locally first to verify integrity
- Check that zip file contains a "Keep/" folder

### WebSocket errors

**Problem:** Real-time updates not working

**Solution:**
- Check that browser supports WebSocket
- Refresh page (F5)
- Check server console for errors
- Some proxies block WebSocket - use direct connection or Tailscale

### Email not working

**Problem:** Password reset not sent

**Solution:**
- Check that SMTP settings are correct in `.env`
- For Gmail: Use app password, not regular password
- Test SMTP connection: `node -e "require('./mailer.js')"`
- Check server console for SMTP errors
- Some providers require approval for "less secure apps"

### CSS/JS not loading in Docker (ERR_SSL_PROTOCOL_ERROR)

**Problem:** Server starts but UI doesn't load - browser shows `ERR_SSL_PROTOCOL_ERROR` or CSS/JS files fail to load

**Symptoms:**
- Browser tries to load resources via HTTPS when server runs on HTTP
- DevTools console shows "Mixed Content" errors or SSL errors
- Page loads but is unstyled/broken

**Root cause:** HTTPS-only security headers (HSTS, upgrade-insecure-requests) are enabled when running over HTTP

**Solution:**

Check your `.env` file and ensure `FORCE_HTTPS` is **not** set to `true`:

```env
# For HTTP deployments (Docker, LAN, Synology)
FORCE_HTTPS=false  # or omit this line entirely
```

Then restart the container:
```bash
docker-compose down
docker-compose up -d
```

**When to use `FORCE_HTTPS=true`:**
- **ONLY** when running behind HTTPS reverse proxy (Nginx, Traefik, Caddy with TLS)
- For direct HTTP access (Docker, LAN, Tailscale without HTTPS): leave as `false`

See [Environment Variables](#environment-variables) section for more details.

### Database Administration

**Problem:** Need to manually manage users (delete inactive accounts, reset user data, etc.)

**Solution:**

Kreep uses SQLite, which can be managed directly using the `sqlite3` command-line tool.

**Install sqlite3 (if not already installed):**
```bash
# Ubuntu/Debian
sudo apt-get install sqlite3

# macOS (usually pre-installed)
brew install sqlite3

# Windows
# Download from https://www.sqlite.org/download.html
```

**Access the database:**
```bash
# Navigate to your Kreep directory
cd /path/to/keep

# Open database
sqlite3 data/keep.db
```

**Common administrative tasks:**

**1. List all users:**
```sql
SELECT id, username, email, created_at FROM users;
```

**2. Delete a specific user (and all their data):**
```sql
-- First, check what will be deleted
SELECT COUNT(*) FROM notes WHERE user_id = 1;  -- Replace 1 with user ID
SELECT COUNT(*) FROM shares WHERE shared_by_user_id = 1 OR shared_with_user_id = 1;

-- Delete user's notes
DELETE FROM notes WHERE user_id = 1;

-- Delete user's shares (both given and received)
DELETE FROM shares WHERE shared_by_user_id = 1 OR shared_with_user_id = 1;

-- Delete the user
DELETE FROM users WHERE id = 1;
```

**3. Delete a user by username:**
```sql
-- Find the user ID first
SELECT id, username, email FROM users WHERE username = 'johndoe';

-- Then follow steps in #2 above with the correct user ID
```

**4. Reset a user's password (force them to use password reset):**
```sql
-- Clear password and set reset token
UPDATE users SET password = NULL, reset_token = NULL, reset_token_expires = NULL WHERE username = 'johndoe';
```

**Note:** SQLite does not support bcrypt directly, so you cannot manually set passwords. Users must use the password reset feature or register a new account.

**5. View database schema:**
```sql
.schema users
.schema notes
.schema shares
```

**6. Exit sqlite3:**
```sql
.quit
```

**⚠️ Important warnings:**
- **Always backup the database before making changes:** `cp data/keep.db data/keep.db.backup`
- **Stop the server before manual edits** to prevent database corruption
- **SQLite has no authentication** - anyone with file access can modify the database
- **Test queries with SELECT first** before using DELETE or UPDATE
- **User sessions may remain active** after deletion - users will be logged out on next page refresh

**Complete user deletion script:**
```bash
#!/bin/bash
# delete-user.sh - Safe user deletion with backup

USER_ID=$1

if [ -z "$USER_ID" ]; then
  echo "Usage: ./delete-user.sh <user_id>"
  exit 1
fi

# Backup database
cp data/keep.db "data/keep.db.backup-$(date +%Y%m%d-%H%M%S)"

# Delete user and associated data
sqlite3 data/keep.db <<EOF
BEGIN TRANSACTION;
DELETE FROM notes WHERE user_id = $USER_ID;
DELETE FROM shares WHERE shared_by_user_id = $USER_ID OR shared_with_user_id = $USER_ID;
DELETE FROM users WHERE id = $USER_ID;
COMMIT;
SELECT 'User deleted successfully. Rows affected:';
SELECT changes();
EOF

echo "Backup saved. Restart the server to clear sessions."
```

Make the script executable: `chmod +x delete-user.sh`

Usage: `./delete-user.sh 5` (deletes user with ID 5)

**7. Delete ALL users and start fresh:**

If you want to completely reset the application and remove all users, notes, and data, the simplest method is to delete the database file. The server will automatically create a new empty database on next start.

**Method 1: Delete database (simplest)**
```bash
# Stop the server first (Ctrl+C if running)

# Delete the database
rm data/keep.db

# Optional: Clear sessions
rm -rf data/sessions/*

# Start server - new database created automatically
npm start
```

**Method 2: Backup before deleting (recommended)**
```bash
# Backup existing database
cp data/keep.db "data/keep.db.backup-$(date +%Y%m%d-%H%M%S)"

# Delete database
rm data/keep.db

# Start server
npm start
```

**Method 3: Delete only data, keep database file**
```bash
sqlite3 data/keep.db "DELETE FROM users; DELETE FROM notes; DELETE FROM shares; VACUUM;"
```

**For Docker:**
```bash
# Stop container
docker-compose down

# Delete database
rm data/keep.db
rm -rf data/sessions/*

# Start again
docker-compose up -d
```

**What happens when database is deleted:**
- ✅ `database.js` automatically creates new `keep.db` with correct schema
- ✅ All tables (`users`, `notes`, `shares`) created from scratch
- ✅ No users exist - you can register new ones immediately
- ✅ No notes or shares exist - completely fresh start

## 🧪 Development

### Development Mode with Auto-restart

For development with automatic restart on file changes:

```bash
# Development mode
npm run dev
```

### Development vs Production

Kreep has different security settings for development and production:

**Development Mode (NODE_ENV != 'production'):**
- More generous rate limits for testing
- Login: 50 attempts/minute
- Register: 20 attempts/minute
- API: 500 calls/minute

**Production Mode:**
```bash
NODE_ENV=production npm start
```
- Stricter security
- Login: 5 attempts/15 min
- Register: 3 attempts/hour
- API: 100 calls/minute

**Recommendation:** Always run in production mode on servers!

### Clear Database

```bash
rm data/keep.db
# Server creates new database on next start
```

## 📁 Project Structure

```
keep/
├── server.js              # Main server (1,391 lines)
├── database.js            # Database initialization and schema
├── import-parser.js       # Google Keep import parser
├── export-generator.js    # Backup generator
├── backup-parser.js       # Backup restoration
├── mailer.js              # Email service for password reset
├── package.json           # Dependencies and scripts
├── .env.example           # Example environment variables
├── docker-compose.yml     # Docker Compose configuration
├── Dockerfile             # Docker image definition
├── .dockerignore          # Docker build exclusions
├── LICENSE                # MIT license
├── public/
│   ├── index.html         # Frontend HTML (425 lines)
│   ├── app.js             # Frontend JavaScript (2,063 lines)
│   └── css/               # Modular CSS architecture (1,615 lines)
│       ├── base.css       # Variables, reset, dark mode
│       ├── layout.css     # Header, grid
│       ├── components.css # Buttons, cards, forms
│       ├── modals.css     # Modal dialogs
│       ├── utilities.css  # Utility classes
│       └── debug.css      # Debug tools
├── data/
│   ├── keep.db            # SQLite database
│   ├── sessions/          # Session database
│   └── media/             # Imported attachments
└── Documentation/
    ├── README.md          # This file
    ├── FEATURES.md        # Feature documentation (390 lines)
    ├── IMPORT-GUIDE.md    # Import guide (293 lines)
    └── INSTALL-SYSTEMD.md # Systemd installation

Total codebase: ~7,000 lines (excluding dependencies)
```

## 📝 Changelog

### Version 1.1.0 (2026-01-23)

**Improvements:**
- 🌍 Bilingual documentation (English + Swedish)
- 📖 English as primary language for international audiences
- 🔗 Quick navigation between language versions

### Version 1.0.0 (2025-01-23)

**New features:**
- ✨ Share notes with family members (view/edit permissions)
- 👤 Customizable profiles with avatar colors (10 colors)
- 🎨 Background themes (5 light + night mode)
- 🌙 WCAG-compliant night mode with muted colors
- 📥 Import from Google Keep via Takeout
- 📤 Export/backup to ZIP
- 🔄 Real-time synchronization via WebSocket
- 📌 Pin important notes
- 🔑 Password reset via email (optional)
- 📅 Optional display of creation date on notes
- 🖼️ Image support for imported notes

**Security:**
- 🔐 CSRF protection on all modification operations
- 🚫 Rate limiting on sensitive endpoints
- 🛡️ XSS protection with DOMPurify
- 🔒 Secure sessions and cookies
- 📋 Strong password requirements (12+ characters, mixed case, numbers)
- 🏗️ Security headers with Helmet (CSP, HSTS, etc.)

**Improvements:**
- ♻️ Complete backend rewrite for security
- 🎨 Modular CSS architecture (6 files)
- 📱 Responsive design for mobile devices
- ⚡ Optimized image handling with Sharp
- 🚀 Cached rendering for faster UI
- 📊 Complete documentation (1,500+ lines)

**Architecture:**
- 🗄️ SQLite database with auto-migration
- 🔌 WebSocket for real-time updates
- 📦 Session-based authentication
- 🐳 Docker support

## 📄 License

MIT License - See [LICENSE](./LICENSE) for details.

Copyright (c) 2025 Kreep Contributors

## 🤝 Contributing

**This is a hobby project provided "AS IS" under MIT license.**

I'm sharing this code freely, but I don't commit to reviewing PRs, fixing bugs, or implementing features. If you find issues or want improvements, feel free to:

- **Fork the project** and modify it for your needs
- **Share your improvements** with the community (but no obligation for me to merge)
- **Help other users** in discussions if you want to

No support or maintenance is guaranteed. This is a personal project I built for my family's use.

## 💡 Planned Features

- [ ] Labels/tags for organization
- [ ] Reminders
- [ ] Attachments on new notes (not just import)
- [ ] Markdown support
- [ ] Export to different formats (PDF, Markdown)
- [ ] Mobile app (PWA)
- [ ] Two-factor authentication
- [ ] Backup schedule
- [ ] Collaborative editing with cursor sync

## ❓ Support

**No support is provided for this hobby project.**

This code is shared "as is" without any guarantee of fixes or responses. However, you can:

1. **Read the documentation** in this repo - it's comprehensive
2. **Search existing issues** - someone might have solved your problem
3. **Help each other** - community discussions are welcome
4. **Fork and fix** - you have full access to modify the code

I built this for my family and share it hoping it helps others, but I can't commit to providing support or bug fixes.

## 👨‍👩‍👧‍👦 For Families

Kreep is specially designed for families who want to:
- 🏠 Have full control over their data
- 🔒 Not let Google read their notes
- 💰 Save money (completely free, open source)
- 🤝 Easily share notes with family
- 📱 Sync across all devices
- 🚀 Easy setup on home server or NAS
- 🛡️ Have enterprise security without enterprise cost

**Perfect for:**
- Shopping lists
- Recipes
- Todo lists
- Family planning
- Travel plans
- Meeting notes
- Ideas and brainstorming
- Passwords and important notes

---

**Built with ❤️ for families who value privacy and simplicity.**

**Version 1.1.0** | [Changelog](#changelog) | [License](./LICENSE) | [Documentation](#documentation)

---

<a name="svenska-swedish-version"></a>
# Svenska (Swedish Version)

# Kreep - Privat Google Keep för familjer

En säker, självhostad Google Keep-klon med delningsfunktioner, anpassningsbara profiler och import från Google Keep.

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![Docker](https://img.shields.io/badge/docker-supported-2496ED?logo=docker&logoColor=white)
![Platform](https://img.shields.io/badge/platform-linux%20%7C%20macOS%20%7C%20windows-lightgrey)

> **⚠️ Hobbyprojekt - Tillhandahålls "SOM DET ÄR"**
>
> Detta är ett personligt hobbyprojekt som delas fritt under MIT-licens. Ingen support, buggfixar eller feature requests garanteras. Använd på egen risk. Du är välkommen att forka och modifiera för dina behov.

## ✨ Funktioner

- 📝 **Anteckningar:** Skapa, redigera och organisera anteckningar
- ☑️ **Checklistor:** Avbockningsbara uppgiftslistor
- 🎨 **Färgkodning:** 12 färger att välja mellan
- 📌 **Fäst anteckningar:** Håll viktiga anteckningar högst upp
- 📦 **Arkiv:** Arkivera anteckningar du inte vill se just nu
- 🔍 **Sök:** Hitta anteckningar snabbt
- 👥 **Dela:** Dela anteckningar med familjemedlemmar (visa eller redigera)
- 👤 **Personliga profiler:** Avatarfärger, bakgrundsteman och initialer
- 🌙 **Nattläge:** WCAG-kompatibelt mörkt tema för ögonvänlig läsning
- 🎨 **Bakgrundsteman:** 5 ljusa teman + nattläge
- 📥 **Import:** Importera dina befintliga anteckningar från Google Keep
- 📤 **Export:** Exportera backup av alla dina anteckningar
- 🔄 **Real-time:** Synkroniserar automatiskt mellan alla enheter
- 🔐 **Säkerhet:** Företagsstandard säkerhet med CSRF, rate limiting, XSS-skydd m.m.
- 🔑 **Lösenordsåterställning:** E-post-baserad återställning (valfritt)

## 🚀 Snabbstart

### Förutsättningar

- Node.js 18 eller senare (rekommenderat)
- npm (medföljer Node.js)
- ca 200 MB diskutrymme (för dependencies och data)

### Installation

1. **Klona repository:**
```bash
git clone https://github.com/cgillinger/keep.git
cd keep
```

2. **Installera dependencies:**
```bash
npm install
```

3. **Konfigurera miljövariabler:**

Skapa en `.env`-fil i projektets root-katalog:

```bash
cp .env.example .env
```

**Redigera `.env` och konfigurera:**

**OBLIGATORISKT:**
```env
SESSION_SECRET=din_säkra_slumpmässiga_sträng_här
```

Generera en säker secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**VALFRITT - E-post för lösenordsåterställning:**

Om du vill att användare ska kunna återställa glömda lösenord, konfigurera SMTP:

```env
# E-post för lösenordsåterställning (valfritt)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=din.familj@gmail.com
SMTP_PASS=ditt_applösenord_här
EMAIL_FROM=Kreep <din.familj@gmail.com>
```

**För Gmail:**
1. Aktivera 2-faktorautentisering på ditt Google-konto
2. Gå till https://myaccount.google.com/apppasswords
3. Skapa ett applösenord för "Kreep"
4. Använd applösenordet (inte ditt vanliga lösenord) i `SMTP_PASS`

**För andra e-posttjänster:**
- **Outlook/Hotmail:** `smtp-mail.outlook.com`, port 587
- **Yahoo:** `smtp.mail.yahoo.com`, port 587
- **Eget SMTP:** Kontakta din e-postleverantör för inställningar

**OBS:** Om e-post inte konfigureras fungerar appen fullt ut, men utan lösenordsåterställning. Användare som glömmer lösenord måste skapa nya konton.

**Komplett exempel `.env`:**
```env
# Obligatoriskt
SESSION_SECRET=a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8

# Valfritt
PORT=3000

# E-post (valfritt, för lösenordsåterställning)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=familj@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
EMAIL_FROM=Kreep <familj@gmail.com>
```

4. **Starta servern:**
```bash
npm start
```

5. **Öppna i webbläsaren:**
```
http://localhost:3000
```

### Första användningen

1. Klicka på "Registrera dig"
2. Skapa ett konto (minst 3 tecken användarnamn, 12+ tecken lösenord)
3. Logga in
4. Anpassa din profil (klicka på dina initialer):
   - Välj avatarfärg
   - Välj bakgrundstema (inkl. nattläge)
   - Aktivera/avaktivera datum på anteckningar
5. Börja skapa anteckningar!

**Vad skapas automatiskt:**
- `data/keep.db` - SQLite-databasen (skapas vid första start)
- `data/sessions/` - Sessionsdatabas
- `data/media/` - Importerade bilagor från Google Keep

**Tips:** Backa upp `data/`-mappen regelbundet för att spara dina anteckningar!

## 📦 Docker (rekommenderat för produktion)

Repot innehåller alla nödvändiga filer för Docker:
- ✅ `Dockerfile` - Container-konfiguration
- ✅ `docker-compose.yml` - Orkestrering och volumes
- ✅ `.dockerignore` - Exkluderar onödiga filer
- ✅ `.env.example` - Miljövariabel-mall

### Med Docker Compose (REKOMMENDERAT)

**Steg 1: Skapa .env-fil**

```bash
# Kopiera exempel-filen
cp .env.example .env

# Generera säker SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Redigera `.env`** och sätt minst `SESSION_SECRET`:
```env
SESSION_SECRET=din_genererade_secret_här
PORT=3000

# Valfritt: E-post för lösenordsåterställning
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# ...
```

**Steg 2: Starta med Docker Compose**

```bash
# Bygg och starta (första gången)
docker-compose up -d

# Se loggar (realtid)
docker-compose logs -f

# Stoppa (behåller data)
docker-compose down

# Starta om efter kodändring
docker-compose up -d --build
```

**Steg 3: Öppna i webbläsare**
```
http://localhost:3000
```

**Steg 4: Registrera första användaren**
1. Klicka "Registrera dig"
2. Skapa konto
3. Börja använda!

### Vad händer automatiskt?

**Data persistence:**
- `./data/keep.db` - Databas (skapas automatiskt)
- `./data/sessions/` - Sessioner
- `./data/media/` - Importerade bilder

All data lagras i `./data/` på din maskin och överlever:
- ✅ Container-omstarter (`docker-compose restart`)
- ✅ Container-uppdateringar (`docker-compose up -d`)
- ✅ Docker Compose down/up
- ❌ **VARNING:** `docker-compose down -v` tar bort volumes!

**Backup:** Kopiera hela `./data/`-mappen för säkerhetskopiering.

### Manuell Docker (utan docker-compose)

Om du föredrar att köra Docker direkt:

```bash
# Bygg image
docker build -t kreep .

# Kör container
docker run -d \
  --name kreep \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e SESSION_SECRET="din_säkra_secret_här" \
  -e NODE_ENV=production \
  --restart unless-stopped \
  kreep

# Se loggar
docker logs -f kreep

# Stoppa och ta bort
docker stop kreep
docker rm kreep
```

**Tips för manuell Docker:**
- Lägg till `-e PORT=8080` för annan port
- Lägg till SMTP-variabler för e-post: `-e SMTP_HOST=...`
- Använd `--env-file .env` för att läsa från .env-fil

### Synology NAS med Container Manager

**Metod 1: Med docker-compose.yml (enklast)**

1. **Förbered projektmapp:**
   - Öppna File Station
   - Skapa mapp: `/docker/keep` (eller valfri plats)

2. **Ladda upp filer:**
   - Ladda upp **alla** filer från repot till mappen
   - Eller använd Git (om installerat): `git clone https://github.com/cgillinger/keep.git`

3. **Skapa .env-fil:**
   - Skapa ny fil i projektmappen: `.env`
   - Kopiera innehåll från `.env.example`
   - Sätt minst: `SESSION_SECRET=din_säkra_secret`
   - Generera secret på din dator: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

4. **Använd Container Manager:**
   - Öppna Container Manager i DSM
   - Gå till **Project** (inte Container eller Image)
   - Klicka **Create**
   - Välj projektmappen (`/docker/keep`)
   - Container Manager hittar automatiskt `docker-compose.yml`
   - Klicka **Next** → **Done**

5. **Starta:**
   - Projektet startar automatiskt
   - Anslut via: `http://[synology-ip]:3000`

**Metod 2: Manuell container (mer avancerat)**

Om docker-compose inte fungerar:
1. Container Manager → Image → Add → From file
2. Välj `Dockerfile` från projektmappen
3. Bygg image
4. Container → Create
5. Konfigurera:
   - Port: 3000:3000
   - Volume: Mappa `/docker/keep/data` → `/app/data`
   - Environment: Lägg till `SESSION_SECRET`, `NODE_ENV=production`

**Tips för Synology:**
- ✅ Data i `./data/` inkluderas automatiskt i Hyper Backup
- ✅ Använd Synology Firewall för säkerhet
- ✅ Konfigurera omvänd proxy för HTTPS (valfritt)
- ✅ Schemalägga omstart i Task Scheduler (valfritt)

### Tailscale-åtkomst (rekommenderat för säkerhet)

För säker fjärråtkomst utan att exponera servern publikt:

1. **Installera Tailscale:**
   - På server/NAS: Följ instruktioner på tailscale.com
   - På dina enheter: Ladda ner Tailscale-app

2. **Anslut via Tailscale-nätverk:**
   ```
   http://[tailscale-ip]:3000
   ```
   - Hitta Tailscale IP i Tailscale-appen
   - Ingen portforward behövs
   - Krypterad anslutning automatiskt

3. **Fördelar:**
   - ✅ Ingen exponering mot internet
   - ✅ End-to-end kryptering
   - ✅ Fungerar bakom NAT/firewall
   - ✅ Åtkomst från mobil/dator överallt

### Docker Felsökning

**Problem: Container startar inte**

```bash
# Visa detaljerade loggar
docker-compose logs

# Eller för manuell Docker
docker logs kreep
```

**Vanliga fel:**

**"SESSION_SECRET not configured"**
- Lösning: Kontrollera att `.env` finns och innehåller SESSION_SECRET

**"Port already in use"**
- Lösning: Ändra extern port i docker-compose.yml:
  ```yaml
  ports:
    - "8080:3000"  # Använd 8080 istället
  ```

**"Permission denied" för data-mapp**
- Lösning (Linux):
  ```bash
  sudo chown -R $USER:$USER ./data
  chmod -R 755 ./data
  ```

**Container stannar efter start**
- Kontrollera loggar: `docker-compose logs`
- Vanligt: Databasfil korrupt → Ta bort `data/keep.db` och starta om

**Kan inte ansluta till container**
- Kontrollera att containern körs: `docker-compose ps`
- Kontrollera port: `docker-compose port kreep 3000`
- Testa lokalt först: `curl http://localhost:3000`

**Uppdatera till ny version**
```bash
# Stoppa container
docker-compose down

# Hämta senaste ändringar
git pull

# Bygg om och starta
docker-compose up -d --build
```

**Återställ helt (RADERAR ALL DATA!)**
```bash
docker-compose down -v  # -v raderar volumes!
rm -rf data/
docker-compose up -d
```

## 📚 Dokumentation

- **[FEATURES.md](./FEATURES.md)** - Komplett funktions- och säkerhetsdokumentation
- **[IMPORT-GUIDE.md](./IMPORT-GUIDE.md)** - Detaljerad guide för Google Keep-import
- **[INSTALL-SYSTEMD.md](./INSTALL-SYSTEMD.md)** - Installation som systemd-tjänst på Linux

### Snabbguider

**Anpassa din profil:**
1. Klicka på dina initialer i headern
2. Välj avatarfärg (10 färger)
3. Välj bakgrundstema:
   - Standard (vit)
   - Varm beige
   - Mjuk blå
   - Mint grön
   - Ljus lavendel
   - Nattläge (mörkt, WCAG-kompatibelt)
4. Aktivera "Visa när skapad" för att se skapdatum på anteckningar

**Dela en anteckning:**
1. Öppna anteckningen
2. Klicka på dela-ikonen (👥)
3. Välj "Visa" eller "Redigera" för familjemedlem
4. De får omedelbart åtkomst med real-time synk!

**Importera från Google Keep:**
1. Gå till [Google Takeout](https://takeout.google.com/)
2. Välj endast "Keep" och ladda ner
3. Klicka på din profil → "📥 Importera från Google Keep"
4. Välj zip-filen och importera
5. Se [IMPORT-GUIDE.md](./IMPORT-GUIDE.md) för mer detaljer

## 📥 Import från Google Keep

Kreep har inbyggd import från Google Keep! Flytta över alla dina anteckningar enkelt.

### Snabbinstruktioner

1. **Exportera från Google:** Gå till [Google Takeout](https://takeout.google.com/), välj endast "Keep", ladda ner zip
2. **Importera:** Öppna profil → "📥 Importera från Google Keep", välj zip-filen, klicka "Importera"
3. **Klar!** Alla anteckningar importeras med färger, checklistor och bilagor

### Vad importeras?

✅ **Importeras:**
- Anteckningar med titlar och innehåll
- Checklistor med avbockningsstatus
- Färgkodning (12 Google Keep-färger mappas till motsvarande)
- Arkiverade anteckningar
- Tidsstämplar (skapad/uppdaterad)
- Bilagor (bilder, filer)

❌ **Importeras INTE:**
- Papperskorgen (trash)
- Etiketter/labels
- Påminnelser
- Delningar (blir privata anteckningar)

För detaljerad guide och felsökning, se [IMPORT-GUIDE.md](./IMPORT-GUIDE.md)

## 🔐 Säkerhet

Kreep är byggd med säkerhet i första hand, lämplig för Tailscale-åtkomst eller privata nätverk:

- ✅ **Stark autentisering:** Bcrypt-hashning (12 rounds), 12+ tecken lösenord
- ✅ **CSRF-skydd:** Alla ändringar skyddade med tokens
- ✅ **Rate limiting:** Förhindrar brute-force (5 login-försök/15 min i produktion)
- ✅ **XSS-skydd:** DOMPurify sanerar all user input
- ✅ **Säkerhetsheaders:** Helmet med CSP, HSTS, X-Frame-Options
- ✅ **Path traversal-skydd:** Säker filhantering
- ✅ **Säkra sessioner:** HTTP-only, SameSite strict cookies
- ✅ **WebSocket auth:** Validerad session på alla WS-anslutningar
- ✅ **SQL injection-skydd:** Parametriserade queries

**Rate limits (produktion):**
- Login: 5 försök / 15 minuter
- Register: 3 registreringar / timme
- Import: 10 importer / timme
- API: 100 anrop / minut

**Utvecklingsläge har generösare limits för testning.**

Läs mer i [FEATURES.md#säkerhetsfunktioner](./FEATURES.md#säkerhetsfunktioner)

## 👥 Dela anteckningar

Dela anteckningar med familjemedlemmar:

**Två behörighetsnivåer:**
- **Visa:** Kan läsa och markera checklistor
- **Redigera:** Kan göra ändringar i anteckningen

**Så här delar du:**
1. Öppna anteckningen
2. Klicka på dela-ikonen (👥)
3. Välj familjemedlem och behörighet
4. Klart! Real-time synkronisering aktiveras

**Funktioner:**
- Se vem som delat anteckningar med dig
- Real-time uppdateringar när någon ändrar
- Avatarer visar vem som äger/delar anteckningen
- Toggle mellan "Mina anteckningar" och "Delade med mig"

## 🏗️ Arkitektur

**Backend:**
- Node.js + Express
- SQLite för databas
- WebSocket (ws) för real-time synk
- Session-based autentisering

**Frontend:**
- Vanilla JavaScript (inget ramverk)
- Modulär CSS-arkitektur (6 filer)
- Responsiv design
- Real-time uppdateringar

**Säkerhet:**
- helmet - HTTP security headers
- express-rate-limit - Rate limiting
- csurf - CSRF protection
- bcryptjs - Lösenordshashning
- dompurify + jsdom - XSS prevention
- sharp - Säker bildoptimering

## 📊 Databasstruktur

```
users
  ├─ id
  ├─ username (unique)
  ├─ password_hash
  ├─ email (nullable)
  ├─ avatar_color
  ├─ background_theme
  ├─ reset_token (nullable)
  ├─ reset_token_expires (nullable)
  └─ created_at

notes
  ├─ id
  ├─ user_id → users.id
  ├─ title
  ├─ content
  ├─ color
  ├─ is_checklist
  ├─ checklist_items (JSON)
  ├─ images (JSON array)
  ├─ is_archived
  ├─ is_pinned
  ├─ created_at
  └─ updated_at

shares
  ├─ id
  ├─ note_id → notes.id (CASCADE)
  ├─ shared_by_user_id → users.id
  ├─ shared_with_user_id → users.id
  ├─ permission (view/edit)
  └─ created_at
```

## 🛠️ API Endpoints

### Autentisering
- `POST /api/auth/register` - Registrera ny användare
- `POST /api/auth/login` - Logga in
- `POST /api/auth/logout` - Logga ut
- `GET /api/me` - Kontrollera session
- `GET /api/csrf-token` - Hämta CSRF token
- `POST /api/auth/request-reset` - Begär lösenordsåterställning
- `POST /api/auth/reset-password` - Återställ lösenord

### Anteckningar
- `GET /api/notes?archived=true&shared=true` - Hämta anteckningar
- `POST /api/notes` - Skapa anteckning (CSRF)
- `PUT /api/notes/:id` - Uppdatera anteckning (CSRF)
- `DELETE /api/notes/:id` - Ta bort anteckning (CSRF)
- `PUT /api/notes/:id/pin` - Fäst/avfästa anteckning (CSRF)
- `PUT /api/notes/:id/archive` - Arkivera/återställ anteckning (CSRF)

### Delning
- `POST /api/notes/:id/share` - Dela anteckning (CSRF)
- `DELETE /api/notes/:noteId/share/:userId` - Sluta dela (CSRF)
- `GET /api/notes/:id/shares` - Hämta delningar
- `GET /api/users` - Lista användare (för delning)

### Profil & Data
- `POST /api/profile/avatar-color` - Ändra avatarfärg (CSRF)
- `POST /api/profile/background-theme` - Ändra bakgrundstema (CSRF)
- `POST /api/import` - Importera Google Keep (CSRF)
- `GET /api/export` - Exportera backup (ZIP)

## 🔧 Konfiguration

### Miljövariabler

Alla konfigurationer görs via `.env`-filen:

```env
# Obligatoriskt
SESSION_SECRET=din_säkra_secret_här

# Valfritt
PORT=3000
NODE_ENV=production

# HTTPS-konfiguration (valfritt)
# Sätt till 'true' om du kör bakom en reverse proxy med TLS-terminering
# Detta aktiverar HSTS (HTTP Strict Transport Security) headers
FORCE_HTTPS=false

# E-post (valfritt, för lösenordsåterställning)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=familj@gmail.com
SMTP_PASS=applösenord_här
EMAIL_FROM=Kreep <familj@gmail.com>
```

#### FORCE_HTTPS (Avancerad konfiguration)

**Standard:** `false`

**När ska den användas:**
- Sätt till `true` **ENDAST** om du kör bakom HTTPS reverse proxy med TLS-terminering (t.ex. Nginx, Traefik, Caddy)
- Lämna som `false` för HTTP-deployment (Docker, LAN, Tailscale utan HTTPS)

**Vad den gör:**
- När `true`: Aktiverar HSTS (HTTP Strict Transport Security) headers
- När `false`: Inaktiverar HTTPS-specifika säkerhetsheaders, tillåter att appen fungerar korrekt över HTTP

**Exempelscenarier:**

✅ **HTTP-deployment (Docker på Synology, LAN-åtkomst):**
```env
FORCE_HTTPS=false  # eller utelämna helt
```

✅ **HTTPS-deployment (bakom Nginx reverse proxy):**
```env
FORCE_HTTPS=true
```

⚠️ **Vanligt misstag:** Att sätta `FORCE_HTTPS=true` när du använder HTTP kommer orsaka anslutningsproblem.

### Ändra port

**Metod 1: Via .env-fil (REKOMMENDERAT)**

Redigera `.env`:
```env
PORT=8080
```

Starta om servern:
```bash
npm start
```

Appen körs nu på `http://localhost:8080`

**Metod 2: Via kommandoraden (tillfälligt)**

```bash
PORT=8080 npm start
```

Detta gäller endast för denna session.

**För Docker (se Docker-portkonfiguration nedan)**

### Docker-portkonfiguration

Docker har två portar att konfigurera:
- **Intern port** - porten inuti Docker-containern (där appen körs)
- **Extern port** - porten på din dator/server (där du ansluter)

**Format:** `extern:intern`

**Exempel 1: Kör appen på port 8080 utanför containern**
```yaml
# docker-compose.yml
services:
  kreep:
    ports:
      - "8080:3000"  # Extern:Intern
    # Appen körs på port 3000 inuti containern
    # Du ansluter via http://localhost:8080
```

**Exempel 2: Ändra både intern och extern port**
```yaml
services:
  kreep:
    environment:
      - PORT=8080      # Intern port ändras
    ports:
      - "8080:8080"    # Båda portarna 8080
```

**Exempel 3: Använd port 80 (standard HTTP)**
```yaml
services:
  kreep:
    ports:
      - "80:3000"      # Anslut via http://localhost (ingen port behövs)
```

**Tips:**
- Lämna intern port som 3000 om möjligt (enklare)
- Ändra endast extern port för att undvika portkonflikter
- Port 80 kräver root/admin på många system

### Datalokalisering

Data lagras i `./data/`:
- `keep.db` - SQLite databas
- `sessions/` - Sessionsdatabas
- `media/` - Importerade bilagor från Google Keep

### Rate Limiting

Justera i `server.js` (produktionsvärden):
```javascript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuter
  max: 5 // 5 försök
});
```

## 🐛 Felsökning

### Servern startar inte

**Problem:** Port 3000 redan används

**Lösning:**

**Alternativ 1: Ändra port (rekommenderat)**
```bash
# Lägg till i .env
echo "PORT=8080" >> .env
npm start
```

**Alternativ 2: Hitta och stoppa processen på port 3000**
```bash
# Hitta process på port 3000
lsof -i :3000
# Döda processen
kill -9 <PID>
```

**Alternativ 3: Tillfällig portändring**
```bash
PORT=8080 npm start
```

**Problem:** "SESSION_SECRET not configured" eller sessionsfel

**Lösning:**
- Kontrollera att du har skapat en `.env`-fil i projektets root
- Se till att `SESSION_SECRET` är satt till en lång, slumpmässig sträng
- Generera en ny secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

**Problem:** Moduler saknas eller npm-fel

**Lösning:**
```bash
# Rensa och installera om dependencies
rm -rf node_modules package-lock.json
npm install
```

### Kan inte logga in

**Problem:** Felaktigt lösenord eller användarnamn

**Lösning:**
- Kontrollera att användarnamnet är korrekt (case-sensitive)
- Om du glömt lösenordet:
  - Med e-post konfigurerad: Använd "Glömt lösenord?"
  - Utan e-post: Skapa nytt konto
- Kontrollera att caps lock inte är på

### Import fungerar inte

**Problem:** Fel filformat eller korrupt zip

**Lösning:**
- Se [IMPORT-GUIDE.md](./IMPORT-GUIDE.md) för detaljerad felsökning
- Kontrollera att filen är en Google Takeout export (.zip)
- Försök packa upp lokalt först för att verifiera integritet
- Kontrollera att zip-filen innehåller en "Keep/"-mapp

### WebSocket-fel

**Problem:** Real-time uppdateringar fungerar inte

**Lösning:**
- Kontrollera att webbläsaren stödjer WebSocket
- Uppdatera sidan (F5)
- Kontrollera serverkonsolen för fel
- Vissa proxies blockerar WebSocket - använd direkt anslutning eller Tailscale

### E-post fungerar inte

**Problem:** Lösenordsåterställning skickas inte

**Lösning:**
- Kontrollera att SMTP-inställningar är korrekta i `.env`
- För Gmail: Använd applösenord, inte vanligt lösenord
- Testa SMTP-anslutning: `node -e "require('./mailer.js')"`
- Kontrollera serverkonsolen för SMTP-fel
- Vissa providers kräver att du godkänner "mindre säkra appar"

### CSS/JS laddas inte i Docker (ERR_SSL_PROTOCOL_ERROR)

**Problem:** Servern startar men UI:t laddas inte - webbläsaren visar `ERR_SSL_PROTOCOL_ERROR` eller CSS/JS-filer laddas inte

**Symtom:**
- Webbläsaren försöker ladda resurser via HTTPS när servern körs på HTTP
- DevTools-konsolen visar "Mixed Content"-fel eller SSL-fel
- Sidan laddas men är ostyled/trasig

**Grundorsak:** HTTPS-specifika säkerhetsheaders (HSTS, upgrade-insecure-requests) är aktiverade när appen körs över HTTP

**Lösning:**

Kontrollera din `.env`-fil och se till att `FORCE_HTTPS` **inte** är satt till `true`:

```env
# För HTTP-deployment (Docker, LAN, Synology)
FORCE_HTTPS=false  # eller utelämna denna rad helt
```

Starta sedan om containern:
```bash
docker-compose down
docker-compose up -d
```

**När ska `FORCE_HTTPS=true` användas:**
- **ENDAST** när du kör bakom HTTPS reverse proxy (Nginx, Traefik, Caddy med TLS)
- För direkt HTTP-åtkomst (Docker, LAN, Tailscale utan HTTPS): lämna som `false`

Se [Miljövariabler](#miljövariabler) för mer information.

### Databasadministration

**Problem:** Behöver manuellt hantera användare (radera inaktiva konton, återställa användardata, etc.)

**Lösning:**

Kreep använder SQLite, som kan hanteras direkt med `sqlite3` kommandoradsverktyget.

**Installera sqlite3 (om det inte redan är installerat):**
```bash
# Ubuntu/Debian
sudo apt-get install sqlite3

# macOS (vanligtvis förinstallerat)
brew install sqlite3

# Windows
# Ladda ner från https://www.sqlite.org/download.html
```

**Öppna databasen:**
```bash
# Navigera till din Kreep-katalog
cd /sökväg/till/keep

# Öppna databasen
sqlite3 data/keep.db
```

**Vanliga administrativa uppgifter:**

**1. Lista alla användare:**
```sql
SELECT id, username, email, created_at FROM users;
```

**2. Radera en specifik användare (och all deras data):**
```sql
-- Först, kontrollera vad som kommer raderas
SELECT COUNT(*) FROM notes WHERE user_id = 1;  -- Ersätt 1 med användar-ID
SELECT COUNT(*) FROM shares WHERE shared_by_user_id = 1 OR shared_with_user_id = 1;

-- Radera användarens anteckningar
DELETE FROM notes WHERE user_id = 1;

-- Radera användarens delningar (både givna och mottagna)
DELETE FROM shares WHERE shared_by_user_id = 1 OR shared_with_user_id = 1;

-- Radera användaren
DELETE FROM users WHERE id = 1;
```

**3. Radera en användare via användarnamn:**
```sql
-- Hitta användar-ID först
SELECT id, username, email FROM users WHERE username = 'johndoe';

-- Följ sedan stegen i #2 ovan med korrekt användar-ID
```

**4. Återställ en användares lösenord (tvinga dem att använda lösenordsåterställning):**
```sql
-- Rensa lösenord och nollställ reset token
UPDATE users SET password = NULL, reset_token = NULL, reset_token_expires = NULL WHERE username = 'johndoe';
```

**Obs:** SQLite stödjer inte bcrypt direkt, så du kan inte manuellt sätta lösenord. Användare måste använda lösenordsåterställningsfunktionen eller registrera ett nytt konto.

**5. Visa databasschema:**
```sql
.schema users
.schema notes
.schema shares
```

**6. Avsluta sqlite3:**
```sql
.quit
```

**⚠️ Viktiga varningar:**
- **Säkerhetskopiera alltid databasen innan ändringar:** `cp data/keep.db data/keep.db.backup`
- **Stoppa servern innan manuella ändringar** för att undvika databaskorruption
- **SQLite har ingen autentisering** - vem som helst med filåtkomst kan ändra databasen
- **Testa frågor med SELECT först** innan du använder DELETE eller UPDATE
- **Användarsessioner kan förbli aktiva** efter radering - användare loggas ut vid nästa siduppdatering

**Komplett skript för användarradering:**
```bash
#!/bin/bash
# delete-user.sh - Säker användarradering med backup

USER_ID=$1

if [ -z "$USER_ID" ]; then
  echo "Användning: ./delete-user.sh <användar_id>"
  exit 1
fi

# Säkerhetskopiera databas
cp data/keep.db "data/keep.db.backup-$(date +%Y%m%d-%H%M%S)"

# Radera användare och associerad data
sqlite3 data/keep.db <<EOF
BEGIN TRANSACTION;
DELETE FROM notes WHERE user_id = $USER_ID;
DELETE FROM shares WHERE shared_by_user_id = $USER_ID OR shared_with_user_id = $USER_ID;
DELETE FROM users WHERE id = $USER_ID;
COMMIT;
SELECT 'Användare raderad. Påverkade rader:';
SELECT changes();
EOF

echo "Backup sparad. Starta om servern för att rensa sessioner."
```

Gör skriptet körbart: `chmod +x delete-user.sh`

Användning: `./delete-user.sh 5` (raderar användare med ID 5)

**7. Radera ALLA användare och börja om från början:**

Om du vill helt återställa applikationen och ta bort alla användare, anteckningar och data är den enklaste metoden att radera databasfilen. Servern kommer automatiskt skapa en ny tom databas vid nästa start.

**Metod 1: Radera databasen (enklast)**
```bash
# Stoppa servern först (Ctrl+C om den körs)

# Radera databasen
rm data/keep.db

# Valfritt: Rensa sessioner
rm -rf data/sessions/*

# Starta servern - ny databas skapas automatiskt
npm start
```

**Metod 2: Säkerhetskopiera innan radering (rekommenderat)**
```bash
# Säkerhetskopiera befintlig databas
cp data/keep.db "data/keep.db.backup-$(date +%Y%m%d-%H%M%S)"

# Radera databasen
rm data/keep.db

# Starta servern
npm start
```

**Metod 3: Radera bara innehållet, behåll databasfilen**
```bash
sqlite3 data/keep.db "DELETE FROM users; DELETE FROM notes; DELETE FROM shares; VACUUM;"
```

**För Docker:**
```bash
# Stoppa containern
docker-compose down

# Radera databasen
rm data/keep.db
rm -rf data/sessions/*

# Starta igen
docker-compose up -d
```

**Vad händer när databasen raderas:**
- ✅ `database.js` skapar automatiskt ny `keep.db` med korrekt schema
- ✅ Alla tabeller (`users`, `notes`, `shares`) skapas från början
- ✅ Inga användare finns - du kan registrera nya direkt
- ✅ Inga anteckningar eller delningar finns - helt ny start

## 🧪 Utveckling

### Utvecklingsläge med auto-restart

För utveckling med automatisk omstart vid filändringar:

```bash
# Utvecklingsläge
npm run dev
```

### Utveckling vs Produktion

Kreep har olika säkerhetsinställningar för utveckling och produktion:

**Utvecklingsläge (NODE_ENV != 'production'):**
- Mer generösa rate limits för testning
- Login: 50 försök/minut
- Register: 20 försök/minut
- API: 500 anrop/minut

**Produktionsläge:**
```bash
NODE_ENV=production npm start
```
- Striktare säkerhet
- Login: 5 försök/15 min
- Register: 3 försök/timme
- API: 100 anrop/minut

**Rekommendation:** Kör alltid i produktionsläge på servrar!

### Rensa databasen

```bash
rm data/keep.db
# Servern skapar ny databas vid nästa start
```

## 📁 Projektstruktur

```
keep/
├── server.js              # Huvudserver (1,391 rader)
├── database.js            # Databas-initialisering och schema
├── import-parser.js       # Google Keep import-parser
├── export-generator.js    # Backup-generator
├── backup-parser.js       # Backup-återställning
├── mailer.js              # E-posttjänst för lösenordsåterställning
├── package.json           # Dependencies och scripts
├── .env.example           # Exempel på miljövariabler
├── docker-compose.yml     # Docker Compose-konfiguration
├── Dockerfile             # Docker image-definition
├── .dockerignore          # Docker build-exkluderingar
├── LICENSE                # MIT-licens
├── public/
│   ├── index.html         # Frontend HTML (425 rader)
│   ├── app.js             # Frontend JavaScript (2,063 rader)
│   └── css/               # Modulär CSS-arkitektur (1,615 rader)
│       ├── base.css       # Variabler, reset, dark mode
│       ├── layout.css     # Header, grid
│       ├── components.css # Knappar, kort, formulär
│       ├── modals.css     # Modala dialoger
│       ├── utilities.css  # Hjälpklasser
│       └── debug.css      # Debug-verktyg
├── data/
│   ├── keep.db            # SQLite databas
│   ├── sessions/          # Sessionsdatabas
│   └── media/             # Importerade bilagor
└── Documentation/
    ├── README.md          # Denna fil
    ├── FEATURES.md        # Funktionsdokumentation (390 rader)
    ├── IMPORT-GUIDE.md    # Importguide (293 rader)
    └── INSTALL-SYSTEMD.md # Systemd-installation

Total kodbas: ~7,000 rader (utan dependencies)
```

## 📝 Changelog

### Version 1.1.0 (2026-01-23)

**Förbättringar:**
- 🌍 Tvåspråkig dokumentation (English + Swedish)
- 📖 Engelska som huvudspråk för internationell publik
- 🔗 Snabb navigation mellan språkversioner

### Version 1.0.0 (2025-01-23)

**Nya funktioner:**
- ✨ Dela anteckningar med familjemedlemmar (view/edit permissions)
- 👤 Anpassningsbara profiler med avatarfärger (10 färger)
- 🎨 Bakgrundsteman (5 ljusa + nattläge)
- 🌙 WCAG-kompatibelt nattläge med dämpade färger
- 📥 Import från Google Keep via Takeout
- 📤 Export/backup till ZIP
- 🔄 Real-time synkronisering via WebSocket
- 📌 Fäst viktiga anteckningar
- 🔑 Lösenordsåterställning via e-post (valfritt)
- 📅 Valfri visning av skapdatum på anteckningar
- 🖼️ Bildstöd för importerade anteckningar

**Säkerhet:**
- 🔐 CSRF-skydd på alla ändringsoperationer
- 🚫 Rate limiting på känsliga endpoints
- 🛡️ XSS-skydd med DOMPurify
- 🔒 Säkra sessioner och cookies
- 📋 Starka lösenordskrav (12+ tecken, blandade case, siffror)
- 🏗️ Security headers med Helmet (CSP, HSTS, etc.)

**Förbättringar:**
- ♻️ Komplett omskrivning av backend för säkerhet
- 🎨 Modulär CSS-arkitektur (6 filer)
- 📱 Responsiv design för mobila enheter
- ⚡ Optimerad bildhantering med Sharp
- 🚀 Cachad rendering för snabbare UI
- 📊 Komplett dokumentation (1,500+ rader)

**Arkitektur:**
- 🗄️ SQLite-databas med auto-migration
- 🔌 WebSocket för real-time updates
- 📦 Session-based autentisering
- 🐳 Docker-support

## 📄 Licens

MIT License - Se [LICENSE](./LICENSE) för detaljer.

Copyright (c) 2025 Kreep Contributors

## 🤝 Bidra

**Detta är ett hobbyprojekt som tillhandahålls "SOM DET ÄR" under MIT-licens.**

Jag delar koden fritt, men jag förbinder mig inte att granska PRs, fixa buggar eller implementera funktioner. Om du hittar problem eller vill ha förbättringar, är du välkommen att:

- **Forka projektet** och modifiera det för dina behov
- **Dela dina förbättringar** med communityn (men ingen skyldighet för mig att merga)
- **Hjälpa andra användare** i diskussioner om du vill

Ingen support eller underhåll garanteras. Detta är ett personligt projekt jag byggde för min familjs användning.

## 💡 Planerade funktioner

- [ ] Etiketter/taggar för organisering
- [ ] Påminnelser
- [ ] Bilagor på nya anteckningar (inte bara import)
- [ ] Markdown-stöd
- [ ] Export till olika format (PDF, Markdown)
- [ ] Mobil app (PWA)
- [ ] Två-faktor autentisering
- [ ] Backup-schema
- [ ] Samarbetsredigering med cursor-sync

## ❓ Support

**Ingen support tillhandahålls för detta hobbyprojekt.**

Koden delas "som den är" utan någon garanti för fixar eller svar. Du kan dock:

1. **Läs dokumentationen** i detta repo - den är omfattande
2. **Sök bland existerande issues** - någon kan ha löst ditt problem
3. **Hjälp varandra** - diskussioner i communityn är välkomna
4. **Forka och fixa** - du har full tillgång att modifiera koden

Jag byggde detta för min familj och delar det i hopp om att det hjälper andra, men jag kan inte förbinda mig att ge support eller buggfixar.

## 👨‍👩‍👧‍👦 För familjer

Kreep är särskilt designad för familjer som vill:
- 🏠 Ha full kontroll över sina data
- 🔒 Inte låta Google läsa deras anteckningar
- 💰 Spara pengar (helt gratis, öppen källkod)
- 🤝 Enkelt dela anteckningar med familjen
- 📱 Synkronisera mellan alla enheter
- 🚀 Enkelt sätta upp på hemmaserver eller NAS
- 🛡️ Ha företagssäkerhet utan företagskostnad

**Perfekt för:**
- Inköpslistor
- Recept
- Todolistor
- Familjeplanering
- Reseplaner
- Anteckningar från möten
- Idéer och brainstorming
- Lösenord och viktiga noteringar

---

**Byggd med ❤️ för familjer som värdesätter integritet och enkelhet.**

**Version 1.1.0** | [Changelog](#changelog-1) | [Licens](./LICENSE) | [Dokumentation](#dokumentation)
