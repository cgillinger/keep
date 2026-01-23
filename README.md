# Keep Clone - Privat Google Keep för familjer

En säker, självhostad Google Keep-klon med delningsfunktioner, anpassningsbara profiler och import från Google Keep.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![Docker](https://img.shields.io/badge/docker-supported-2496ED?logo=docker&logoColor=white)
![Platform](https://img.shields.io/badge/platform-linux%20%7C%20macOS%20%7C%20windows-lightgrey)
[![GitHub issues](https://img.shields.io/github/issues/cgillinger/keep)](https://github.com/cgillinger/keep/issues)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/cgillinger/keep/pulls)

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

# Se loggar
docker logs -f keep-clone

# Stoppa och ta bort
docker stop keep-clone
docker rm keep-clone
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
docker logs keep-clone
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
- Kontrollera port: `docker-compose port keep-clone 3000`
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
  keep-clone:
    ports:
      - "8080:3000"  # Extern:Intern
    # Appen körs på port 3000 inuti containern
    # Du ansluter via http://localhost:8080
```

**Exempel 2: Ändra både intern och extern port**
```yaml
services:
  keep-clone:
    environment:
      - PORT=8080      # Intern port ändras
    ports:
      - "8080:8080"    # Båda portarna 8080
```

**Exempel 3: Använd port 80 (standard HTTP)**
```yaml
services:
  keep-clone:
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
