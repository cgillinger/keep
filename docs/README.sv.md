<div align="center">

# Keep Clone - Svenska

### En privat, självhostad Google Keep-alternativ

[![Version](https://img.shields.io/badge/version-1.1.0-blue?style=for-the-badge)](https://github.com/cgillinger/keep/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](../LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.17--339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-supported-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://hub.docker.com/)

[🇬🇧 English version](../README.md)

</div>

> **Obs:** Detta är ett personligt hobbyprojekt som delas fritt under MIT-licens. Ingen support, buggfixar eller feature requests garanteras. Använd på egen risk. Du är välkommen att forka och modifiera för dina behov.

## ✨ Funktioner

<table>
<tr>
<td>

**Kärna**
- 📝 Skapa, redigera och organisera anteckningar
- ☑️ Avbockningsbara uppgiftslistor
- 🎨 12 färger att välja mellan
- 📌 Fäst viktiga anteckningar
- 📦 Arkivera anteckningar
- 🔍 Snabb serverside-sökning bland alla dina anteckningar
- 🤖 AI-kommandon `//list` och `//ocr` (opt-in, se [AI-kommandon](#-ai-kommandon-valfritt))

</td>
<td>

**Samarbete**
- 👥 Dela anteckningar (visa/redigera)
- 🔄 Realtidssynk mellan enheter
- 👤 Anpassningsbara profiler & avatarer
- 🌍 7 språk

</td>
<td>

**Integritet & Säkerhet**
- 🔐 CSRF, XSS, SQL-injection-skydd
- 🛡️ Rate limiting & säkerhetsheaders
- 🔒 Bcrypt-hashning & säkra sessioner
- 🔑 Valfri lösenordsåterställning via e-post

</td>
</tr>
</table>

## 🚀 Snabbstart

### Förutsättningar

- Node.js 20.17 eller senare (krävs av sqlite3 6 och sharp; Docker-imagen använder Node 22)
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
2. Skapa ett konto (minst 3 tecken användarnamn, 5+ tecken lösenord)
3. Logga in
4. Anpassa din profil (klicka på dina initialer):
   - Välj avatarfärg
   - Välj bakgrundstema (inkl. nattläge)
   - Aktivera/avaktivera datum på anteckningar
5. Börja skapa anteckningar!

**Vad skapas automatiskt:**
- `data/keep.db` - SQLite-databasen (skapas vid första start)
- `data/sessions.db` - Sessionsdatabas
- `data/note-images/` - Uppladdade och importerade bilder

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
- `./data/sessions.db` - Sessioner
- `./data/note-images/` - Uppladdade och importerade bilder

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

**Alla loggas ut vid varje omstart / varning om `SESSION_SECRET` i loggen**
- Lösning: Sätt en lång slumpmässig `SESSION_SECRET` i `.env` (se Konfiguration)

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

- **[FEATURES.md](../FEATURES.md)** - Komplett funktions- och säkerhetsdokumentation
- **[IMPORT-GUIDE.md](../IMPORT-GUIDE.md)** - Detaljerad guide för Google Keep-import
- **[INSTALL-SYSTEMD.md](../INSTALL-SYSTEMD.md)** - Installation som systemd-tjänst på Linux

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
5. Se [IMPORT-GUIDE.md](../IMPORT-GUIDE.md) för mer detaljer

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

För detaljerad guide och felsökning, se [IMPORT-GUIDE.md](../IMPORT-GUIDE.md)

## 🔐 Säkerhet

Keep Clone är byggd med säkerhet i första hand, lämplig för Tailscale-åtkomst eller privata nätverk:

- ✅ **Stark autentisering:** Bcrypt-hashning (12 rounds), 5+ tecken lösenord
- ✅ **CSRF-skydd:** Double-submit cookie (`csrf-csrf`) på alla tillståndsändrande anrop
- ✅ **Rate limiting:** Förhindrar brute-force (5 login-försök/15 min i produktion)
- ✅ **XSS-skydd:** Anteckningstext lagras som ren text och escapas vid rendering; strikt CSP (inga inline-script)
- ✅ **Säkerhetsheaders:** Helmet med CSP, HSTS, X-Frame-Options
- ✅ **Path traversal-skydd:** Säker filhantering
- ✅ **Säkra sessioner:** HTTP-only, SameSite=Lax-cookies
- ✅ **WebSocket auth:** Validerad session på alla WS-anslutningar
- ✅ **SQL injection-skydd:** Parametriserade queries

**Rate limits (produktion):**
- Login: 5 försök / 15 minuter
- Register: 3 registreringar / timme
- Import: 10 importer / timme
- API: 100 anrop / minut

**Utvecklingsläge har generösare limits för testning.**

Läs mer i [FEATURES.md#säkerhetsfunktioner](../FEATURES.md#säkerhetsfunktioner)

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
- Modulär CSS-arkitektur (7 filer)
- Responsiv design
- Real-time uppdateringar

**Säkerhet:**
- helmet - HTTP security headers
- express-rate-limit - Rate limiting
- csrf-csrf - CSRF protection (double-submit cookie)
- bcryptjs - Lösenordshashning
- Strikt Content-Security-Policy (inga inline-script); anteckningstext escapas vid rendering i frontend
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
Alla tillståndsändrande anrop (POST/PUT/DELETE) kräver en CSRF-token i headern `CSRF-Token` (hämtas från `GET /api/csrf-token`), utom `POST /api/logout`.

- `GET /api/csrf-token` - Hämta CSRF token
- `POST /api/register` - Registrera ny användare (CSRF)
- `POST /api/login` - Logga in (CSRF)
- `POST /api/logout` - Logga ut (ingen CSRF)
- `GET /api/me` - Kontrollera session
- `GET /api/password-reset/check-config` - Är e-post (lösenordsåterställning) konfigurerad?
- `POST /api/password-reset/request` - Begär lösenordsåterställning (CSRF)
- `POST /api/password-reset/verify` - Sätt nytt lösenord med återställningstoken (CSRF)

### Anteckningar
- `GET /api/notes?archived=true&shared=true&q=text&limit=&offset=&sortBy=` - Lista anteckningar; `q` är serverside-sökning bland alla användarens anteckningar (inte bara den inladdade sidan)
- `POST /api/notes` - Skapa anteckning (CSRF)
- `PUT /api/notes/:id` - Uppdatera anteckning (CSRF)
- `DELETE /api/notes/:id` - Ta bort anteckning (mjukradering, kan återställas under en karenstid) (CSRF)
- `POST /api/notes/:id/restore` - Återställ borttagen anteckning (CSRF)
- `POST /api/notes/:id/pin` - Fäst/avfästa anteckning (CSRF)
- `POST /api/notes/image` - Ladda upp anteckningsbild (CSRF)
- `GET /api/notes/image/:filename` - Hämta anteckningsbild

Arkivering sker via `PUT /api/notes/:id` (fältet `is_archived`); det finns ingen separat arkiv-endpoint.

### Delning
- `POST /api/notes/:id/share` - Dela anteckning (CSRF)
- `DELETE /api/notes/:noteId/share/:userId` - Sluta dela (CSRF)
- `DELETE /api/notes/:noteId/dismiss-share` - Ta bort en delad anteckning från din egen vy (CSRF)
- `GET /api/notes/:id/shares` - Hämta delningar
- `GET /api/users` - Lista användare (för delning)

### Profil & Data
- `POST /api/profile/avatar-color` - Ändra avatarfärg (CSRF)
- `POST /api/profile/background-theme` - Ändra bakgrundstema (CSRF)
- `POST /api/profile/change-password` - Byt lösenord (CSRF)
- `POST /api/import/keep` - Importera Google Keep-export (CSRF)
- `GET /api/backup/export` - Exportera backup (ZIP)

## ⬆️ Uppgradera en befintlig installation

Uppgradering från 1.4.x sker på plats; databasen migreras automatiskt vid första start. Innan du uppgraderar:

1. **Säkerhetskopiera `data/`** (SQLite-databas, sessioner och bilder): `cp -a data data.bak-$(date +%F)`.
2. **Kontrollera `.env`:** `SESSION_SECRET` bör vara ett riktigt slumpvärde (se `.env.example`). Saknas det eller är det kvar som platshållare genererar servern ett och sparar det i `data/.session-secret` — allt fortsätter fungera, men alla loggas ut en gång. Sätt `BASE_URL` om du använder lösenordsåterställning via e-post.
3. **Node.js 20.17+** krävs vid installation utan Docker (Docker-imagen använder redan Node 22). Kör `npm ci` efter `git pull` — beroendena har ändrats (sqlite3 6, csrf-csrf, inte längre jsdom/dompurify/nodemon).
4. Starta som vanligt (`docker compose up -d --build`, `systemctl restart kreep` eller `./start.sh`). Vid första start visar loggen schemamigreringarna och, en enda gång, `Decoded HTML entities in N row(s)` — det reparerar anteckningar där `<`, `>` eller `&` lagrats som HTML-entiteter av tidigare versioner.
5. Be användarna **ladda om sidan** en gång; en flik som var öppen under uppgraderingen får "sessionen gick ut, försök igen" vid första sparningen och fungerar sedan.

Återställning: stoppa servern, återställ `data/` från säkerhetskopian, checka ut föregående version, `npm ci`, starta.

## 🔧 Konfiguration

### Miljövariabler

Alla konfigurationer görs via `.env`-filen:

```env
# Obligatoriskt
SESSION_SECRET=din_säkra_secret_här

# Valfritt
PORT=3000
NODE_ENV=production
# BASE_URL=https://keep.example.com   # används i återställningslänkar
# DATA_DIR=./data

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
EMAIL_FROM=Keep Clone <familj@gmail.com>

# AI-kommandon (valfritt, avstängt by default — se "AI-kommandon"-sektionen)
# Aktiverar //list och //ocr, som skickar bifogade bilder till Googles Gemini-API.
AI_COMMANDS_ENABLED=false
GEMINI_API_KEY=
AI_RATE_LIMIT_HOURLY=10
AI_RATE_LIMIT_DAILY=50
```

#### Obligatoriska / driftsrelaterade variabler

- `SESSION_SECRET` - **Starkt rekommenderad.** Saknas den, är kortare än 16 tecken eller fortfarande platshållaren från `.env.example` loggar servern en varning och använder en slumpad hemlighet som skapas en gång och sparas i `DATA_DIR/.session-secret` (användare måste logga in igen första gången). Generera en med `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- `BASE_URL` - Appens publika URL (t.ex. `https://keep.example.com`, utan avslutande snedstreck), används för länkarna i lösenordsåterställningsmejl. Rekommenderas starkt när e-post är aktiverat; annars används `Host`-headern.
- `DATA_DIR` - Katalog för all persistent data (databas, sessioner, anteckningsbilder). Standard: `./data`.
- `TRUST_PROXY` - Antal reverse-proxy-hopp att lita på (eller `true` för hela kedjan) så att rate limiting ser den riktiga klient-IP:n. Standard: `1` när `FORCE_HTTPS=true`, annars av.
- `MAX_IMAGES_PER_NOTE` - Max antal bilder per anteckning. Standard: `30`.
- `LOG_LEVEL` - Loggnivå (`error`, `warn`, `info`, `debug`). Standard: `info`. Se [LOGGING.md](../LOGGING.md).

#### FORCE_HTTPS (Avancerad konfiguration)

**Standard:** `false`

**När ska den användas:**
- Sätt till `true` **ENDAST** om du kör bakom HTTPS reverse proxy med TLS-terminering (t.ex. Nginx, Traefik, Caddy)
- Lämna som `false` för HTTP-deployment (Docker, LAN, Tailscale utan HTTPS)

**Vad den gör:**
- När `true`: Aktiverar HSTS (HTTP Strict Transport Security) headers
- När `false`: Inaktiverar HTTPS-specifika säkerhetsheaders, tillåter att appen fungerar korrekt över HTTP

⚠️ **Vanligt misstag:** Att sätta `FORCE_HTTPS=true` när du använder HTTP kommer orsaka anslutningsproblem. Reverse proxy-upplägg (Caddy, Nginx, Traefik) beskrivs i [DEPLOYMENT.md](../DEPLOYMENT.md).

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

Data lagras i `./data/` (kan ändras med `DATA_DIR`):
- `keep.db` - SQLite databas
- `sessions.db` - Sessionsdatabas
- `note-images/` - Uppladdade bilder och bilagor importerade från Google Keep

### Rate Limiting

Justera i `server.js` (produktionsvärden):
```javascript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuter
  max: 5 // 5 försök
});
```

## 🤖 AI-kommandon (valfritt)

keep-clone stödjer två AI-drivna kommandon som analyserar bifogade bilder via Googles Gemini-API. Båda är **avstängda by default** och kräver explicit konfiguration.

### Vad kommandona gör

- `//list` — Analyserar bifogade bilder och genererar en strukturerad checklista med kategori-rubriker (Skafferi, Kyl, Frys, osv.) och en säkerhetsfaktor per item från 1 (säker) till 10 (okänd).
- `//ocr` — Transkriberar text från bifogade bilder ordagrant, bevarar radbrytningar och markerar oläsliga avsnitt.

Användning: skapa en anteckning, bifoga en eller flera bilder, och skriv `//list` eller `//ocr` som anteckningens innehåll. Anteckningen sparas omedelbart och uppdateras via WebSocket inom 10–30 sekunder.

### Integritet och vad som skickas till Google

Bilder skickas till Googles Gemini-API **endast när du explicit skriver `//list` eller `//ocr`** i en anteckning. Specifikt:

- **Skickas till Google:** de bifogade bilderna (base64-kodade) och en hårdkodad svensk prompt som instruerar modellen om hur den ska svara.
- **Skickas aldrig till Google:** anteckningens titel, andra anteckningar, dina övriga bilder, din kontoinformation, eller något annat som lagras i keep-clone.
- **Loggas lokalt på din server:** endast metadata — tidsstämpel, kommandonamn, användar-ID, anteckning-ID, varaktighet, antal items, lyckad/misslyckad.
- **Loggas aldrig lokalt:** bildinnehåll, AI-output, transkriberad text, prompter, eller anteckningsinnehåll.

Ingen bakgrunds-AI-analys utförs. Applikationen skickar aldrig data till Gemini på eget initiativ — endast när ett `//command` triggas av användaren.

Granska Googles [användarvillkor för Gemini-API](https://ai.google.dev/gemini-api/terms) innan du aktiverar. Notera att gratisnivån kan använda dina indata för att förbättra Googles tjänster; betalda nivåer erbjuder striktare datahanteringsgarantier.

### Installation

1. Hämta en gratis Gemini API-nyckel på [Google AI Studio](https://aistudio.google.com/apikey). Gratisnivån ger ~1500 förfrågningar/dag.
2. Lägg till i din `.env`:

   ```env
   AI_COMMANDS_ENABLED=true
   GEMINI_API_KEY=AIzaSy...
   AI_RATE_LIMIT_HOURLY=10
   AI_RATE_LIMIT_DAILY=50
   ```

3. Starta om containern:

   ```bash
   docker compose up -d --build
   ```

4. Verifiera i loggarna:

   ```bash
   docker logs kreep --tail 10
   # Förväntat: "AI-kommandon aktiva (//list, //ocr)."
   ```

Om du ser `AI_COMMANDS_ENABLED=true men GEMINI_API_KEY saknas. AI-kommandon avstängda.`, dubbelkolla din `.env`.

### Stäng av AI-kommandon

Sätt `AI_COMMANDS_ENABLED=false` (eller ta bort raden helt) och starta om. Applikationen faller tillbaka till text/checklist-läge. Befintliga AI-genererade checklistor påverkas inte.

### Rate-gränser

För att förhindra skenande API-kostnader från buggiga klienter eller missbruk:

- Standard: 10 kommandon per timme, 50 per dygn, per användare
- Skriv över med `AI_RATE_LIMIT_HOURLY` och `AI_RATE_LIMIT_DAILY` i `.env`
- Gränserna nollställs när servern startas om

Gratisnivån på Gemini Flash är ~1500 förfrågningar/dag delat mellan alla användare på instansen. För personligt bruk är detta i praktiken obegränsat.

### Kostnader

Gemini 2.5 Flash med vision kostar ungefär $0.004 per `//list`-anrop med 5 bilder. Standard-rate-gränserna (50/dygn) begränsar daglig exponering till $0.20 per användare. Gratisnivån täcker personligt bruk helt.

### Felsökning

| Problem | Lösning |
|---------|---------|
| `//list kräver minst en bifogad bild` | Bifoga minst en bild innan du triggar kommandot |
| Anteckning visar `🔄 Bearbetar...` i >60 sekunder | Kolla `docker logs kreep` för Gemini-fel. Vanligt: HTTP 429 rate limit, nätverksproblem, eller ogiltig API-nyckel |
| `AI command failed: Gemini HTTP 403` | API-nyckeln är ogiltig eller begränsad. Generera om på [Google AI Studio](https://aistudio.google.com/apikey) |
| Säkerhetsfaktorer ser fel ut | Trigga om genom att redigera anteckningen och lägga till `//list` igen. Modellen kan vara opålitlig på röriga eller lågupplösta bilder |
| Anteckning försvinner efter AI-bearbetning | Ska inte hända i nuvarande version — om det gör det, kolla `processing_status` i databasen och rapportera som bugg |

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

**Problem:** Varning om `SESSION_SECRET` i loggen eller sessionsfel

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
- Se [IMPORT-GUIDE.md](../IMPORT-GUIDE.md) för detaljerad felsökning
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

Keep Clone använder SQLite, som kan hanteras direkt med `sqlite3` kommandoradsverktyget.

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
# Navigera till din Keep Clone-katalog
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
rm -f data/sessions.db*

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
rm -f data/sessions.db*

# Starta igen
docker-compose up -d
```

**Vad händer när databasen raderas:**
- ✅ `database.js` skapar automatiskt ny `keep.db` med korrekt schema
- ✅ Alla tabeller (`users`, `notes`, `shares`) skapas från början
- ✅ Inga användare finns - du kan registrera nya direkt
- ✅ Inga anteckningar eller delningar finns - helt ny start

## 🧪 Utveckling

### Utvecklingsläge med auto-restart (`node --watch`)

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
├── server.js              # Huvudserver
├── database.js            # Databas-initialisering och schema
├── import-parser.js       # Google Keep import-parser
├── export-generator.js    # Backup-generator
├── backup-parser.js       # Återställer en kreep-backup (via importdialogen)
├── mailer.js              # E-posttjänst för lösenordsåterställning
├── package.json           # Dependencies och scripts
├── .env.example           # Exempel på miljövariabler
├── docker-compose.yml     # Docker Compose-konfiguration
├── Dockerfile             # Docker image-definition
├── .dockerignore          # Docker build-exkluderingar
├── LICENSE                # MIT-licens
├── public/
│   ├── index.html         # Frontend HTML (425 rader)
│   ├── app.js             # Frontend JavaScript
│   └── css/               # Modulär CSS-arkitektur (7 filer)
│       ├── base.css       # Variabler, reset, dark mode
│       ├── layout.css     # Header, grid
│       ├── components.css # Knappar, kort, formulär
│       ├── modals.css     # Modala dialoger
│       ├── utilities.css  # Hjälpklasser
│       ├── confidence-badge.css # OCR-konfidensbricka
│       └── debug.css      # Debug-verktyg
├── data/
│   ├── keep.db            # SQLite databas
│   ├── sessions.db        # Sessionsdatabas
│   └── note-images/       # Uppladdade och importerade bilder
└── Documentation/
    ├── README.md          # Engelska huvud-README
    ├── docs/README.sv.md  # Denna fil
    ├── FEATURES.md        # Funktionsdokumentation
    ├── IMPORT-GUIDE.md    # Importguide
    ├── DEPLOYMENT.md      # Guide för HTTPS/HTTP och reverse proxy
    ├── LOGGING.md         # Loggguide
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
- 🛡️ XSS-skydd: anteckningstext escapas vid rendering, strikt CSP
- 🔒 Säkra sessioner och cookies
- 📋 Lösenordsskydd med bcrypt-hashning (minst 5 tecken)
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

MIT License - Se [LICENSE](../LICENSE) för detaljer.

Copyright (c) 2025 Keep Clone Contributors

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

<div align="center">

**Byggd med ❤️ för familjer som värdesätter integritet och enkelhet.**

**v1.1.0** · [Changelog](#-changelog) · [Licens](../LICENSE) · [Dokumentation](#-dokumentation)

[⬆ Tillbaka till toppen](#keep-clone---svenska) · [🇬🇧 English](../README.md)

</div>
