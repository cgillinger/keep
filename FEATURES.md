# Keep Clone - Funktioner och säkerhet

Detta dokument beskriver alla funktioner och säkerhetsåtgärder i Keep Clone.

## 📋 Innehållsförteckning

1. [Översikt](#översikt)
2. [Säkerhetsfunktioner](#säkerhetsfunktioner)
3. [Dela anteckningar](#dela-anteckningar)
4. [Profiler och teman](#profiler-och-teman)
5. [Import från Google Keep](#import-från-google-keep)
6. [Tekniska detaljer](#tekniska-detaljer)

## Översikt

Keep Clone är en säker, självhostad Google Keep-klon designad för familjer. Applikationen erbjuder:

- ✅ Privata och delade anteckningar
- ✅ Checklistor med avbockningsbara punkter
- ✅ Färgkodning av anteckningar (12 färger)
- ✅ Fästa anteckningar
- ✅ Arkivfunktion
- ✅ Sökfunktion
- ✅ Real-time synkronisering mellan enheter
- ✅ Import från Google Keep
- ✅ Export/backup av data
- ✅ Anpassningsbara profiler (avatarfärger och bakgrundsteman)
- ✅ WCAG-kompatibelt nattläge
- ✅ Lösenordsåterställning via e-post (valfritt)
- ✅ Företagsstandard säkerhet

## Säkerhetsfunktioner

Keep Clone är byggd med säkerhet i första hand, lämplig för exponering via Tailscale eller liknande VPN-lösningar.

### 🔐 Autentisering och sessioner

**Starka lösenordskrav:**
- Minst 12 tecken
- Måste innehålla minst en stor bokstav (A-Z)
- Måste innehålla minst en liten bokstav (a-z)
- Måste innehålla minst en siffra (0-9)
- Hashas med bcrypt (12 rounds)

**Säkra sessioner:**
- HTTP-only cookies (inte åtkomliga via JavaScript)
- SameSite: Strict (skydd mot CSRF)
- 7 dagars sessionstid
- Sessionstregenerering vid login/registrering
- Säker WebSocket-autentisering

### 🛡️ CSRF-skydd

Cross-Site Request Forgery (CSRF) protection på alla ändringsoperationer:
- Token genereras vid varje session
- Valideras på server innan POST/PUT/DELETE
- Tokens roteras automatiskt
- Implementerat med `csurf` middleware

**Påverkar:**
- Skapa/uppdatera/ta bort anteckningar
- Dela/sluta dela anteckningar
- Ändra profilinställningar (avatarfärg, bakgrundstema)
- Import av Google Keep-data
- Export av backup

### 🚫 Rate limiting

Begränsningar för att förhindra brute-force och överbelastning:

| Endpoint | Gräns | Tidsperiod |
|----------|-------|------------|
| `/api/auth/login` | 5 försök | 15 minuter |
| `/api/auth/register` | 3 registreringar | 1 timme |
| `/api/import` | 10 importer | 1 timme |
| Övriga API-anrop | 100 anrop | 1 minut |

### 🔒 Säkerhetsheaders (Helmet)

Implementerade headers för webbläsarsäkerhet:

**Content Security Policy (CSP):**
- `default-src 'self'` - Endast innehåll från egen server
- `img-src 'self' data: blob:` - Bilder från server och inline data
- `style-src 'self' 'unsafe-inline'` - CSS från server och inline
- Blockerar externa scripts och resurser

**Övriga headers:**
- `Strict-Transport-Security` - Tvingar HTTPS (31536000 sekunder)
- `X-Frame-Options: DENY` - Förhindrar clickjacking
- `X-Content-Type-Options: nosniff` - Förhindrar MIME-sniffing
- `X-DNS-Prefetch-Control: off` - Inaktiverar DNS prefetch

### 🧹 Input sanitization

All användarinput saneras för att förhindra XSS-attacker:
- HTML/JavaScript-taggar rensas bort med DOMPurify
- Färgkoder valideras mot whitelist
- Filnamn saneras för path traversal-skydd
- SQL injection-skydd via parametriserade queries

### 🔐 Path traversal-skydd

Säker filhantering vid import:
- Filnamn saneras (endast a-z, 0-9, ., _, -)
- Alla filvägar valideras att vara inom tillåtet område
- `path.resolve()` används för att upptäcka traversal-försök
- Bilagor lagras med slumpmässiga filnamn

## Dela anteckningar

### Översikt

Familjemedlemmar kan dela anteckningar med varandra med två behörighetsnivåer:
- **Visa** (view): Kan läsa anteckningen men inte redigera
- **Redigera** (edit): Kan både läsa och redigera anteckningen

### Hur du delar en anteckning

1. Öppna anteckningen genom att klicka på den
2. Klicka på dela-ikonen (👥) i redigeringsmenyn
3. I delningsmodulen ser du alla familjemedlemmar
4. Klicka på "Visa" eller "Redigera" bredvid den användare du vill dela med
5. Användaren får omedelbart åtkomst till anteckningen

### Hantera delningar

**Se vem du delat med:**
- Under "Delar med" i delningsmodulen ser du alla nuvarande delningar
- Varje person visas med namn, initialer med avatarfärg och behörighetsnivå

**Ta bort delning:**
- Klicka på ✕-knappen bredvid personens namn
- Användaren förlorar omedelbart åtkomst

**Ändra behörighet:**
- Klicka på "Visa" eller "Redigera" igen för att toggla mellan behörighetsnivåer

### Se delade anteckningar

**Växla vy:**
1. I headern, klicka på "Visa delade"
2. Nu visas endast anteckningar som andra delat med dig
3. Klicka "Visa mina" för att gå tillbaka

**Identifiera delade anteckningar:**
- Anteckningar som delats **med dig** visar ägarens namn längst ner
- Anteckningar du **äger** visar antal personer du delat med (👥 2 personer)

### Behörigheter

**Visa-behörighet:**
- Kan se titel, innehåll, checklistor, färg
- Kan markera/avmarkera checklistor
- Kan INTE redigera, ta bort, arkivera eller dela vidare

**Redigera-behörighet:**
- Kan göra allt som Visa
- Kan redigera titel och innehåll
- Kan ändra färg
- Kan lägga till/ta bort checklistor
- Kan arkivera anteckningen
- Kan INTE ta bort anteckningen (endast ägaren)
- Kan INTE dela vidare (endast ägaren)

### Real-time synkronisering

Ändringar i delade anteckningar synkroniseras omedelbart:
- När någon uppdaterar en delad anteckning ser alla ändringen direkt
- Checklistor uppdateras i real-time
- WebSocket-anslutning håller alla enheter synkroniserade

## Profiler och teman

### Personliga profiler

Varje användare kan anpassa sin profil med:

**Avatarfärger (10 färger):**
- Blå (#1a73e8)
- Röd (#d93025)
- Grön (#0f9d58)
- Orange (#f29900)
- Lila (#a142f4)
- Rosa (#e91e63)
- Cyan (#00acc1)
- Ljusgrön (#7cb342)
- Mörkorange (#ff6f00)
- Djuplila (#5e35b1)

**Bakgrundsteman (6 teman):**
- **Standard** - Vit bakgrund
- **Varm beige** - Mjuk beige bakgrund (#f5f1e8)
- **Mjuk blå** - Ljusblå bakgrund (#e8f4f8)
- **Mint grön** - Ljusgrön bakgrund (#e8f5e9)
- **Ljus lavendel** - Ljuslila bakgrund (#f3e5f5)
- **Nattläge** - WCAG-kompatibelt mörkt tema (#1e1e1e)

### Anpassa din profil

1. Klicka på dina initialer i headern
2. Välj en avatarfärg från färgpaletten
3. Välj ett bakgrundstema (inkl. nattläge)
4. Aktivera/avaktivera "Visa när skapad" för datum på anteckningar

### Nattläge (Dark Mode)

**WCAG-kompatibel implementation:**
- Dämpade färger för ögonvänlig läsning
- Automatisk konvertering av anteckningsfärger till mörka varianter
- Mörka input-fält och formulär
- Reducerad ljusstyrka och kontrast
- Färgkodning bibehålls men med subtila nyanser

**Färgmappning i nattläge:**
- Vit → Mörkgrå (#303134)
- Röd → Mörk röd (#8c2f24)
- Orange → Mörk orange (#996600)
- Gul → Mörk gul (#7f6f0a)
- Och så vidare...

### Var visas profiler?

- **Header:** Dina initialer med vald avatarfärg
- **Delningsmodal:** Alla familjemedlemmars initialer med deras färger
- **Delade anteckningar:** Ägarens initialer på anteckningar som delats med dig
- **Bakgrundstema:** Appliceras på hela applikationen

### Teknisk implementation

- Avatarfärger lagras i users-tabellen (avatar_color)
- Bakgrundstema lagras i users-tabellen (background_theme)
- Temabyte triggar automatisk återrendering av alla anteckningar
- CSS-variabler används för smidig tema-switching

## Import från Google Keep

Se [IMPORT-GUIDE.md](./IMPORT-GUIDE.md) för detaljerad importguide.

**Snabböversikt:**
1. Exportera från [Google Takeout](https://takeout.google.com/)
2. Välj endast "Keep"
3. Ladda ner zip-filen
4. Klicka "📥 Importera" i Keep Clone
5. Välj zip-filen och klicka "Importera"

**Vad importeras:**
- ✅ Alla anteckningar (utom papperskorgen)
- ✅ Titlar och innehåll
- ✅ Checklistor med status
- ✅ Färger
- ✅ Arkivstatus
- ✅ Timestamps (skapad/uppdaterad)
- ✅ Bilagor (bilder, filer)

**Vad importeras INTE:**
- ❌ Anteckningar i papperskorgen
- ❌ Etiketter/labels
- ❌ Påminnelser
- ❌ Delningar (importeras som privata anteckningar)

## Tekniska detaljer

### Arkitektur

**Backend:**
- Node.js + Express
- SQLite databas med foreign keys
- WebSocket (ws) för real-time
- Session-based auth
- Bcrypt för lösenordshashning

**Frontend:**
- Vanilla JavaScript (ingen framework)
- WebSocket för live updates
- Fetch API med CSRF tokens
- Event-driven arkitektur

**Säkerhet:**
- Helmet för HTTP headers
- express-rate-limit för rate limiting
- csurf för CSRF protection
- DOMPurify för XSS prevention
- Sharp för säker bildbehandling

### Databas-schema

**users:**
```sql
- id (PRIMARY KEY)
- username (UNIQUE)
- password_hash
- email (nullable, för lösenordsåterställning)
- avatar_color
- background_theme
- reset_token (nullable)
- reset_token_expires (nullable)
- created_at
```

**notes:**
```sql
- id (PRIMARY KEY)
- user_id (FOREIGN KEY → users)
- title
- content
- color
- is_checklist
- checklist_items (JSON)
- images (JSON array)
- is_archived
- is_pinned
- created_at
- updated_at
```

**shares:**
```sql
- id (PRIMARY KEY)
- note_id (FOREIGN KEY → notes, CASCADE DELETE)
- shared_by_user_id (FOREIGN KEY → users, CASCADE DELETE)
- shared_with_user_id (FOREIGN KEY → users, CASCADE DELETE)
- permission (view/edit)
- created_at
- UNIQUE(note_id, shared_with_user_id)
```

### API Endpoints

**Autentisering:**
- `POST /api/auth/register` - Registrera ny användare
- `POST /api/auth/login` - Logga in
- `POST /api/auth/logout` - Logga ut
- `GET /api/auth/check` - Kontrollera session
- `GET /api/auth/csrf-token` - Hämta CSRF token

**Anteckningar:**
- `GET /api/notes` - Hämta alla anteckningar (query: ?shared=true)
- `POST /api/notes` - Skapa anteckning
- `PUT /api/notes/:id` - Uppdatera anteckning
- `DELETE /api/notes/:id` - Ta bort anteckning

**Delning:**
- `POST /api/notes/:id/share` - Dela anteckning
- `DELETE /api/notes/:noteId/share/:userId` - Sluta dela
- `GET /api/notes/:id/shares` - Hämta delningar
- `GET /api/users` - Lista alla användare

**Profil:**
- `POST /api/profile/avatar-color` - Ändra avatarfärg
- `POST /api/profile/background-theme` - Ändra bakgrundstema

**Import/Export:**
- `POST /api/import` - Importera Google Keep export
- `GET /api/export` - Exportera backup (ZIP)

### WebSocket-protokoll

**Klient → Server:**
```json
{
  "type": "update",
  "note": { ...noteData }
}
```

**Server → Klient:**
```json
{
  "type": "note-updated",
  "note": { ...noteData }
}
```

Alla WebSocket-meddelanden autentiseras via session-cookie.

### Filstruktur

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
│   ├── keep.db            # SQLite databas
│   ├── sessions/          # Sessionsdatabas
│   └── media/             # Importerade bilagor
└── docs/
    ├── FEATURES.md        # Denna fil
    └── IMPORT-GUIDE.md    # Importguide
```

### Prestanda

**Real-time uppdateringar:**
- WebSocket-anslutning per användare
- Broadcast vid ändringar i delade anteckningar
- Automatisk återanslutning vid nätverksavbrott

**Optimeringar:**
- Importerade bilder optimeras med Sharp
- CSS-variabler för smidig tema-switching
- Cachad rendering av anteckningar (renderedNotesMap)
- SQLite-index på user_id och note_id
- Rate limiting skyddar mot överbelastning
- WebSocket-anslutningar återanvänds

### Miljövariabler

Alla settings är hårdkodade för enkelhetens skull, men kan göras konfigurerbara:

```bash
# Exempel på möjliga miljövariabler (ej implementerat)
PORT=3000
SESSION_SECRET=random-secret-here
DB_PATH=./data/notes.db
MEDIA_PATH=./data/media
RATE_LIMIT_LOGIN=5
RATE_LIMIT_API=100
```

## Support

Om du har frågor eller problem:

1. Kolla denna dokumentation
2. Läs [IMPORT-GUIDE.md](./IMPORT-GUIDE.md) för importrelaterade frågor
3. Öppna en issue på GitHub

---

**Byggd med ❤️ för familjer som vill ha kontroll över sina data.**
