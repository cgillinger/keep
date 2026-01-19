# Installation som systemd-tjänst (Linux)

Om du vill köra Keep Clone som en systemd-tjänst som startar automatiskt vid uppstart:

## Steg 1: Förbered service-filen

1. Redigera `keep-clone.service`:
```bash
nano keep-clone.service
```

2. Ändra följande:
   - `User=your-username` → ditt användarnamn
   - `WorkingDirectory=/path/to/keep-clone` → fullständig sökväg till projektet

## Steg 2: Kopiera service-filen

```bash
sudo cp keep-clone.service /etc/systemd/system/
```

## Steg 3: Aktivera och starta tjänsten

```bash
# Ladda om systemd
sudo systemctl daemon-reload

# Aktivera tjänsten (startar vid uppstart)
sudo systemctl enable keep-clone

# Starta tjänsten nu
sudo systemctl start keep-clone
```

## Hantera tjänsten

### Status
```bash
sudo systemctl status keep-clone
```

### Stoppa
```bash
sudo systemctl stop keep-clone
```

### Starta om
```bash
sudo systemctl restart keep-clone
```

### Se loggar
```bash
sudo journalctl -u keep-clone -f
```

### Inaktivera (starta inte automatiskt)
```bash
sudo systemctl disable keep-clone
```

## Felsökning

Om tjänsten inte startar:

1. Kontrollera att sökvägen är korrekt:
```bash
sudo systemctl status keep-clone
```

2. Kontrollera att Node.js är installerat:
```bash
which node
```

3. Testa att köra manuellt först:
```bash
cd /path/to/keep-clone
./start.sh
```

4. Kontrollera behörigheter:
```bash
ls -la /path/to/keep-clone
```
