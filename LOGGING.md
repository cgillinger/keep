# Loggning och Övervakning

## Översikt

Keep Clone använder Winston för strukturerad loggning med automatisk rotation och rensning.

## Loggfiler

Loggar sparas i `/logs` katalogen:

```
logs/
├── combined-YYYY-MM-DD.log  # Alla loggnivåer (info, warn, error)
├── error-YYYY-MM-DD.log     # Endast errors
└── README.md                # Grundläggande dokumentation
```

## Loggnivåer

| Nivå | Beskrivning | Exempel |
|------|-------------|---------|
| **error** | Fel och exceptions | Databasfel, nätverksfel, autentiseringsfel |
| **warn** | Varningar och säkerhetshändelser | Default session secret, misslyckade login-försök |
| **info** | Generell information | Login, logout, API-anrop, WebSocket-händelser |

## Loggformat

```
YYYY-MM-DD HH:mm:ss [LEVEL]: message {metadata}
```

### Exempel:

```
2026-01-24 16:30:15 [INFO]: AUTH: User logged in {"username":"christian","sessionId":"abc123"}
2026-01-24 16:30:16 [INFO]: WS: Connection authenticated {"userId":1}
2026-01-24 16:30:20 [ERROR]: DB: Create note error {"message":"SQLITE_CONSTRAINT"}
2026-01-24 16:31:05 [WARN]: SECURITY: Using default session secret {"message":"Set SESSION_SECRET environment variable in production"}
```

## Loggkategorier

### AUTH - Autentisering
- User registered
- User logged in
- User logged out
- Password reset requested
- Password changed

### WS - WebSocket
- Connection authenticated
- Connection rejected
- Connection closed
- Connection error

### DB - Databas
- Create/Update/Delete operations
- Query errors
- Connection issues

### API - API-anrop
- Request/Response logging
- Status codes
- Error responses

### SECURITY - Säkerhet
- Default secrets in use
- Failed login attempts (via rate limiter)
- CSRF token issues
- Permission violations

## Retention och Rotation

### Automatisk Rotation
- **Maxstorlek**: 20MB per loggfil
- **Datumrotation**: Nya filer skapas vid midnatt
- **Format**: `combined-YYYY-MM-DD.log`

### Automatisk Rensning
- Loggar äldre än **24 timmar** raderas automatiskt
- Rensning körs vid:
  - Serverstart
  - Loggrotation

### Manuell Rensning

```bash
# Ta bort loggar äldre än 1 dag
find logs/ -name "*.log" -mtime +1 -delete

# Ta bort alla loggar
rm -f logs/*.log
```

## Övervakning

### Realtidsövervakning

```bash
# Följ alla loggar
tail -f logs/combined-*.log

# Endast errors
tail -f logs/error-*.log

# Följ senaste 50 raderna
tail -50 logs/combined-*.log
```

### Sökning och Filtrering

```bash
# Hitta alla autentiseringshändelser
grep "AUTH:" logs/combined-*.log

# Hitta alla errors för en specifik användare
grep -i "userId.*1" logs/error-*.log

# Hitta alla login-händelser idag
grep "User logged in" logs/combined-$(date +%Y-%m-%d).log

# Räkna antal errors per dag
grep -c "ERROR" logs/error-*.log

# Visa errors från senaste timmen (approximation)
tail -1000 logs/error-*.log | grep "$(date +%Y-%m-%d\ %H)"
```

### Vanliga Sökningar

```bash
# Alla misslyckade operationer
grep "error\|failed" logs/combined-*.log -i

# WebSocket-aktivitet
grep "WS:" logs/combined-*.log

# Databasoperationer
grep "DB:" logs/combined-*.log

# Säkerhetshändelser
grep "SECURITY:" logs/combined-*.log

# Alla händelser för en specifik session
grep "sessionId.*abc123" logs/combined-*.log
```

## Konfiguration

### Miljövariabler

```bash
# Loggningsnivå (error, warn, info, debug)
LOG_LEVEL=info

# Om debug-nivå behövs för felsökning
LOG_LEVEL=debug
```

### Programmatisk Konfiguration

I `logger.js`:

```javascript
// Ändra retention period (standard: 1 dag)
maxFiles: '7d',  // Behåll i 7 dagar

// Ändra maxstorlek per fil (standard: 20MB)
maxSize: '50m',  // 50 MB

// Ändra loggningsnivå
level: 'debug'  // error, warn, info, debug
```

## Felsökning med Loggar

### Problem: Login fungerar inte

```bash
# Kolla autentiseringsloggar
grep "AUTH:" logs/combined-*.log | tail -20

# Leta efter session-fel
grep -i "session.*error" logs/error-*.log
```

### Problem: WebSocket stängs direkt

```bash
# Kolla WebSocket-händelser
grep "WS:" logs/combined-*.log | tail -20

# Leta efter autentiseringsfel
grep "Authentication required" logs/combined-*.log
```

### Problem: Databasfel

```bash
# Alla databasfel
grep "DB:.*error" logs/error-*.log -i

# Specifikt tabell-fel
grep "DB:.*notes" logs/error-*.log
```

### Problem: Högt antal errors

```bash
# Gruppera errors och räkna
grep "ERROR" logs/error-*.log | cut -d':' -f3 | sort | uniq -c | sort -rn
```

## Best Practices

### Development
- Använd console-output (aktiverad som standard)
- Sätt `LOG_LEVEL=debug` för detaljerad information
- Rensa loggar regelbundet: `rm -f logs/*.log`

### Production
- Övervaka `error-*.log` dagligen
- Sätt upp alerts för kritiska errors
- Överväg extern loggning (Sentry, LogDNA, etc.)
- Sätt `LOG_LEVEL=info` (standard)
- Backup viktiga loggar innan de rensas

### Säkerhet
- Loggar innehåller **INGA** lösenord eller tokens
- Session-IDs loggas för felsökning (inte säkerhetsproblem)
- Känslig data sanitizeras innan loggning
- Loggar är endast läsbara av server-processen

## Integration med Övervakningsverktyg

### Med systemd (Linux)

```bash
# Visa loggutput via journalctl
journalctl -u kreep -f

# Kombinera med app-loggar
tail -f logs/combined-*.log & journalctl -u kreep -f
```

### Med PM2

```bash
# PM2 kombinerar stdout med sina egna loggar
pm2 logs kreep

# Eller följ app-loggar direkt
tail -f logs/combined-*.log
```

### Med Docker

```bash
# Docker logs + app logs
docker logs -f kreep & docker exec kreep tail -f /app/logs/combined-*.log
```

## Logrotation med Logrotate (Optional)

Om du vill använda systemets logrotate istället för Winston's rotation:

```bash
# /etc/logrotate.d/kreep
/path/to/keep/logs/*.log {
    daily
    rotate 1
    compress
    missingok
    notifempty
    create 0644 keep-user keep-group
}
```

## Performance

### Disk Space
- Typical usage: **~10-50MB per dag** (beroende på trafik)
- Med 24h retention: **Max ~50MB** på disk
- Med compression: **~5-10MB**

### Performance Impact
- Winston logger asynkront → **minimal latency**
- Ingen blocking I/O på request-path
- Batch-skrivning för efficiency

## Troubleshooting

### Problem: Inga loggar skapas

```bash
# Kontrollera att logs-katalogen finns
ls -la logs/

# Skapa om den behövs
mkdir -p logs

# Kontrollera permissions
chmod 755 logs
```

### Problem: "Permission denied" på logs

```bash
# Fixa permissions
sudo chown -R $(whoami):$(whoami) logs/
chmod 755 logs/
chmod 644 logs/*.log
```

### Problem: Disk space fylls upp

```bash
# Kontrollera storlek
du -sh logs/

# Radera gamla loggar manuellt
rm -f logs/*.log

# Minska retention period i logger.js:
maxFiles: '12h'  # Behåll endast 12 timmar
```

## Migration från Console Logging

Om du hade gammal kod med `console.log`:

```javascript
// Gammalt
console.log('User logged in');
console.error('Database error:', error);

// Nytt - använd logger istället
logger.info('User logged in');
logger.error('Database error:', error);

// Med kontext
logger.logAuth('User logged in', username, { sessionId });
```

## Support

För mer information om Winston:
- [Winston Documentation](https://github.com/winstonjs/winston)
- [Daily Rotate File](https://github.com/winstonjs/winston-daily-rotate-file)
