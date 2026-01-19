# Keep Clone - Funktioner och säkerhet

Detta dokument beskriver alla funktioner och säkerhetsåtgärder i Keep Clone.

## 📋 Innehållsförteckning

1. [Översikt](#översikt)
2. [Säkerhetsfunktioner](#säkerhetsfunktioner)
3. [Dela anteckningar](#dela-anteckningar)
4. [Profilbilder](#profilbilder)
5. [Import från Google Keep](#import-från-google-keep)
6. [Tekniska detaljer](#tekniska-detaljer)

## Översikt

Keep Clone är en säker, självhostad Google Keep-klon designad för familjer. Applikationen erbjuder:

- ✅ Privata och delade anteckningar
- ✅ Checklistor med avbockningsbara punkter
- ✅ Färgkodning av anteckningar
- ✅ Arkivfunktion
- ✅ Sökfunktion
- ✅ Real-time synkronisering mellan enheter
- ✅ Import från Google Keep
- ✅ Profilbilder för användare
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
- Ladda upp profilbilder
- Import av Google Keep-data

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
- Varje person visas med namn, profilbild och behörighetsnivå

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

## Profilbilder

### Ladda upp profilbild

1. Klicka på din profilbild-cirkel i headern (eller initialer om du inte har någon än)
2. I profilmodulen, klicka på "📷 Välj profilbild"
3. Välj en bildfil (JPG, PNG, etc.)
4. Klicka "Ladda upp"

**Krav:**
- Max filstorlek: 5MB
- Bildformat: JPG, PNG, WebP, GIF, etc.
- Bilden optimeras automatiskt till 200×200 pixlar

### Var visas profilbilder?

- **Header:** Din egen profilbild längst upp till höger
- **Delningsmodal:** Alla familjemedlemmars profilbilder när du delar
- **Delade anteckningar:** Ägarens profilbild på anteckningar som delats med dig

### Teknisk implementation

- Bilder processas med Sharp för optimal prestanda
- Automatisk storleksändring till 200×200 px
- Kvalitet: 90%
- Lagras i `data/profile-pictures/`
- Serveras via `/api/profile-picture/:filename`

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
- profile_picture
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
- `POST /api/profile-picture` - Ladda upp profilbild
- `GET /api/profile-picture/:filename` - Hämta profilbild

**Import:**
- `POST /api/import` - Importera Google Keep export

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
│   ├── notes.db           # SQLite databas
│   ├── media/             # Importerade bilagor
│   └── profile-pictures/  # Profilbilder
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
- Profilbilder cachas i webbläsaren
- Bilder optimeras till 200×200 px på server
- SQLite-index på user_id och note_id
- Begränsad antal API-anrop via rate limiting

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
