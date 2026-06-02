# Yrgo IoT Dashboard — Deployment på Raspberry Pi

Helt client-side dashboard. Apache2 serverar statiska filer; webbläsaren kopplar upp sig direkt mot Mosquitto via WebSocket.

**Hur appen hittar brokern:** Sidan använder automatiskt samma hostname/IP som du laddade sidan från. Om du surfar in på `http://pi.local/` ansluter den till `ws://pi.local:9001`; surfar du in via IP används den IP-adressen. Det förutsätter att Mosquitto kör på samma maskin som Apache.

## 1. Mosquitto med WebSocket

Installera Mosquitto om det inte redan finns:
```bash
sudo apt update && sudo apt install -y mosquitto mosquitto-clients
```

Lägg till en WebSocket-listener. Skapa/redigera `/etc/mosquitto/conf.d/websockets.conf`:
```
listener 1883
listener 9001
protocol websockets
allow_anonymous true
```

Starta om:
```bash
sudo systemctl restart mosquitto
sudo systemctl status mosquitto
```

Testa publish (i en annan terminal):
```bash
mosquitto_pub -h localhost -t yrgo/iot/sensor1/temp -m "23.4"
```

## 2. Bygg appen

På valfri maskin med Bun (eller Node) installerat:
```bash
bun install
bun run build
```

Outputmappen heter `dist/` (eller `.output/public/` beroende på TanStack Start-version — kolla efter bygget).

## 3. Lägg på Apache

```bash
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
```

Öppna `http://<pi-ip>/` i en webbläsare. Sidan ansluter automatiskt till `ws://<pi-ip>:9001`.

## Om brokern kräver lösenord

Med standardkonfigen ovan (`allow_anonymous true`) behövs inget login. Om du istället vill kräva autentisering:

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

När anslutningen då avvisas öppnar dashboarden automatiskt en inloggningsdialog där användarnamn/lösenord matas in. Du kan också öppna den manuellt via knappen **Inloggning** i headern. Uppgifterna sparas i webbläsarens `localStorage` (klartext) — använd bara på betrodda enheter, eller klicka "Glöm sparade" för att rensa.

## Felsökning

- **"Fel" / status röd:** kontrollera att port 9001 är öppen och att Mosquitto-loggen visar listener på 9001 (`sudo journalctl -u mosquitto -f`).
- **"Auth krävs":** brokern kräver användarnamn/lösenord — klicka **Inloggning** i headern.
- **Inga topics dyker upp:** dashboarden visar bara numeriska värden. Publicera ett tal: `mosquitto_pub -h localhost -t yrgo/iot/test -m 42`.
- **Historiken försvinner inte mellan reloads** — den sparas i `localStorage` (max ~500 punkter per topic). Använd "Rensa"-knappen för att nollställa.

