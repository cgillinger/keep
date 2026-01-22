# Keep Clone - Privat Google Keep för familjer

En säker, självhostad Google Keep-klon med delningsfunktioner, profilbilder och import från Google Keep.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Funktioner

- 📝 **Anteckningar:** Skapa, redigera och organisera anteckningar
- ☑️ **Checklistor:** Avbockningsbara uppgiftslistor
- 🎨 **Färgkodning:** 12 färger att välja mellan
- 📦 **Arkiv:** Arkivera anteckningar du inte vill se just nu
- 🔍 **Sök:** Hitta anteckningar snabbt
- 👥 **Dela:** Dela anteckningar med familjemedlemmar (visa eller redigera)
- 👤 **Profilbilder:** Personliga profilbilder för alla användare
- 📥 **Import:** Importera dina befintliga anteckningar från Google Keep
- 🔄 **Real-time:** Synkroniserar automatiskt mellan alla enheter
- 🔐 **Säkerhet:** Företagsstandard säkerhet med CSRF, rate limiting, XSS-skydd m.m.

## 🚀 Snabbstart

### Förutsättningar

- Node.js 16 eller senare
- npm (medföljer Node.js)
- ca 200 MB diskutrymme (för dependencies och data)

### Installation

1. **Klona repository:**
```bash
git clone https://github.com/yourusername/keep-clone.git
cd keep-clone
```

2. **Installera dependencies:**
```bash
npm install
```

3. **Konfigurera miljövariabler:**

Skapa en `.env`-fil i projektets root-katalog (eller kopiera från `.env.example`):

```bash
cp .env.example .env
```

**Redigera `.env` och ändra följande:**

**OBLIGATORISKT:**
- `SESSION_SECRET`: Ändra till en lång, slumpmässig sträng för säkra sessioner
  ```bash
  # Generera en säker secret med:
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

**VALFRITT (för lösenordsåterställning):**
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: E-postkonfiguration
- Om dessa inte är ifyllda fungerar appen ändå, men utan lösenordsåterställning
- För Gmail: Aktivera 2FA och skapa ett applösenord på https://myaccount.google.com/apppasswords

**Exempel `.env`-fil:**
```env
SESSION_SECRET=din_säkra_slumpmässiga_sträng_här
PORT=3000

# Valfritt - E-post för lösenordsåterställning
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=din.familj@gmail.com
SMTP_PASS=ditt_applösenord_här
EMAIL_FROM=Keep Clone <din.familj@gmail.com>
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
4. Börja skapa anteckningar!

**Vad skapas automatiskt:**
- `data/notes.db` - SQLite-databasen (skapas vid första start)
- `data/sessions/` - Sessionsdatabas
- `data/profile-pictures/` - Profilbilder (skapas vid första uppladdning)
- `data/media/` - Importerade bilagor (skapas vid första import)

**Tips:** Backa upp `data/`-mappen regelbundet för att spara dina anteckningar!

## 📦 Docker (rekommenderat för produktion)

### Docker Compose

1. **Skapa `.env`-fil först:**
Se installationsinstruktionerna ovan för att skapa och konfigurera `.env`-filen.

2. **Skapa `docker-compose.yml`:**
```yaml
version: '3.8'

services:
  keep-clone:
    image: node:18-alpine
    working_dir: /app
    volumes:
      - .:/app
      - ./data:/app/data
    ports:
      - "3000:3000"
    command: sh -c "npm install && npm start"
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - NODE_ENV=production
```

3. **Starta:**
```bash
docker-compose up -d
```

**Tips för Docker:**
- `.env`-filen läses automatiskt med `env_file: - .env`
- Data sparas i `./data` på host-maskinen (överlever container-omstarter)
- Loggar: `docker-compose logs -f keep-clone`
- Stoppa: `docker-compose down`

### Synology NAS

1. Öppna Docker-paketet i DSM
2. Ladda ner "node:18-alpine" imagen
3. Skapa projektmapp på din NAS (t.ex. `/volume1/docker/keep-clone`)
4. Ladda upp projektfilerna till mappen (eller klona med git)
5. Skapa `.env`-fil i projektmappen med din SESSION_SECRET
6. Skapa en ny container:
   - Image: node:18-alpine
   - Port: 3000:3000
   - Volume: Mappa projektmappen till `/app` (t.ex. `/volume1/docker/keep-clone` → `/app`)
   - Environment: Lägg till `NODE_ENV=production` och `SESSION_SECRET=din_secret_här`
   - Command: `sh -c "cd /app && npm install && npm start"`
7. Starta containern

**OBS:** Du kan antingen sätta miljövariabler via `.env`-fil ELLER direkt i container-inställningarna.
Rekommenderat är att använda `.env`-filen för enklare hantering.

**Åtkomst via Tailscale:**
- Installera Tailscale på din NAS
- Anslut från valfri enhet på ditt Tailscale-nätverk
- Gå till `http://[nas-tailscale-ip]:3000`

## 📚 Dokumentation

- **[FEATURES.md](./FEATURES.md)** - Komplett funktions- och säkerhetsdokumentation
- **[IMPORT-GUIDE.md](./IMPORT-GUIDE.md)** - Detaljerad guide för Google Keep-import

### Snabbguider

**Dela en anteckning:**
1. Öppna anteckningen
2. Klicka på dela-ikonen (👥)
3. Välj "Visa" eller "Redigera" för familjemedlem
4. De får omedelbart åtkomst!

**Ladda upp profilbild:**
1. Klicka på din profilbild/initialer i headern
2. Välj "📷 Välj profilbild"
3. Välj en bild (max 5MB)
4. Klicka "Ladda upp"

**Importera från Google Keep:**
1. Gå till [Google Takeout](https://takeout.google.com/)
2. Välj endast "Keep" och ladda ner
3. Klicka "📥 Importera" i Keep Clone
4. Välj zip-filen och importera
5. Se [IMPORT-GUIDE.md](./IMPORT-GUIDE.md) för mer detaljer

## 📥 Import från Google Keep

Keep Clone har inbyggd import från Google Keep! Flytta över alla dina anteckningar enkelt.

### Snabbinstruktioner

1. **Exportera från Google:** Gå till [Google Takeout](https://takeout.google.com/), välj endast "Keep", ladda ner zip
2. **Importera:** Klicka "📥 Importera" i Keep Clone, välj zip-filen, klicka "Importera"
3. **Klar!** Alla anteckningar importeras med färger, checklistor och bilagor

### Vad importeras?

✅ **Importeras:**
- Anteckningar med titlar och innehåll
- Checklistor med avbockningsstatus
- Färgkodning
- Arkiverade anteckningar
- Tidsstämplar
- Bilagor (bilder, filer)

❌ **Importeras INTE:**
- Papperskorgen (trash)
- Etiketter/labels
- Påminnelser
- Delningar (blir privata)

För detaljerad guide, se [IMPORT-GUIDE.md](./IMPORT-GUIDE.md)

## 🔐 Säkerhet

Keep Clone är byggd med säkerhet i första hand, lämplig för Tailscale-åtkomst:

- ✅ **Stark autentisering:** Bcrypt-hashning, 12+ tecken lösenord
- ✅ **CSRF-skydd:** Alla ändringar skyddade med tokens
- ✅ **Rate limiting:** Förhindrar brute-force (5 login-försök/15 min)
- ✅ **XSS-skydd:** DOMPurify sanerar all input
- ✅ **Säkerhetsheaders:** Helmet med CSP, HSTS, X-Frame-Options
- ✅ **Path traversal-skydd:** Säker filhantering
- ✅ **Säkra sessioner:** HTTP-only, SameSite strict cookies
- ✅ **WebSocket auth:** Validerad session på alla WS-anslutningar

**Rate limits:**
- Login: 5 försök / 15 minuter
- Register: 3 registreringar / timme
- Import: 10 importer / timme
- API: 100 anrop / minut

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
- Profilbilder visar vem som äger/redigerar
- Toggle mellan "Mina anteckningar" och "Delade med mig"

## 🏗️ Arkitektur

**Backend:**
- Node.js + Express
- SQLite för databas
- WebSocket för real-time synk
- Session-based autentisering

**Frontend:**
- Vanilla JavaScript
- Responsiv design
- Real-time uppdateringar

**Säkerhet:**
- helmet - HTTP headers
- express-rate-limit - Rate limiting
- csurf - CSRF protection
- bcryptjs - Lösenordshashning
- dompurify - XSS prevention
- sharp - Bildoptimering

## 📊 Databasstruktur

```
users
  ├─ id
  ├─ username (unique)
  ├─ password_hash
  ├─ profile_picture
  └─ created_at

notes
  ├─ id
  ├─ user_id → users.id
  ├─ title
  ├─ content
  ├─ color
  ├─ is_checklist
  ├─ checklist_items (JSON)
  ├─ is_archived
  └─ timestamps

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
- `GET /api/auth/check` - Kontrollera session
- `GET /api/auth/csrf-token` - Hämta CSRF token

### Anteckningar
- `GET /api/notes?shared=true` - Hämta anteckningar
- `POST /api/notes` - Skapa anteckning (CSRF)
- `PUT /api/notes/:id` - Uppdatera anteckning (CSRF)
- `DELETE /api/notes/:id` - Ta bort anteckning (CSRF)

### Delning
- `POST /api/notes/:id/share` - Dela anteckning (CSRF)
- `DELETE /api/notes/:noteId/share/:userId` - Sluta dela (CSRF)
- `GET /api/notes/:id/shares` - Hämta delningar
- `GET /api/users` - Lista användare

### Profil & Import
- `POST /api/profile-picture` - Ladda upp profilbild (CSRF)
- `GET /api/profile-picture/:filename` - Hämta profilbild
- `POST /api/import` - Importera Google Keep (CSRF)

## 🔧 Konfiguration

### Portar

Standard port är 3000. Ändra i `server.js`:
```javascript
const PORT = process.env.PORT || 3000;
```

### Datalokalisering

Data lagras i `./data/`:
- `notes.db` - SQLite databas
- `media/` - Importerade bilagor
- `profile-pictures/` - Profilbilder

### Rate Limiting

Justera i `server.js`:
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
- Skapa nytt konto om du glömt lösenordet
- Kontrollera att caps lock inte är på

### Import fungerar inte

**Problem:** Fel filformat eller korrupt zip

**Lösning:**
- Se [IMPORT-GUIDE.md](./IMPORT-GUIDE.md) för detaljerad felsökning
- Kontrollera att filen är en Google Takeout export (.zip)
- Försök packa upp lokalt först för att verifiera integritet

### WebSocket-fel

**Problem:** Real-time uppdateringar fungerar inte

**Lösning:**
- Kontrollera att webbläsaren stödjer WebSocket
- Uppdatera sidan (F5)
- Kontrollera serverkonsolen för fel
- Vissa proxies blockerar WebSocket - använd direkt anslutning

## 🧪 Utveckling

### Utvecklingsläge med auto-restart

För utveckling med automatisk omstart vid filändringar:

```bash
# Installera nodemon globalt (valfritt, redan i devDependencies)
npm install -g nodemon

# Starta i utvecklingsläge
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

**Rekommendation:** Kör alltid i produktionsläge på publika servrar!

### Testa import-funktionen

```bash
node test-import.js /path/to/google-takeout.zip
```

### Rensa databasen

```bash
rm data/notes.db
# Servern skapar ny databas vid nästa start
```

## 📁 Projektstruktur

```
keep-clone/
├── server.js              # Huvudserver med alla endpoints
├── database.js            # Databas-initialisering och schema
├── import-parser.js       # Google Keep import-parser
├── package.json           # Dependencies
├── public/
│   ├── index.html         # Frontend HTML
│   ├── app.js             # Frontend JavaScript
│   └── styles.css         # CSS styling
├── data/
│   ├── notes.db           # SQLite databas
│   ├── media/             # Importerade bilagor
│   └── profile-pictures/  # Profilbilder
└── docs/
    ├── README.md          # Denna fil
    ├── FEATURES.md        # Funktionsdokumentation
    └── IMPORT-GUIDE.md    # Importguide
```

## 📝 Changelog

### Version 1.0.0 (2025-01-19)

**Nya funktioner:**
- ✨ Dela anteckningar med familjemedlemmar (view/edit permissions)
- 👤 Profilbilder med automatisk optimering
- 📥 Import från Google Keep via Takeout
- 🔄 Real-time synkronisering via WebSocket

**Säkerhet:**
- 🔐 CSRF-skydd på alla ändringsoperationer
- 🚫 Rate limiting på känsliga endpoints
- 🛡️ XSS-skydd med DOMPurify
- 🔒 Säkra sessioner och cookies
- 📋 Starka lösenordskrav (12+ tecken)
- 🏗️ Security headers med Helmet

**Förbättringar:**
- ♻️ Komplett omskrivning av backend för säkerhet
- 🎨 Förbättrat UI med profilbilder och delningsindikatorer
- 📱 Responsiv design för mobila enheter
- ⚡ Optimerad bildhantering med Sharp

## 📄 Licens

MIT License - Se [LICENSE](./LICENSE) för detaljer.

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
- [ ] Export till olika format
- [ ] Mobil app (PWA)
- [ ] Mörkt tema
- [ ] Två-faktor autentisering

## ❓ Support

Om du har frågor eller problem:

1. Läs dokumentationen i detta repo
2. Sök bland [GitHub Issues](https://github.com/yourusername/keep-clone/issues)
3. Öppna en ny issue med detaljer om ditt problem

## 👨‍👩‍👧‍👦 För familjer

Keep Clone är särskilt designad för familjer som vill:
- 🏠 Ha full kontroll över sina data
- 🔒 Inte låta Google läsa deras anteckningar
- 💰 Spara pengar (helt gratis)
- 🤝 Enkelt dela anteckningar med familjen
- 📱 Synkronisera mellan alla enheter
- 🚀 Enkelt sätta upp på hemmaserver eller NAS

**Perfect för:**
- Inköpslistor
- Recept
- Todolistor
- Familjeplanering
- Reseplaner
- Vanliga noteringar

---

**Byggd med ❤️ för familjer som värdesätter integritet och enkelhet.**
