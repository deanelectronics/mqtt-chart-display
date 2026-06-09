# Yrgo IoT Dashboard — Deployment på Raspberry Pi

Helt client-side dashboard. Apache2 serverar statiska filer; webbläsaren kopplar upp sig direkt mot Mosquitto via WebSocket.

**Hur appen hittar brokern:** Sidan använder automatiskt samma hostname/IP som du laddade sidan från. Om du surfar in på `http://pi.local/` ansluter den till `ws://pi.local:9001`; surfar du in via IP används den IP-adressen. Det förutsätter att Mosquitto kör på samma maskin som Apache.

---

## 1. Mosquitto med WebSocket

```bash
sudo apt update && sudo apt install -y mosquitto mosquitto-clients
```

Skapa/redigera `/etc/mosquitto/conf.d/websockets.conf`:
```
listener 1883
listener 9001
protocol websockets
allow_anonymous true
```

Starta om och testa:
```bash
sudo systemctl restart mosquitto
mosquitto_pub -h localhost -t yrgo/iot/sensor1/temp -m "23.4"
```

---

## 2. Hämta färdigbyggda filer från GitHub (rekommenderat)

GitHub Actions bygger automatiskt appen vid varje push till `main` och lägger de statiska filerna i branchen **`dist`**. Du behöver alltså aldrig installera bun/node på Pi:n.

Första gången på Pi:n:
```bash
sudo rm -rf /var/www/html
sudo git clone -b dist --single-branch https://github.com/<ditt-konto>/<repo>.git /var/www/html
```

Uppdatera senare (varje gång du pushat ändringar och Actions byggt klart):
```bash
cd /var/www/html
sudo git fetch origin dist
sudo git reset --hard origin/dist
```

Vill du automatisera, lägg det i en cron eller en liten systemd-timer.

> Workflowen ligger i `.github/workflows/build-dist.yml`. Kolla att den blivit grön under fliken **Actions** på GitHub innan du pullar.

---

## 2b. (Alternativ) Bygg själv

> **Viktigt:** GitHub-workflowen bygger en ren Vite/React-version för Apache. Den vanliga TanStack Start-builden innehåller serverdelar och ska inte kopieras till `/var/www/html`.

På din utvecklingsmaskin (eller direkt på Pi:n om du har Node/Bun där):

```bash
# Installera bun om du inte har det
curl -fsSL https://bun.sh/install | bash

# Klona/kopiera projektet, gå in i mappen
cd yrgo-iot-dashboard

bun install

# Bygg som statisk Apache-site
bunx vite build --config static.vite.config.ts
node scripts/make-static-index.mjs
```

Efter bygget hittar du de statiska filerna i:

```
dist-static/
```

Den mappen innehåller `index.html`, `404.html`, `assets/`, osv. **Det är den mappen som ska upp på Apache** — inte projektets rot.

---

## 3. Lägg på Apache

På Raspberry Pi:n:

```bash
sudo rm -rf /var/www/html/*
sudo cp -r dist-static/* /var/www/html/
```

(Om du byggde på en annan maskin: `scp -r dist-static/* pi@<ip>:/tmp/site/` och sedan `sudo cp -r /tmp/site/* /var/www/html/` på Pi:n.)

Kontrollera att `/var/www/html/index.html` finns:

```bash
ls /var/www/html/
# Förväntat: index.html  assets/  ...
```

Öppna sedan `http://<pi-ip>/` i en webbläsare. Sidan ansluter automatiskt till `ws://<pi-ip>:9001`.

### Vanligt fel: "Index of /"
Om Apache visar en filkatalog med `package.json`, `src/`, `vite.config.ts` osv. — då har du kopierat **källkoden**, inte bygget. Kör steg 2 igen och kopiera `dist-static/`, inte projektets rot.

---

## Om brokern kräver lösenord

Med standardkonfigen ovan (`allow_anonymous true`) behövs inget login. För att kräva autentisering:

```
listener 1883
listener 9001
protocol websockets
allow_anonymous false
password_file /etc/mosquitto/passwd
```

Skapa lösenordsfilen:
```bash
sudo mosquitto_passwd -c /etc/mosquitto/passwd <användarnamn>
sudo systemctl restart mosquitto
```

Dashboarden öppnar då automatiskt en inloggningsdialog. Uppgifterna sparas i `localStorage` (klartext).

---

## Felsökning

- **Apache visar "Index of /":** du kopierade källkoden, inte `dist-static/`. Se steg 2–3.
- **Status röd / "Fel":** port 9001 stängd eller Mosquitto inte konfigurerad för websockets. Kolla `sudo journalctl -u mosquitto -f`.
- **"Auth krävs":** klicka **Inloggning** i headern.
- **Inga topics dyker upp:** dashboarden visar bara numeriska värden. Testa `mosquitto_pub -h localhost -t yrgo/iot/test -m 42`.
- **Historiken mellan reloads:** sparas i `localStorage` (max ~500 punkter per topic). Använd "Rensa".
