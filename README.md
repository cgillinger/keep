# Keep Clone - Privat Google Keep för familjer

En säker, självhostad Google Keep-klon med delningsfunktioner, anpassningsbara profiler och import från Google Keep.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

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
EMAIL_FROM=Keep Clone <din.familj@gmail.com>
```

**För Gmail:**
1. Aktivera 2-faktorautentisering på ditt Google-konto
2. Gå till https://myaccount.google.com/apppasswords
3. Skapa ett applösenord för "Keep Clone"
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
EMAIL_FROM=Keep Clone <familj@gmail.com>
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

### Med Docker Compose (enklast)

1. **Skapa `.env`-fil:**
Se installationsinstruktionerna ovan för att skapa `.env` med din SESSION_SECRET och eventuell e-postkonfiguration.

2. **Använd befintlig docker-compose.yml:**
```bash
# Starta
docker-compose up -d

# Se loggar
docker-compose logs -f

# Stoppa
docker-compose down

# Uppdatera (vid ny version)
docker-compose pull
docker-compose up -d
```

3. **Åtkomst:**
```
http://localhost:3000
```

**Data sparas automatiskt i `./data/` på host-maskinen och överlever container-omstarter.**

### Manuell Docker

Om du inte vill använda docker-compose:

```bash
# Bygg image
docker build -t keep-clone .

# Kör container
docker run -d \
  --name keep-clone \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e SESSION_SECRET="din_säkra_secret_här" \
  -e NODE_ENV=production \
  --restart unless-stopped \
  keep-clone
```

### Synology NAS

**Med Docker i DSM:**

1. Öppna Container Manager (Docker) i DSM
2. Skapa projektmapp: `/docker/keep-clone`
3. Ladda upp alla projektfiler till mappen via File Station eller git
4. Skapa `.env`-fil i projektmappen:
   ```env
   SESSION_SECRET=din_säkra_secret_här
   PORT=3000
   ```
5. I Container Manager:
   - Project → Create
   - Välj projektmappen
   - Docker Compose kommer köras automatiskt
6. Starta projektet

**Tips för Synology:**
- Data lagras i projektmappen och inkluderas i Synology backups
- Använd Synology Firewall för att begränsa åtkomst
- Konfigurera omvänd proxy i DSM för HTTPS

### Tailscale-åtkomst (rekommenderat)

För säker fjärråtkomst utan att exponera servern publikt:

1. Installera Tailscale på servern/NAS
2. Installera Tailscale på dina enheter
3. Anslut till Keep Clone via Tailscale IP: `http://[tailscale-ip]:3000`
4. Ingen portforward eller DNS behövs - helt säkert!

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

Keep Clone har inbyggd import från Google Keep! Flytta över alla dina anteckningar enkelt.

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

Keep Clone är byggd med säkerhet i första hand, lämplig för Tailscale-åtkomst eller privata nätverk:

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

# E-post (valfritt, för lösenordsåterställning)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=familj@gmail.com
SMTP_PASS=applösenord_här
EMAIL_FROM=Keep Clone <familj@gmail.com>
```

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
```bash
# Hitta process på port 3000
lsof -i :3000
# Döda processen
kill -9 <PID>
# Eller använd annan port
PORT=3001 npm start
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

## 🧪 Utveckling

### Utvecklingsläge med auto-restart

För utveckling med automatisk omstart vid filändringar:

```bash
# Utvecklingsläge
npm run dev
```

### Utveckling vs Produktion

Keep Clone har olika säkerhetsinställningar för utveckling och produktion:

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
├── Dockerfile             # Docker image
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

Copyright (c) 2025 Keep Clone Contributors

## 🤝 Bidra

Detta är ett familje-projekt, men pull requests är välkomna!

1. Fork projektet
2. Skapa en feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit dina ändringar (`git commit -m 'Add some AmazingFeature'`)
4. Push till branchen (`git push origin feature/AmazingFeature`)
5. Öppna en Pull Request

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

Om du har frågor eller problem:

1. Läs dokumentationen i detta repo
2. Sök bland [GitHub Issues](https://github.com/cgillinger/keep/issues)
3. Öppna en ny issue med detaljer om ditt problem

## 👨‍👩‍👧‍👦 För familjer

Keep Clone är särskilt designad för familjer som vill:
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

**Version 1.0.0** | [Changelog](#changelog) | [Licens](./LICENSE) | [Dokumentation](#dokumentation)
