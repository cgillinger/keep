# GitHub Repository Setup Guide

Den här filen innehåller instruktioner för att optimera GitHub-repot för maximal synlighet och upptäckbarhet.

## 📋 Repository Topics (Labels)

Topics hjälper användare att hitta ditt repo via GitHub-sökning. Lägg till dessa via GitHub web UI:

### Steg för att lägga till topics:

1. Gå till repot på GitHub: `https://github.com/cgillinger/keep`
2. Klicka på **⚙️ (kugghjulet)** bredvid "About" i högra sidopanelen
3. Under "Topics" - lägg till följande (max 20 topics):

```
notes
keep
google-keep
self-hosted
note-taking
privacy
family
real-time
websocket
sqlite
express
nodejs
open-source
markdown
todo
checklist
dark-mode
docker
pwa
electron
```

4. Klicka **Save changes**

### Rekommenderade topics (prioriterade):
- `google-keep` - Primär nyckelord
- `self-hosted` - Viktigt för målgruppen
- `note-taking` - Bred kategori
- `privacy` - Huvudsäljargument
- `family` - Specifik målgrupp
- `nodejs` - Teknikstack
- `docker` - Deployment-metod

## 📝 Repository Description

I samma "About"-dialog, sätt beskrivningen till:

```
Self-hosted Google Keep clone with real-time sync, images, color coding, and complete data control. Perfect for families who value privacy. 🔐
```

## 🖼️ Social Preview Image

För att skapa en snygg förhandsvisning när någon delar repot:

1. Skapa en 1280x640px bild med:
   - Logotyp/namn: "Kreep"
   - Tagline: "Private Family Notes"
   - Funktioner: Real-time sync, Dark mode, Self-hosted
   - Bakgrund i Keep-färger (gul/blå)

2. Ladda upp via GitHub:
   - Settings → Social preview → Upload an image

### Verktyg för att skapa social preview:
- [Canva](https://www.canva.com/) - Templates för social media
- [Figma](https://www.figma.com/) - Professionell design
- [GitHub Social Preview Generator](https://github.com/pqt/social-preview-generator)

## 🏷️ GitHub Settings (Rekommenderat)

### Settings → General

**Features:**
- ✅ Wikis (för utökad dokumentation)
- ✅ Issues (för buggrapporter och feature requests)
- ✅ Discussions (för community-frågor)
- ✅ Projects (för roadmap)

**Pull Requests:**
- ✅ Allow squash merging
- ✅ Allow auto-merge
- ✅ Automatically delete head branches

**Archives:**
- ✅ Include Git LFS objects in archives

### Settings → Security

**Vulnerability alerts:**
- ✅ Dependabot alerts
- ✅ Dependabot security updates

**Code scanning:**
- ✅ CodeQL analysis (för open source repos)

## 📊 Repository Insights

För att förbättra repots synlighet:

### 1. Add required files (redan klart ✅):
- [x] README.md
- [x] LICENSE
- [x] .gitignore
- [x] FEATURES.md
- [x] INSTALL-SYSTEMD.md

### 2. Add optional files:
- [ ] CONTRIBUTING.md - Guide för bidragsgivare
- [ ] CODE_OF_CONDUCT.md - Community-riktlinjer
- [ ] SECURITY.md - Säkerhetsrapportering
- [ ] CHANGELOG.md - Versionshistorik
- [ ] .github/ISSUE_TEMPLATE/ - Issue-mallar
- [ ] .github/PULL_REQUEST_TEMPLATE.md - PR-mall

## 🌟 README.md Optimering (redan klart ✅)

- [x] Badges högst upp (version, license, node, docker, etc.)
- [x] Tydlig beskrivning
- [x] Funktionslista med emojis
- [x] Installation guide
- [x] Docker-instruktioner
- [x] Screenshots (överväg att lägga till)
- [x] Länk till Issues och PRs

## 🔍 SEO & Metadata (redan klart ✅)

- [x] `package.json` - description och keywords
- [x] `index.html` - meta tags (Open Graph, Twitter Cards)
- [x] README.md - badges och beskrivning

## 📱 Community Files

### CONTRIBUTING.md (exempel)
```markdown
# Bidra till Kreep

Tack för ditt intresse! Vi välkomnar bidrag.

## Hur du bidrar:
1. Forka repot
2. Skapa en feature branch (`git checkout -b feature/amazing-feature`)
3. Committa dina ändringar (`git commit -m 'Add amazing feature'`)
4. Pusha till branchen (`git push origin feature/amazing-feature`)
5. Öppna en Pull Request

## Kodstil:
- Använd 2 spaces för indentation
- Följ befintlig kodstil
- Kommentera komplex logik
- Testa dina ändringar lokalt
```

### SECURITY.md (exempel)
```markdown
# Säkerhetspolicy

## Rapportera sårbarheter

Om du hittar en säkerhetsrisk, vänligen **rapportera den privat**:

1. Gå till Security → Advisories
2. Klicka "New draft security advisory"
3. Beskriv problemet

**Publicera INTE sårbarheter som publika issues.**

## Supporterade versioner

| Version | Support |
| ------- | ------- |
| 1.0.x   | ✅ |
```

## 🚀 Marknadsföring

### Reddit Communities:
- r/selfhosted
- r/opensource
- r/privacy
- r/homelab

### Show HN (Hacker News):
- Posta med titel: "Show HN: Kreep – Self-hosted Google Keep with real-time sync"

### Product Hunt:
- Överväg att lansera på Product Hunt för bredare synlighet

## ✅ Checklista

Använd denna checklista för att säkerställa optimal repo-konfiguration:

- [ ] Repository topics tillagda (minst 10)
- [ ] Repository description satt
- [ ] Social preview image uppladdad
- [ ] Issues aktiverat
- [ ] Dependabot aktiverat
- [ ] Branch protection regler (om du samarbetar)
- [ ] CONTRIBUTING.md skapad
- [ ] SECURITY.md skapad
- [ ] CODE_OF_CONDUCT.md skapad
- [ ] Issue templates skapade
- [ ] PR template skapad

---

**Obs:** Många av dessa inställningar kräver tillgång till GitHub web UI och kan inte göras via kod-filer.
