# Deployment Guide - HTTPS vs HTTP Konfiguration

## Översikt

Keep Clone kan köras i olika miljöer med olika säkerhetskrav. Denna guide hjälper dig att välja rätt konfiguration.

---

## Snabbstart - Välj Din Miljö

| Miljö | HTTPS/HTTP | Session Secure | Rekommendation |
|-------|------------|----------------|----------------|
| **Lokal utveckling** | HTTP | `secure: false` | ✅ Nuvarande config |
| **Hemmanätverk** | HTTP | `secure: false` | ✅ OK med VPN/firewall |
| **Bakom reverse proxy** | HTTPS (proxy) + HTTP (app) | `secure: false` | ⚠️ Läs "Reverse Proxy" |
| **Direkt exponerad** | HTTPS | `secure: true` | ⚠️ Kräver certifikat |
| **Produktion (internet)** | HTTPS | `secure: true` | ⚠️ OBLIGATORISKT |

---

## 1. Lokal Utveckling (HTTP)

### När detta passar:
- Du utvecklar lokalt på `localhost` eller `127.0.0.1`
- Ingen exponering till nätverk
- Snabb utveckling utan certifikat

### Nuvarande Konfiguration (Standardinställning)

**`server.js`:**
```javascript
cookie: {
  secure: false,        // ✅ Tillåter HTTP
  httpOnly: true,       // ✅ Skydd mot XSS
  sameSite: 'lax',      // ✅ CSRF-skydd
  maxAge: 7 * 24 * 60 * 60 * 1000
}
```

### Starta servern:

```bash
node server.js
# Servern körs på http://localhost:8097
```

### ✅ Fördelar:
- Enkel setup
- Ingen certifikathantering
- Snabb iteration

### ⚠️ Nackdelar:
- **INTE** säker för internet-exponering
- Session cookies kan inte markeras som "secure"
- Trafik är okrypterad

---

## 2. Hemmanätverk (HTTP)

### När detta passar:
- Privat nätverk (192.168.x.x)
- Endast familjemedlemmar har åtkomst
- Skyddat av router/firewall
- Ingen exponering till internet

### Konfiguration

**Samma som lokal utveckling:**
```javascript
cookie: {
  secure: false,  // HTTP OK på privat nätverk
  sameSite: 'lax'
}
```

### Starta servern på specifik IP:

**`server.js`:** (lägg till före `server.listen`)
```javascript
const HOST = '0.0.0.0';  // Lyssna på alla interfaces
const PORT = process.env.PORT || 8097;

server.listen(PORT, HOST, () => {
  logger.info(`Keep Clone running on http://0.0.0.0:${PORT}`);
});
```

### Åtkomst från andra enheter:

```bash
# Hitta din server-IP
ip addr show  # Linux
ifconfig      # macOS

# Anslut från annan enhet på samma nätverk
http://192.168.1.100:8097
```

### ✅ Fördelar:
- Enkel setup för hela familjen
- Ingen HTTPS-komplexitet
- Fungerar på lokalt nätverk

### ⚠️ Nackdelar:
- Trafik är okrypterad (på lokalt nät)
- Ej säker om nätverk komprometteras
- Inga moderna browser features (PWA, etc.)

### 🔒 Säkerhetsrekommendationer:
1. **Starka lösenord** - Minst 12 tecken
2. **Begränsa nätverksåtkomst** - Router firewall
3. **VPN** - För åtkomst utifrån (se avsnitt 5)
4. **Håll servern uppdaterad** - `npm update`

---

## 3. Bakom Reverse Proxy (Rekommenderat för Produktion)

### När detta passar:
- Exponering till internet
- Flera applikationer på samma server
- Automatisk HTTPS-hantering (Let's Encrypt)
- Load balancing eller extra säkerhet

### Arkitektur:

```
Internet → HTTPS (443) → Reverse Proxy (nginx/Caddy/Traefik)
                              ↓
                         HTTP (8097) → Keep Clone
```

### 3A. Med Caddy (Enklast)

#### Installation:

```bash
# Debian/Ubuntu
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

#### Caddyfile (`/etc/caddy/Caddyfile`):

```caddy
keep.example.com {
    reverse_proxy localhost:8097

    # Automatisk HTTPS via Let's Encrypt
    # Inget mer behövs!
}
```

#### Starta:

```bash
sudo systemctl restart caddy
sudo systemctl status caddy
```

#### Keep Clone Konfiguration:

**Behåll `secure: false`** eftersom Keep Clone får HTTP från Caddy:

```javascript
cookie: {
  secure: false,  // ✅ App får HTTP från Caddy
  sameSite: 'lax'
}
```

#### ✅ Caddy fördelar:
- **Automatisk HTTPS** (Let's Encrypt)
- **Auto-förnyelse** av certifikat
- Minimal konfiguration
- HTTP/2 och HTTP/3 support

---

### 3B. Med Nginx

#### Installation:

```bash
sudo apt install nginx certbot python3-certbot-nginx
```

#### Nginx Config (`/etc/nginx/sites-available/keep`):

```nginx
server {
    listen 80;
    server_name keep.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name keep.example.com;

    # SSL Certificate (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/keep.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/keep.example.com/privkey.pem;

    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Reverse Proxy
    location / {
        proxy_pass http://localhost:8097;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # WebSocket support
        proxy_read_timeout 86400;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:8097;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Aktivera och få certifikat:

```bash
# Aktivera site
sudo ln -s /etc/nginx/sites-available/keep /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Få Let's Encrypt certifikat
sudo certbot --nginx -d keep.example.com

# Auto-renewal (redan aktiverad)
sudo certbot renew --dry-run
```

---

### 3C. Med Traefik (Docker-vänlig)

#### docker-compose.yml:

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=you@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./letsencrypt:/letsencrypt

  keep-clone:
    build: .
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.keep.rule=Host(`keep.example.com`)"
      - "traefik.http.routers.keep.entrypoints=websecure"
      - "traefik.http.routers.keep.tls.certresolver=letsencrypt"
      - "traefik.http.services.keep.loadbalancer.server.port=8097"
```

---

### ⚠️ VIKTIGT för Reverse Proxy:

#### Trust Proxy Settings

**I `server.js`, lägg till:**

```javascript
// Trust proxy (nginx/Caddy sätter X-Forwarded-* headers)
app.set('trust proxy', 1);

// Session config
const sessionConfig = {
  // ... existing config ...
  cookie: {
    secure: false,  // App får HTTP, proxy hanterar HTTPS
    sameSite: 'lax',
    // ... rest ...
  },
  proxy: true  // ✅ Viktigt för reverse proxy
};
```

#### Varför `secure: false`?

```
Internet ----HTTPS----> Proxy ----HTTP----> Keep Clone
                       (443)               (8097)
```

- Keep Clone får **HTTP** från proxyn
- Om `secure: true`: Cookies fungerar ej (förväntar HTTPS)
- Proxyn hanterar HTTPS, inte appen

---

## 4. Direkt HTTPS (Utan Proxy)

### När detta passar:
- Ingen reverse proxy tillgänglig
- Enkel setup med eget certifikat
- VPS/dedicated server

### Förutsättningar:
- SSL certifikat (Let's Encrypt, självgenererat, eller köpt)
- Domännamn som pekar till servern

### 4A. Med Let's Encrypt (Certbot standalone)

#### Få certifikat:

```bash
# Installera certbot
sudo apt install certbot

# Stoppa Keep Clone om den lyssnar på port 80
# Certbot behöver port 80 för verifiering

# Få certifikat
sudo certbot certonly --standalone -d keep.example.com

# Certifikat sparas i:
# /etc/letsencrypt/live/keep.example.com/fullchain.pem
# /etc/letsencrypt/live/keep.example.com/privkey.pem
```

#### Uppdatera server.js:

```javascript
const fs = require('fs');
const https = require('https');

// SSL Options
let server;
const isHttps = fs.existsSync('/etc/letsencrypt/live/keep.example.com/fullchain.pem');

if (isHttps) {
  const sslOptions = {
    cert: fs.readFileSync('/etc/letsencrypt/live/keep.example.com/fullchain.pem'),
    key: fs.readFileSync('/etc/letsencrypt/live/keep.example.com/privkey.pem')
  };

  server = https.createServer(sslOptions, app);

  // Session config för HTTPS
  sessionConfig.cookie.secure = true;  // ✅ Nu kräver HTTPS

} else {
  server = http.createServer(app);
  sessionConfig.cookie.secure = false;
}

// Rest of server setup...
```

#### Auto-förnyelse:

```bash
# Lägg till cron job
sudo crontab -e

# Lägg till denna rad (förnya varje måndag kl 3:00)
0 3 * * 1 certbot renew --quiet --deploy-hook "systemctl restart keep-clone"
```

### 4B. Med Självgenererat Certifikat (ENDAST för test)

⚠️ **Varning**: Webbläsare kommer att varna för osäkert certifikat!

```bash
# Generera självgenererat certifikat
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Använd i server.js
const sslOptions = {
  cert: fs.readFileSync('./cert.pem'),
  key: fs.readFileSync('./key.pem')
};
```

---

## 5. VPN-åtkomst till Hemmanätverk

### När detta passar:
- Vill köra HTTP på hemmanätverk
- Säker åtkomst utifrån
- Ingen HTTPS-komplexitet

### Med WireGuard (Rekommenderat)

#### Installation på server:

```bash
sudo apt install wireguard

# Generera nycklar
wg genkey | tee privatekey | wg pubkey > publickey

# Config: /etc/wireguard/wg0.conf
[Interface]
PrivateKey = <server_private_key>
Address = 10.0.0.1/24
ListenPort = 51820

[Peer]
PublicKey = <client_public_key>
AllowedIPs = 10.0.0.2/32
```

#### Klient-konfiguration:

```bash
[Interface]
PrivateKey = <client_private_key>
Address = 10.0.0.2/24

[Peer]
PublicKey = <server_public_key>
Endpoint = your-public-ip:51820
AllowedIPs = 192.168.1.0/24, 10.0.0.0/24
```

#### Starta:

```bash
sudo systemctl start wg-quick@wg0
sudo systemctl enable wg-quick@wg0
```

#### Anslut till Keep Clone via VPN:

```
VPN ansluten → http://192.168.1.100:8097
```

### ✅ Fördelar:
- Krypterad tunnel
- Ingen HTTPS-komplexitet i appen
- Säker åtkomst utifrån

---

## 6. Säkerhetsöverväganden

### Session Security Matrix

| Scenario | `secure` | `sameSite` | `httpOnly` | Risk |
|----------|----------|------------|------------|------|
| **HTTP (lokal dev)** | false | lax | true | ⚠️ Låg (lokalt) |
| **HTTP (hemmanät)** | false | lax | true | ⚠️ Medium (okrypterad LAN) |
| **HTTP (internet)** | false | lax | true | 🔴 HÖG - UNDVIK! |
| **HTTPS (direkt)** | true | lax | true | ✅ Låg |
| **HTTPS (via proxy)** | false* | lax | true | ✅ Låg (proxy hanterar TLS) |

*\*App får HTTP från proxy, men användare får HTTPS*

### Cookie Attributes Förklaring

#### `secure: true/false`
- **true**: Cookie skickas ENDAST över HTTPS
- **false**: Cookie skickas över HTTP och HTTPS
- **När true**: Kräver HTTPS, annars fungerar inte login

#### `httpOnly: true` (ALLTID)
- Cookie ej åtkomlig via JavaScript
- Skydd mot XSS-attacker
- **ALDRIG** sätt till false

#### `sameSite: 'lax'` (Rekommenderat)
- Skydd mot CSRF-attacker
- Tillåter cookies på navigering (länkar)
- Alternativ: 'strict' (strängare) eller 'none' (kräver secure: true)

### HTTPS Checklist

Om du kör HTTPS direkt (ej via proxy):

```javascript
// ✅ RÄTT konfiguration för HTTPS
cookie: {
  secure: true,      // ✅ Endast HTTPS
  httpOnly: true,    // ✅ Skydd mot XSS
  sameSite: 'lax',   // ✅ CSRF-skydd
  maxAge: 7 * 24 * 60 * 60 * 1000
}

// Lägg även till HSTS header
app.use(helmet.hsts({
  maxAge: 31536000,
  includeSubDomains: true
}));
```

---

## 7. Miljövariabler (.env)

### Exempel .env för olika miljöer:

#### Lokal Development:
```bash
NODE_ENV=development
PORT=8097
SESSION_SECRET=dev-secret-change-me
LOG_LEVEL=debug
```

#### Produktion (med HTTPS):
```bash
NODE_ENV=production
PORT=8097
SESSION_SECRET=<long-random-string-from-openssl>
LOG_LEVEL=info
HTTPS_ENABLED=true
SSL_CERT_PATH=/etc/letsencrypt/live/keep.example.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/keep.example.com/privkey.pem
```

#### Generera säker SESSION_SECRET:

```bash
# 64 bytes random string
openssl rand -hex 64
```

---

## 8. Deployment Checklista

### Före Deployment:

- [ ] Välj deployment-miljö (se tabell överst)
- [ ] Sätt `SESSION_SECRET` i .env
- [ ] Konfigurera `cookie.secure` korrekt
- [ ] Installera SSL-certifikat (om HTTPS)
- [ ] Konfigurera firewall (port 80/443 eller VPN)
- [ ] Sätt upp automatisk certifikat-förnyelse
- [ ] Testa från extern enhet

### Efter Deployment:

- [ ] Verifiera HTTPS fungerar (om applicerat)
- [ ] Testa login från olika enheter
- [ ] Kontrollera cookies sätts korrekt (DevTools)
- [ ] Verifiera WebSocket-anslutning
- [ ] Testa import/export funktionalitet
- [ ] Granska loggar för errors (`logs/error-*.log`)
- [ ] Sätt upp backup-rutin för database

### Säkerhetstestning:

```bash
# Testa SSL-konfiguration (om HTTPS)
ssllabs.com/ssltest/analyze.html?d=keep.example.com

# Testa säkerhetsheaders
securityheaders.com/?q=keep.example.com

# Kontrollera öppna portar
nmap your-server-ip
```

---

## 9. Troubleshooting

### Problem: "Login successful" men 401 på /api/me

**Orsak**: Session cookie sätts ej korrekt

**Lösning**:
```javascript
// Om bakom proxy:
app.set('trust proxy', 1);
sessionConfig.proxy = true;
sessionConfig.cookie.secure = false;

// Om direkt HTTPS:
sessionConfig.cookie.secure = true;

// Om HTTP (dev):
sessionConfig.cookie.secure = false;
```

### Problem: WebSocket stängs med 1008

**Orsak**: Session cookie når inte WebSocket

**Lösning**:
- Kontrollera att cookies sätts korrekt
- Verifiera `credentials: 'include'` i fetch-anrop
- Kolla att `cookie.secure` matchar protocol (HTTP/HTTPS)

### Problem: Certbot kan inte verifiera domän

**Orsak**: Port 80 är inte åtkomlig

**Lösning**:
```bash
# Öppna port 80 temporärt
sudo ufw allow 80

# Stoppa Keep Clone om den blockerar port 80
sudo systemctl stop keep-clone

# Kör certbot
sudo certbot certonly --standalone -d keep.example.com

# Starta Keep Clone igen
sudo systemctl start keep-clone
```

---

## 10. Rekommendationer per Use Case

### Personligt hemmabruk (1-5 användare):
```
✅ HTTP på lokalt nätverk (192.168.x.x)
✅ VPN för åtkomst utifrån (WireGuard)
✅ Strong passwords
✅ Router firewall
❌ HTTPS ej nödvändigt
```

### Familj eller småföretag (5-20 användare):
```
✅ HTTPS via Caddy (enklast)
✅ Let's Encrypt auto-renewal
✅ Domännamn
✅ Bakom reverse proxy
✅ Backup-rutin
⚠️ Överväg MFA (framtida feature)
```

### Internet-exponerad produktion:
```
✅ HTTPS obligatoriskt (Caddy/nginx)
✅ Reverse proxy med rate limiting
✅ Strong SESSION_SECRET
✅ Monitoring och alerts
✅ Daglig backup
✅ Säkerhetsuppdateringar
✅ Fail2ban för brute force-skydd
⚠️ Överväg container orchestration (Docker/K8s)
```

---

## Sammanfattning

| Scenario | Setup | Komplexitet | Säkerhet |
|----------|-------|-------------|----------|
| **Lokal dev** | HTTP, secure: false | ⭐ Låg | ⚠️ OK för dev |
| **Hemmanät** | HTTP, secure: false + firewall | ⭐ Låg | ⚠️ OK för privat |
| **Hemmanät + VPN** | HTTP + WireGuard | ⭐⭐ Medium | ✅ Bra |
| **Caddy proxy** | HTTPS via Caddy, app HTTP | ⭐⭐ Medium | ✅ Utmärkt |
| **Nginx proxy** | HTTPS via nginx, app HTTP | ⭐⭐⭐ Medium-Hög | ✅ Utmärkt |
| **Direkt HTTPS** | App hanterar HTTPS | ⭐⭐⭐⭐ Hög | ✅ Bra |

**Rekommendation**: Använd **Caddy som reverse proxy** för enklast och säkrast produktion-setup.

---

## Support och Resurser

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Caddy Documentation](https://caddyserver.com/docs/)
- [Nginx SSL Guide](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [WireGuard Quick Start](https://www.wireguard.com/quickstart/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
