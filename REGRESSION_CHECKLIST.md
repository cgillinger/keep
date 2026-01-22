# Regressionschecklista för Keep

## Syfte
Denna checklista ska köras efter varje CSS/frontend-förändring för att säkerställa att ingen funktionalitet brutits.

## Testdata baseline
Innan du börjar testa, se till att ha följande testdata:
- **Kort text note** (1-2 rader)
- **Lång text note** (många rader för att testa truncation)
- **Checklist note** (både kort och lång)
- **Note med 0 bilder**
- **Note med 1 bild**
- **Note med 2 bilder**
- **Note med 3+ bilder**
- **Pinnad note**
- **Arkiverad note**
- **Delad note**
- **Notes med olika färger** (minst 3-4 olika)

## Testfall att verifiera

### 1. Autentisering
- [ ] Logga in med befintligt konto
- [ ] Logga ut
- [ ] Registrera nytt konto
- [ ] Felmeddelande vid felaktigt lösenord
- [ ] Felmeddelande vid befintlig email

### 2. Skapa och redigera notes
- [ ] Klicka i "Ta en anteckning..." fältet expanderar formulär
- [ ] Skriva text i title och content
- [ ] Välja färg från färgväljaren
- [ ] Lägga till checklist
- [ ]Togla checklist items
- [ ] Ladda upp bild(er)
- [ ] Ta bort bild
- [ ] Spara note (Stäng)

### 3. Visa notes
- [ ] Notes visas i grid layout
- [ ] Kort text visas helt
- [ ] Lång text trunceras med fade-out gradient
- [ ] Checklist visas korrekt med checkboxar
- [ ] Bilder visas korrekt (1 bild = full width, flera = grid)
- [ ] Färger appliceras korrekt på note-cards
- [ ] Pinned notes visas med pin-indicator
- [ ] Delade notes visas med share-indicator och owner info

### 4. Redigera befintlig note
- [ ] Klicka på note öppnar modal
- [ ] Alla fält innehåller befintliga värden
- [ ] Ändra text
- [ ] Ändra färg
- [ ] Lägg till/ta bort checklist
- [ ] Lägg till/ta bort bilder
- [ ] Spara ändringar
- [ ] Ändringar syns i grid

### 5. Bilder
- [ ] Klicka på bild i note öppnar fullscreen modal
- [ ] Fullscreen modal visar bild korrekt
- [ ] Stäng fullscreen modal (X eller klicka utanför)
- [ ] Flera bilder visas i grid (2 bilder = 2 kolumner, 3+ = grid)
- [ ] En bild visas full width med max höjd 200px

### 6. Dela notes
- [ ] Klicka "Dela" öppnar share modal
- [ ] Sök efter användare
- [ ] Lägg till användare med "View" permission
- [ ] Lägg till användare med "Edit" permission
- [ ] Ta bort delad användare
- [ ] Shared note visar share-indicator
- [ ] Shared note visar owner-info om det är någon annans note

### 7. Arkivera och återställ
- [ ] Arkivera note (försvinner från main view)
- [ ] Växla till "Arkiverade" view
- [ ] Arkiverad note syns i arkiverade
- [ ] Återställ note (tillbaka till main view)

### 8. Pinna och avpinna
- [ ] Pinna note (pin-indicator visas)
- [ ] Pinnade notes sorteras först
- [ ] Avpinna note (pin-indicator försvinner)

### 9. Sök
- [ ] Skriv i sökfältet
- [ ] Notes filtreras real-time
- [ ] Sök matchar både title och content
- [ ] Rensa sök visar alla notes igen

### 10. Radera
- [ ] Radera note
- [ ] Note försvinner från grid
- [ ] Bekräftelse visas

### 11. Import/Export
- [ ] Öppna profil dropdown
- [ ] Klicka "Importera backup"
- [ ] Upload JSON-fil
- [ ] Notes importeras korrekt
- [ ] Exportera backup
- [ ] JSON-fil laddas ner

### 12. Profil
- [ ] Öppna profil dropdown
- [ ] Visa profilbild/initialer
- [ ] Klicka "Min profil"
- [ ] Byt profilbild
- [ ] Välj avatar-färg
- [ ] Spara profil-ändringar

### 13. Responsivitet
- [ ] Testa i desktop (>768px)
- [ ] Testa i mobile (<768px)
- [ ] Grid anpassar sig korrekt
- [ ] Header anpassar sig korrekt
- [ ] Modaler fungerar på mobile

### 14. Hover states och animationer
- [ ] Note-card hover lyfter kortet
- [ ] Note-card hover visar checkmark
- [ ] Buttons har hover states
- [ ] Transitions är smooth (inte hackiga)

### 15. Performance
- [ ] Sidan laddar snabbt (<2s)
- [ ] Scrolling är smooth
- [ ] Ingen "jank" vid hover/animations
- [ ] Bilder laddar progressivt

## Hur man använder denna checklista

1. **Innan förändring**: Kör igenom hela listan och notera vad som fungerar
2. **Efter förändring**: Kör igenom listan igen och jämför
3. **Vid regression**: Rapportera exakt vilket steg som failar
4. **Dokumentera**: Om du hittar ett problem, dokumentera:
   - Vad du förväntade dig
   - Vad som faktiskt hände
   - Vilken CSS-förändring som orsakade det

## Debug tips
- Använd browser DevTools för att inspektera CSS
- Jämför före/efter med screenshots
- Testa i flera browsers (Chrome, Firefox, Safari)
- Testa olika skärmstorlekar (desktop, tablet, mobile)
