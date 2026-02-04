# Importguide - Google Keep till Keep Clone

Detta är en detaljerad guide för att importera dina anteckningar från Google Keep till din egen Keep Clone.

## 📋 Innehållsförteckning

1. [Snabbguide](#snabbguide)
2. [Detaljerad exportprocess](#detaljerad-exportprocess)
3. [Importprocess](#importprocess)
4. [Felsökning](#felsökning)
5. [Tekniska detaljer](#tekniska-detaljer)

## Snabbguide

**Tid:** ~10-30 minuter beroende på mängd data

1. Exportera från Google Keep via [Google Takeout](https://takeout.google.com/)
2. Ladda ner zip-filen
3. Logga in i Keep Clone
4. Klicka "📥 Importera från Google Keep"
5. Välj zip-filen
6. Klicka "Importera"
7. Klar!

## Detaljerad exportprocess

### Steg 1: Gå till Google Takeout

Öppna [https://takeout.google.com/](https://takeout.google.com/) i din webbläsare.

### Steg 2: Välj endast Keep

1. På sidan ser du alla Google-tjänster som kan exporteras
2. Klicka på **"Avmarkera alla"** högst upp
3. Scrolla ner tills du hittar **"Keep"**
4. Markera checkbox:en bredvid Keep
5. Klicka **"Nästa steg"** längst ner

### Steg 3: Välj exportinställningar

På nästa sida kan du välja:

- **Leveransmetod:** "Skicka nedladdningslänk via e-post" (rekommenderat)
- **Frekvens:** "Exportera en gång"
- **Filtyp:** ".zip" (rekommenderat)
- **Storlek:** "50 GB" (eller mindre om du vet att din export är mindre)

Klicka **"Skapa export"**

### Steg 4: Vänta på exporten

- Google börjar förbereda din export
- Du får ett mail när exporten är klar
- Detta kan ta:
  - **Få anteckningar:** 5-15 minuter
  - **Många anteckningar:** 30-60 minuter
  - **Mycket data med bilagor:** Flera timmar

### Steg 5: Ladda ner zip-filen

1. När du får mailet från Google, öppna det
2. Klicka på länken "Ladda ner export"
3. Logga in om det behövs
4. Ladda ner zip-filen till din dator

**OBS:** Exporten är giltig i 7 dagar, ladda ner den innan den går ut!

## Importprocess

### Steg 1: Öppna Keep Clone

Gå till din Keep Clone i webbläsaren:
```
http://your-server-ip:3000
```

### Steg 2: Logga in

Logga in med ditt Keep Clone-konto. Alla anteckningar kommer importeras till det kontot du är inloggad med.

### Steg 3: Öppna import-dialogen

Klicka på knappen **"📥 Importera från Google Keep"** i headern.

### Steg 4: Välj fil

1. I dialogen som öppnas, klicka på **"📁 Välj Google Keep export (.zip)"**
2. Navigera till där du laddade ner Google Takeout-filen
3. Välj zip-filen (t.ex. `takeout-20250119T120000Z-001.zip`)
4. Filnamnet och storleken visas i dialogen

### Steg 5: Starta import

1. Klicka på **"Importera"**-knappen
2. En progress-bar visar:
   - **Laddar upp fil** (0-50%)
   - **Extraherar filer** (50-60%)
   - **Importerar anteckningar** (60-100%)

### Steg 6: Vänta

Importen kan ta tid beroende på:
- Antal anteckningar
- Antal bilagor
- Filstorlek
- Serverns hastighet

**Typiska tider:**
- 10 anteckningar: ~5 sekunder
- 100 anteckningar: ~15 sekunder
- 1000 anteckningar: ~2 minuter
- 5000 anteckningar med bilagor: ~10-15 minuter

**VIKTIGT:** Stäng inte webbläsaren under importen!

### Steg 7: Granska rapporten

När importen är klar får du en rapport som visar:

```
✅ Importerade anteckningar: 245
📝 Totalt från Google Keep: 250
☑️ Checklistor: 42
📎 Bilagor: 89
⚠️ Saknade bilagor: 3
❌ Misslyckades: 5
```

Om det finns fel eller varningar, expandera sektionen för att se detaljer.

### Steg 8: Verifiera

1. Stäng import-dialogen
2. Dina anteckningar visas nu i huvudvyn
3. Testa att öppna några för att kontrollera att allt ser bra ut
4. Kolla checklistor, färger, och bilagor

## Felsökning

### "No file uploaded" eller "Invalid zip"

**Problem:** Filen kunde inte laddas upp eller är inte en giltig zip.

**Lösning:**
1. Kontrollera att du valt en .zip fil
2. Kontrollera att filen inte är korrupt (testa att packa upp lokalt först)
3. Försök ladda ner exporten från Google igen

### "Expected Takeout/Keep/ directory"

**Problem:** Zip-filen har inte rätt struktur.

**Lösning:**
1. Kontrollera att du exporterade från Google Takeout (inte någon annan tjänst)
2. Kontrollera att du valde "Keep" i exporten
3. Packa upp zip:en lokalt och verifiera att det finns en `Takeout/Keep/` mapp med JSON-filer

### Importen tar väldigt lång tid

**Problem:** Stor export eller långsam server.

**Lösning:**
- Detta är normalt! Ha tålamod
- Stäng inte webbläsaren
- Kontrollera server-loggarna: `docker-compose logs -f` eller `journalctl -u kreep -f`

### Vissa anteckningar importerades inte

**Problem:** Anteckningar i papperskorgen eller korrupta filer.

**Lösning:**
- Anteckningar i **trash** hoppar Keep Clone över automatiskt (som avsett)
- Kolla importrapporten för specifika fel
- Korrupta bilagor kan göra att enskilda anteckningar hoppar över - de loggas i felrapporten

### Bilagor saknas

**Problem:** Bilagor refereras i JSON men filen finns inte i zip:en.

**Lösning:**
- Detta kan hända om Google Takeout hade problem med exporten
- Anteckningen importeras ändå (utan bilagan)
- Försök exportera från Google igen
- Kontrollera import-rapporten för lista över saknade bilagor

### Färger ser annorlunda ut

**Problem:** Keep Clone har en lite annorlunda färgpalett än Google Keep.

**Lösning:**
- Detta är normalt! Färgerna mappas till närmaste motsvarighet
- Färgmappningen:
  - `DEFAULT` → Vit
  - `RED` → Röd/korall
  - `ORANGE` → Orange
  - `YELLOW` → Gul
  - `GREEN` → Ljusgrön
  - `TEAL` → Turkos
  - `BLUE` → Ljusblå
  - `DARK_BLUE` → Mörkblå
  - `PURPLE` → Lila
  - `PINK` → Rosa
  - `BROWN` → Brun
  - `GRAY` → Grå

### "Upload failed" eller nätverksfel

**Problem:** Nätverket bröts eller servern svarade inte.

**Lösning:**
1. Kontrollera att servern körs: `docker ps` eller `systemctl status kreep`
2. Kontrollera nätverksanslutningen
3. Försök igen
4. Om problemet kvarstår, kolla server-loggarna

### Servern kraschade under import

**Problem:** Servern tog slut på minne eller annan resursbrist.

**Lösning:**
1. Kolla server-loggarna: `docker-compose logs`
2. Öka minne om du kör Docker: redigera `docker-compose.yml` och lägg till `mem_limit: 2g` under service
3. Försök importera i mindre omgångar (dela upp exporten)
4. På Synology: öka minnet för Docker-containern i DSM-gränssnittet

## Tekniska detaljer

### Vad händer under importen?

1. **Upload (0-50%):** Zip-filen laddas upp från din webbläsare till servern via HTTP POST
2. **Extract (50-60%):** Servern packar upp zip:en till en temporär katalog
3. **Parse (60-80%):** Varje JSON-fil läses och konverteras:
   - Tidsstämplar från mikrosekunder till ISO-format
   - Färger mappas till våra färger
   - Checklistor (`listContent`) konverteras till vårt format
   - Bilagor kopieras till media-katalogen
4. **Import (80-95%):** Varje note INSERT:as i SQLite-databasen
5. **Cleanup (95-100%):** Temporära filer städas bort

### Filstruktur

Google Takeout-exporten ser ut så här:

```
takeout-XXXXXX.zip
└── Takeout/
    └── Keep/
        ├── Labels.txt            (ignoreras)
        ├── Note1.json           (importeras)
        ├── Note1.html           (ignoreras)
        ├── Note2.json
        ├── Note2.html
        ├── attachment1.jpg      (kopieras till media/)
        └── attachment2.png
```

### JSON-format

Varje anteckning är en JSON-fil med följande fält (exempel):

```json
{
  "title": "Min anteckning",
  "textContent": "Detta är innehållet",
  "color": "YELLOW",
  "isPinned": false,
  "isArchived": false,
  "isTrashed": false,
  "createdTimestampUsec": 1640000000000000,
  "userEditedTimestampUsec": 1640100000000000,
  "listContent": [
    {"text": "Punkt 1", "isChecked": false},
    {"text": "Punkt 2", "isChecked": true}
  ],
  "attachments": [
    {"filePath": "image.jpg", "mimetype": "image/jpeg"}
  ]
}
```

### Säkerhet och integritet

- Importen körs **server-side** efter att filen laddats upp
- Temporära filer raderas efter import
- Bilagor lagras i `data/media/` med slumpmässiga filnamn
- Endast JSON-filer i `Takeout/Keep/` processas
- Anteckningar i trash ignoreras automatiskt

### Prestanda

För att optimera import av stora exporter:

1. **Använd SSD:** SQLite presterar bättre på SSD
2. **Ge tillräckligt minne:** Minst 512MB, rekommenderat 1-2GB för stora exporter
3. **Använd Docker:** Docker-versionen är optimerad
4. **Importera lokalt:** Ladda upp från samma nätverk som servern (snabbare upload)

### Begränsningar

- Max filstorlek: 500MB (kan ändras i `server.js`: `multer.limits.fileSize`)
- Inga etiketter/labels importeras (saknas i vårt schema än)
- Inga påminnelser importeras (Google Keep-specifik funktion)
- Delningar (sharees) sparas som metadata men ingen delningsfunktion finns än
- Ingen automatisk dedupe - om du importerar två gånger skapas dubbletter

## Support

Om du har problem med importen:

1. Kolla denna guide först
2. Kolla server-loggarna: `docker-compose logs` eller `journalctl -u kreep`
3. Öppna en issue på GitHub med:
   - Felmeddelande
   - Server-loggar
   - Storlek på export (antal noter, filstorlek)
   - Din setup (Docker/direkt, OS, etc)

---

**Lycka till med importen! 🚀**
