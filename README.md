# Keep Clone - Privat Familjeanteckning

En egen, självhostad klon av Google Keep som du kan köra privat på din hemmaserver. Perfekt för familjen!

![Keep Clone](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Funktioner

- 📝 **Skapa och redigera anteckningar** - Snabbt och enkelt
- 🎨 **Färgkodning** - Organisera dina anteckningar med färger
- ☑️ **Checklistor** - Skapa att-göra listor
- 🔍 **Sök** - Hitta dina anteckningar snabbt
- 📦 **Arkivering** - Arkivera gamla anteckningar
- 👨‍👩‍👧‍👦 **Multi-användare** - Perfekt för familjen (separata konton)
- 🔄 **Realtidssynk** - Ändringar visas direkt via WebSockets
- 📥 **Import från Google Keep** - Importera alla dina befintliga anteckningar!
- 🐳 **Docker-stöd** - Enkel deployment på Linux/Synology
- 🔒 **Privat & säkert** - All data stannar på din server

## 📥 Importera från Google Keep

Keep Clone har inbyggd import från Google Keep! Så här flyttar du över dina anteckningar:

### Steg 1: Exportera från Google Keep

1. Gå till **[Google Takeout](https://takeout.google.com/)**
2. Klicka **"Avmarkera alla"**
3. Scrolla ner och markera endast **"Keep"**
4. Klicka **"Nästa steg"**
5. Välj exportformat (rekommenderat: .zip)
6. Klicka **"Skapa export"**
7. Vänta på mail från Google (kan ta några minuter till en timme)
8. Ladda ner zip-filen när den är klar

### Steg 2: Importera till Keep Clone

1. Logga in i din Keep Clone
2. Klicka på knappen **"📥 Importera från Google Keep"** i headern
3. Följ instruktionerna i dialogen
4. Välj din nedladdade Google Takeout zip-fil
5. Klicka **"Importera"**
6. Vänta medan importen körs (kan ta en stund för stora exporter)
7. Klar! Alla dina anteckningar är nu importerade

### Vad importeras?

✅ **Importeras:**
- Alla anteckningar (text)
- Titlar
- Färger (mappas till närliggande färger)
- Checklistor / att-göra-listor
- Arkiverade anteckningar
- Tidsstämplar (skapad/uppdaterad)
- Bilagor (bilder, ljud)

❌ **Importeras INTE:**
- Papperskorgen (trash)
- Etiketter/labels (planerat för framtida version)
- Delningar (sharees) - metadata sparas men funktionen finns inte än
- Påminnelser

### Importrapport

Efter importen får du en detaljerad rapport:
- Antal importerade anteckningar
- Antal checklistor
- Antal bilagor
- Eventuella fel eller varningar (t.ex. saknade bilagor)

### Tips

- 💡 **Kör en testimport först** med ett mindre Google Takeout-export för att se att allt fungerar
- 🔄 **Du kan importera flera gånger** - dubbletter skapas (ingen automatisk dedupe än)
- 📦 **Stora exporter** kan ta tid - var tålmodig!
- 🖼️ **Bilagor** kopieras till serverns media-katalog och bevaras

## 🚀 Snabbstart med Docker (Rekommenderat)

### Krav
- Docker och Docker Compose installerat på din server

### Installation

1. Klona eller ladda ner projektet:
```bash
cd /path/to/your/server
git clone <repository-url> keep-clone
cd keep-clone
```

2. Skapa en `.env` fil (valfritt):
```bash
cp .env.example .env
# Redigera .env och ändra SESSION_SECRET till något unikt
```

3. Starta applikationen:
```bash
docker-compose up -d
```

4. Öppna i webbläsaren:
```
http://your-server-ip:3000
```

### Stoppa applikationen
```bash
docker-compose down
```

### Se loggar
```bash
docker-compose logs -f
```

## 🖥️ Installation utan Docker

### Krav
- Node.js 18 eller senare
- npm

### Installation

1. Installera beroenden:
```bash
npm install
```

2. Starta servern:
```bash
npm start
```

3. För utveckling (med auto-reload):
```bash
npm run dev
```

4. Öppna i webbläsaren:
```
http://localhost:3000
```

## 📦 Synology Installation

### Med Docker via Synology DSM

1. Öppna **Docker** paketet i DSM
2. Gå till **Register** och sök efter "node"
3. Ladda ner "node:18-alpine"
4. Ladda upp projektet till din Synology (t.ex. `/volume1/docker/keep-clone`)
5. I **Docker** -> **Container**, klicka "Create"
6. Välj image "node:18-alpine"
7. Konfigurera:
   - **Volume**: Mappa `/volume1/docker/keep-clone` till `/app`
   - **Port**: Mappa lokal port `3000` till container port `3000`
   - **Command**: `sh -c "cd /app && npm install && node server.js"`
8. Starta containern

Alternativt, använd Docker Compose via SSH:
```bash
cd /volume1/docker/keep-clone
sudo docker-compose up -d
```

## 🔐 Säkerhet

### Första gången
1. Öppna applikationen i webbläsaren
2. Klicka på "Registrera dig"
3. Skapa det första användarkontot för familjen
4. Varje familjemedlem kan sedan skapa sitt eget konto

### Viktiga säkerhetsåtgärder

⚠️ **VIKTIGT för produktion:**

1. **Ändra SESSION_SECRET**:
   - Skapa en `.env` fil och sätt `SESSION_SECRET` till en slumpmässig sträng
   - Exempel: `SESSION_SECRET=din-mycket-hemliga-och-långa-slumpmässiga-sträng-här`

2. **Använd HTTPS**:
   - Sätt upp en reverse proxy (t.ex. Nginx, Traefik) med SSL/TLS
   - För Synology: använd Synologys inbyggda reverse proxy

3. **Brandvägg**:
   - Blockera extern åtkomst om du bara vill använda det lokalt
   - Öppna port 3000 endast för ditt lokala nätverk

4. **Backups**:
   - Databasen sparas i `data/keep.db`
   - Backa upp denna fil regelbundet!

## 📁 Projektstruktur

```
keep-clone/
├── server.js              # Huvudserver (Express + WebSocket)
├── database.js            # SQLite databaskonfiguration
├── package.json           # Node.js beroenden
├── Dockerfile             # Docker image definition
├── docker-compose.yml     # Docker Compose konfiguration
├── data/                  # Databas (skapas automatiskt)
│   └── keep.db           # SQLite databas
└── public/               # Frontend filer
    ├── index.html        # Huvudsida
    ├── styles.css        # Styling (Google Keep-stil)
    └── app.js            # Frontend JavaScript
```

## 🛠️ Teknisk Stack

- **Backend**: Node.js + Express
- **Databas**: SQLite (lätt, portabel, ingen extra server behövs)
- **Frontend**: Vanilla HTML/CSS/JavaScript (ingen build-process)
- **Realtid**: WebSockets för live-uppdateringar
- **Auth**: Session-baserad autentisering med bcrypt
- **Deploy**: Docker + Docker Compose

## 🌐 Nätverksinställningar

### Lokal åtkomst (samma nätverk)
Applikationen körs som standard på port 3000. Åtkomst från andra enheter i hemmet:
```
http://192.168.1.X:3000
```
(Byt X mot din servers IP-adress)

### Extern åtkomst (valfritt)
För åtkomst utanför hemmet:
1. Sätt upp port forwarding i din router (port 3000)
2. **ELLER**: Använd VPN (säkrare!)
3. **ELLER**: Använd Synology QuickConnect (om du har Synology)

⚠️ **Rekommendation**: Använd VPN istället för att öppna portar direkt mot internet!

## 🔄 Uppdatering

```bash
cd keep-clone
git pull
docker-compose down
docker-compose up -d --build
```

## 📊 Datahantering

### Backup
```bash
# Kopiera databasen
cp data/keep.db data/keep.db.backup-$(date +%Y%m%d)

# Eller med Docker
docker-compose exec keep-clone cp /app/data/keep.db /app/data/keep.db.backup
```

### Återställning
```bash
# Stoppa applikationen
docker-compose down

# Återställ databasen
cp data/keep.db.backup data/keep.db

# Starta igen
docker-compose up -d
```

## 🆘 Felsökning

### Kan inte ansluta till servern
1. Kontrollera att containern körs: `docker ps`
2. Kontrollera loggar: `docker-compose logs`
3. Kontrollera att port 3000 är öppen: `netstat -tulpn | grep 3000`

### Databas-fel
1. Kontrollera att `data/` mappen existerar
2. Kontrollera skrivbehörigheter: `ls -la data/`
3. Radera och återskapa databasen (varning: all data förloras):
   ```bash
   rm data/keep.db
   docker-compose restart
   ```

### WebSocket-fel
1. Kontrollera att du använder http:// (inte https:// om du inte har SSL)
2. Kontrollera att reverse proxy (om du använder en) stödjer WebSockets

## 📝 Användning

### Skapa anteckning
1. Klicka i "Skriv en anteckning..." fältet
2. Skriv din titel och innehåll
3. Välj färg (🎨) eller aktivera checklista (☐)
4. Klicka "Spara"

### Redigera anteckning
1. Klicka på en anteckning
2. Gör dina ändringar
3. Klicka "Uppdatera"

### Checklista
1. Klicka på ☐ ikonen när du skapar en anteckning
2. Lägg till listpunkter
3. Bocka av när du är klar!

### Arkivera
1. Öppna en anteckning
2. Klicka på 📦 ikonen
3. Visa arkiverade: Klicka "Visa arkiv" i headern

### Sök
Skriv i sökfältet i headern för att filtrera anteckningar.

## 🤝 Bidra

Detta är ett privat projekt för familjebruk. Du är välkommen att:
- Rapportera buggar
- Föreslå nya funktioner
- Skicka pull requests

## 📄 Licens

MIT License - fri att använda och modifiera!

## 🙏 Tack

Inspirerat av Google Keep, men helt självständigt byggt för privat bruk.

---

**Njut av din egen privata familjeanteckning! 🎉**

För frågor eller support, öppna en issue på GitHub.
