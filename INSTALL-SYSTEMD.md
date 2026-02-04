# Installation som systemd-tjänst (Linux)

Om du vill köra Keep Clone som en systemd-tjänst som startar automatiskt vid uppstart:

## Steg 1: Förbered service-filen

1. Redigera `kreep.service`:
```bash
nano kreep.service
```

2. Ändra följande:
   - `User=your-username` → ditt användarnamn
   - `WorkingDirectory=/path/to/kreep` → fullständig sökväg till projektet

## Steg 2: Kopiera service-filen

```bash
sudo cp kreep.service /etc/systemd/system/
```

## Steg 3: Aktivera och starta tjänsten

```bash
# Ladda om systemd
sudo systemctl daemon-reload

# Aktivera tjänsten (startar vid uppstart)
sudo systemctl enable kreep

# Starta tjänsten nu
sudo systemctl start kreep
```

## Hantera tjänsten

### Status
```bash
sudo systemctl status kreep
```

### Stoppa
```bash
sudo systemctl stop kreep
```

### Starta om
```bash
sudo systemctl restart kreep
```

### Se loggar
```bash
sudo journalctl -u kreep -f
```

### Inaktivera (starta inte automatiskt)
```bash
sudo systemctl disable kreep
```

## Felsökning

Om tjänsten inte startar:

1. Kontrollera att sökvägen är korrekt:
```bash
sudo systemctl status kreep
```

2. Kontrollera att Node.js är installerat:
```bash
which node
```

3. Testa att köra manuellt först:
```bash
cd /path/to/kreep
./start.sh
```

4. Kontrollera behörigheter:
```bash
ls -la /path/to/kreep
```
