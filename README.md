<div align="center">

# Keep Clone

### A Private, Self-Hosted Google Keep Alternative

[![Version](https://img.shields.io/badge/version-1.1.0-blue?style=for-the-badge)](https://github.com/cgillinger/keep/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.17--339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-supported-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://hub.docker.com/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Express.js](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)

[![Platform](https://img.shields.io/badge/platform-linux%20%7C%20macOS%20%7C%20windows-lightgrey?style=flat-square)](#)
[![Status](https://img.shields.io/badge/status-hobby%20project-orange?style=flat-square)](#-contributing)

**A secure, self-hosted note-taking app with real-time sync, sharing, image support, and Google Keep import. Built for families who value privacy.**

[Getting Started](#-quick-start) · [Docker Setup](#-docker-recommended-for-production) · [Features](#-features) · [Documentation](#-documentation) · [🇸🇪 Svenska](./docs/README.sv.md)

</div>

---

> **Note:** This is a personal hobby project shared freely under the MIT license. No support, bug fixes, or feature requests are guaranteed. Use at your own risk. Feel free to fork and modify for your needs.

## ✨ Features

<table>
<tr>
<td>

**Core**
- 📝 Create, edit, and organize notes
- ☑️ Checkable task lists
- 🎨 12 color options
- 📌 Pin important notes
- 📦 Archive notes
- 🔍 Fast server-side search across all your notes
- 🤖 AI commands `//list` and `//ocr` (opt-in, see [AI Commands](#-ai-commands-optional))

</td>
<td>

**Collaboration**
- 👥 Share notes (view or edit)
- 🔄 Real-time sync across devices
- 👤 Custom profiles & avatars
- 🌍 7 languages supported

</td>
<td>

**Privacy & Security**
- 🔐 CSRF, XSS, SQL injection protection
- 🛡️ Rate limiting & security headers
- 🔒 Bcrypt hashing & secure sessions
- 🔑 Optional email password reset

</td>
</tr>
<tr>
<td>

**Customization**
- 🌙 WCAG-compliant night mode
- 🎨 5 light themes + dark mode
- 📅 Optional creation dates

</td>
<td>

**Data Portability**
- 📥 Import from Google Keep
- 📤 Export/backup to ZIP
- 🖼️ Image support

</td>
<td>

**Deployment**
- 🐳 Docker & Docker Compose
- 💻 Native Node.js
- 📡 Synology NAS ready
- 🔗 Tailscale compatible

</td>
</tr>
</table>

## 🚀 Quick Start

### Prerequisites

- Node.js 20.17 or later (sqlite3 6 and sharp need it; Docker image uses Node 22)
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
EMAIL_FROM=Keep Clone <your.family@gmail.com>
```

**For Gmail:**
1. Enable 2-factor authentication on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Create an app password for "Keep Clone"
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
EMAIL_FROM=Keep Clone <family@gmail.com>
```

4. **(Optional) Build minified, fingerprinted frontend bundles for production:**
```bash
npm run build
```
This generates `public/dist/`. If skipped, the server falls back to serving the unbundled source files, so it still runs — building is only for production caching/performance. (The Docker image runs this step automatically.)

5. **Start the server:**
```bash
npm start
```

5. **Open in browser:**
```
http://localhost:3000
```

### First Use

1. Click "Register"
2. Create an account (minimum 3 characters username, 5+ characters password)
3. Log in
4. Customize your profile (click on your initials):
   - Choose avatar color
   - Choose background theme (including night mode)
   - Enable/disable dates on notes
5. Start creating notes!

**What is created automatically:**
- `data/keep.db` - SQLite database (created on first start)
- `data/sessions.db` - Session database
- `data/note-images/` - Uploaded and imported images

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
- `./data/sessions.db` - Sessions
- `./data/note-images/` - Uploaded and imported images

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

**Everyone is logged out after each restart / warning about `SESSION_SECRET` in the log**
- Solution: Set a long random `SESSION_SECRET` in `.env` (see Configuration)

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

Keep Clone has built-in import from Google Keep! Move all your notes easily.

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

Keep Clone is built with security first, suitable for Tailscale access or private networks:

- ✅ **Strong authentication:** Bcrypt hashing (12 rounds), 5+ character passwords
- ✅ **CSRF protection:** Double-submit cookie (`csrf-csrf`) on all state-changing requests
- ✅ **Rate limiting:** Prevents brute-force (5 login attempts/15 min in production)
- ✅ **XSS protection:** Note text is stored as plain text and escaped on render; strict CSP (no inline scripts)
- ✅ **Security headers:** Helmet with CSP, HSTS, X-Frame-Options
- ✅ **Path traversal protection:** Safe file handling
- ✅ **Secure sessions:** HTTP-only, SameSite=Lax cookies
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
- Modular CSS architecture (7 files)
- Responsive design
- Real-time updates

**Security:**
- helmet - HTTP security headers
- express-rate-limit - Rate limiting
- csrf-csrf - CSRF protection (double-submit cookie)
- bcryptjs - Password hashing
- Strict Content-Security-Policy (no inline scripts); note text is escaped when rendered in the frontend
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
All state-changing requests (POST/PUT/DELETE) require a CSRF token in the `CSRF-Token` header (fetch it from `GET /api/csrf-token`), except `POST /api/logout`.

- `GET /api/csrf-token` - Get CSRF token
- `POST /api/register` - Register new user (CSRF)
- `POST /api/login` - Log in (CSRF)
- `POST /api/logout` - Log out (no CSRF)
- `GET /api/me` - Check session
- `GET /api/password-reset/check-config` - Is e-mail (password reset) configured?
- `POST /api/password-reset/request` - Request password reset (CSRF)
- `POST /api/password-reset/verify` - Set a new password with a reset token (CSRF)

### Notes
- `GET /api/notes?archived=true&shared=true&q=text&limit=&offset=&sortBy=` - List notes; `q` is a server-side search across all of the user's notes (not just the loaded page)
- `POST /api/notes` - Create note (CSRF)
- `PUT /api/notes/:id` - Update note (CSRF)
- `DELETE /api/notes/:id` - Delete note (soft delete, can be restored for a grace period) (CSRF)
- `POST /api/notes/:id/restore` - Restore a deleted note within the grace period (CSRF)
- `POST /api/notes/:id/pin` - Pin/unpin note (CSRF)
- `POST /api/notes/image` - Upload a note image (CSRF)
- `GET /api/notes/image/:filename` - Fetch a note image

Archiving is done through `PUT /api/notes/:id` (the `is_archived` field); there is no separate archive endpoint.

### Sharing
- `POST /api/notes/:id/share` - Share note (CSRF)
- `DELETE /api/notes/:noteId/share/:userId` - Unshare (CSRF)
- `DELETE /api/notes/:noteId/dismiss-share` - Remove a note shared with you from your own view (CSRF)
- `GET /api/notes/:id/shares` - Get shares
- `GET /api/users` - List users (for sharing)

### Profile & Data
- `POST /api/profile/avatar-color` - Change avatar color (CSRF)
- `POST /api/profile/background-theme` - Change background theme (CSRF)
- `POST /api/profile/change-password` - Change password (CSRF)
- `POST /api/import/keep` - Import Google Keep export (CSRF)
- `GET /api/backup/export` - Export backup (ZIP)

## ⬆️ Upgrading an existing installation

Upgrading from 1.4.x is in-place; the database is migrated automatically on first start. Before you upgrade:

1. **Back up `data/`** (SQLite database, sessions and images): `cp -a data data.bak-$(date +%F)`.
2. **Check `.env`:** `SESSION_SECRET` should be a real random value (see `.env.example`). If it is missing or still the placeholder, the server generates one and stores it in `data/.session-secret` — everything keeps working, but everyone is logged out once. Set `BASE_URL` if you use e-mail password reset.
3. **Node.js 20.17+** is required for bare-metal installs (the Docker image already uses Node 22). Run `npm ci` after pulling — dependencies changed (sqlite3 6, csrf-csrf, no jsdom/dompurify/nodemon).
4. Start as usual (`docker compose up -d --build`, `systemctl restart kreep` or `./start.sh`). On first start the log shows the schema migrations and, once, `Decoded HTML entities in N row(s)` — that repairs notes where `<`, `>` or `&` had been stored as HTML entities by earlier versions.
5. Ask users to **reload the page** once; a tab that was open during the upgrade gets a "session expired, try again" on its first save and then works.

Rolling back: stop the server, restore `data/` from the backup, check out the previous version, `npm ci`, start.

## 🔧 Configuration

### Environment Variables

All configurations are done via the `.env` file:

```env
# Required
SESSION_SECRET=your_secure_secret_here

# Optional
PORT=3000
NODE_ENV=production
# BASE_URL=https://keep.example.com   # used in password-reset links
# DATA_DIR=./data

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
EMAIL_FROM=Keep Clone <family@gmail.com>

# AI commands (optional, disabled by default — see "AI Commands" section)
# Enables //list and //ocr, which send attached images to Google's Gemini API.
AI_COMMANDS_ENABLED=false
GEMINI_API_KEY=
AI_RATE_LIMIT_HOURLY=10
AI_RATE_LIMIT_DAILY=50
```

#### Required / deployment variables

- `SESSION_SECRET` - **Strongly recommended.** If it is missing, shorter than 16 characters, or still the placeholder from `.env.example`, the server logs a warning and uses a random secret it generates once and stores in `DATA_DIR/.session-secret` (users must log in again the first time). Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- `BASE_URL` - Public URL of the app (e.g. `https://keep.example.com`, no trailing slash), used to build the links in password-reset e-mails. Strongly recommended when e-mail is enabled; if unset, the request's `Host` header is used.
- `DATA_DIR` - Directory for all persistent data (database, sessions, note images). Default: `./data`.
- `TRUST_PROXY` - Number of reverse-proxy hops to trust (or `true` for the whole chain), so rate limiting sees the real client IP. Default: `1` when `FORCE_HTTPS=true`, otherwise off.
- `MAX_IMAGES_PER_NOTE` - Maximum number of images per note. Default: `30`.
- `LOG_LEVEL` - Log verbosity (`error`, `warn`, `info`, `debug`). Default: `info`. See [LOGGING.md](./LOGGING.md).

#### FORCE_HTTPS (Advanced Configuration)

**Default:** `false`

**When to use:**
- Set to `true` **ONLY** if running behind HTTPS reverse proxy with TLS termination (e.g., Nginx, Traefik, Caddy)
- Leave as `false` for HTTP-only deployments (Docker, LAN, Tailscale without HTTPS)

**What it does:**
- When `true`: Enables HSTS (HTTP Strict Transport Security) headers
- When `false`: Disables HTTPS-only security headers, allowing the app to work correctly over HTTP

⚠️ **Common mistake:** Setting `FORCE_HTTPS=true` when accessing via HTTP will cause connection issues. Reverse proxy setups (Caddy, Nginx, Traefik) are covered in [DEPLOYMENT.md](./DEPLOYMENT.md).

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

Data is stored in `./data/` (override with `DATA_DIR`):
- `keep.db` - SQLite database
- `sessions.db` - Session database
- `note-images/` - Uploaded images and attachments imported from Google Keep

### Rate Limiting

Adjust in `server.js` (production values):
```javascript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // 5 attempts
});
```

## 🤖 AI Commands (Optional)

keep-clone supports two AI-powered commands that analyze attached images via Google's Gemini API. Both are **disabled by default** and require explicit configuration.

### What the commands do

- `//list` — Analyzes attached images and generates a structured checklist with category headers (Pantry, Fridge, Freezer, etc.) and a per-item confidence score from 1 (certain) to 10 (unknown).
- `//ocr` — Transcribes text from attached images verbatim, preserving line breaks and marking unreadable sections.

To use: create a note, attach one or more images, and write `//list` or `//ocr` as the note content. The note saves immediately and updates via WebSocket within 10–30 seconds.

### Privacy and what gets sent to Google

Images are sent to Google's Gemini API **only when you explicitly write `//list` or `//ocr`** in a note. Specifically:

- **Sent to Google:** the attached images (base64-encoded) and a hardcoded Swedish prompt instructing the model how to respond.
- **Never sent to Google:** the note's title, other notes, your other images, your account information, or anything else stored in keep-clone.
- **Logged locally on your server:** metadata only — timestamp, command name, user ID, note ID, duration, item count, success/failure.
- **Never logged locally:** image content, AI output, transcribed text, prompts, or note content.

Background AI analysis is not performed. The application never sends data to Gemini on its own — only when a `//command` is triggered by the user.

Review Google's [Gemini API privacy terms](https://ai.google.dev/gemini-api/terms) before enabling. Note that the free tier may use your input data to improve Google's services; paid tiers offer stricter data-handling guarantees.

### Setup

1. Get a free Gemini API key at [Google AI Studio](https://aistudio.google.com/apikey). The free tier provides ~1500 requests/day.
2. Add to your `.env`:

   ```env
   AI_COMMANDS_ENABLED=true
   GEMINI_API_KEY=AIzaSy...
   AI_RATE_LIMIT_HOURLY=10
   AI_RATE_LIMIT_DAILY=50
   ```

3. Restart the container:

   ```bash
   docker compose up -d --build
   ```

4. Verify in logs:

   ```bash
   docker logs kreep --tail 10
   # Expected: "AI-kommandon aktiva (//list, //ocr)."
   ```

If you see `AI_COMMANDS_ENABLED=true men GEMINI_API_KEY saknas. AI-kommandon avstängda.`, double-check your `.env`.

### Disabling AI commands

Set `AI_COMMANDS_ENABLED=false` (or remove the line entirely) and restart. The application falls back to text/checklist-only mode. Existing AI-generated checklists remain intact.

### Rate limits

To prevent runaway API costs from buggy clients or abuse:

- Default: 10 commands per hour, 50 per day, per user
- Override with `AI_RATE_LIMIT_HOURLY` and `AI_RATE_LIMIT_DAILY` in `.env`
- Limits reset when the server restarts

Free tier on Gemini Flash is ~1500 requests/day shared across all users on the instance. For personal use this is essentially unlimited.

### Costs

Gemini 2.5 Flash with vision is approximately $0.004 per `//list` call with 5 images. The default rate limits (50/day) cap daily exposure at $0.20 per user. The free tier covers personal use entirely.

### Troubleshooting

| Problem | Solution |
|---------|----------|
| `//list kräver minst en bifogad bild` | Attach at least one image before triggering the command |
| Note shows `🔄 Bearbetar...` for >60 seconds | Check `docker logs kreep` for Gemini errors. Common: HTTP 429 rate limit, network issues, or invalid API key |
| `AI command failed: Gemini HTTP 403` | API key is invalid or restricted. Regenerate at [Google AI Studio](https://aistudio.google.com/apikey) |
| Confidence scores look wrong | Re-trigger by editing the note and adding `//list` again. The model can be unreliable on cluttered or low-resolution images |
| Note disappears after AI processing | Should not happen in current version — if it does, check `processing_status` in DB and report as bug |

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

**Problem:** Warning about `SESSION_SECRET` in the log, or session errors

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

Keep Clone uses SQLite, which can be managed directly using the `sqlite3` command-line tool.

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
# Navigate to your Keep Clone directory
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
rm -f data/sessions.db*

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
rm -f data/sessions.db*

# Start again
docker-compose up -d
```

**What happens when database is deleted:**
- ✅ `database.js` automatically creates new `keep.db` with correct schema
- ✅ All tables (`users`, `notes`, `shares`) created from scratch
- ✅ No users exist - you can register new ones immediately
- ✅ No notes or shares exist - completely fresh start

## 🧪 Development

### Development Mode with Auto-restart (`node --watch`)

For development with automatic restart on file changes:

```bash
# Development mode
npm run dev
```

### Development vs Production

Keep Clone has different security settings for development and production:

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
├── server.js              # Main server
├── database.js            # Database initialization and schema
├── import-parser.js       # Google Keep import parser
├── export-generator.js    # Backup generator
├── backup-parser.js       # Restores a kreep backup zip (via the import dialog)
├── mailer.js              # Email service for password reset
├── package.json           # Dependencies and scripts
├── .env.example           # Example environment variables
├── docker-compose.yml     # Docker Compose configuration
├── Dockerfile             # Docker image definition
├── .dockerignore          # Docker build exclusions
├── LICENSE                # MIT license
├── public/
│   ├── index.html         # Frontend HTML (425 lines)
│   ├── app.js             # Frontend JavaScript
│   └── css/               # Modular CSS architecture (7 files)
│       ├── base.css       # Variables, reset, dark mode
│       ├── layout.css     # Header, grid
│       ├── components.css # Buttons, cards, forms
│       ├── modals.css     # Modal dialogs
│       ├── utilities.css  # Utility classes
│       ├── confidence-badge.css # OCR confidence badge
│       └── debug.css      # Debug tools
├── data/
│   ├── keep.db            # SQLite database
│   ├── sessions.db        # Session database
│   └── note-images/       # Uploaded and imported images
└── Documentation/
    ├── README.md          # This file
    ├── docs/README.sv.md  # Swedish version of this file
    ├── FEATURES.md        # Feature documentation (Swedish)
    ├── IMPORT-GUIDE.md    # Import guide
    ├── DEPLOYMENT.md      # HTTPS/HTTP and reverse proxy guide
    ├── LOGGING.md         # Logging guide
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
- 🛡️ XSS protection: note text escaped on render, strict CSP
- 🔒 Secure sessions and cookies
- 📋 Password protection with bcrypt hashing (minimum 5 characters)
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

Copyright (c) 2025 Keep Clone Contributors

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

Keep Clone is specially designed for families who want to:
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

<div align="center">

**Built with ❤️ for families who value privacy and simplicity.**

**v1.1.0** · [Changelog](#-changelog) · [License](./LICENSE) · [Documentation](#-documentation)

[⬆ Back to top](#keep-clone)

</div>
