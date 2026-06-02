## Problem

Logiken var rätt tänkt men dåligt formulerad: appen kör i webbläsaren (client-side), men MQTT-brokern kör på **servern** (Raspberry Pi:n som också serverar sidan via Apache). Eftersom användaren öppnar sidan via Pi:ns hostname/IP räcker det att återanvända `window.location.hostname` som broker-adress — vilket koden redan gör. Det som saknas är:

1. Stöd för anonym anslutning som **default**, men med möjlighet att ange användarnamn/lösenord om Mosquitto kräver auth.
2. Att UI:t automatiskt visar inloggningsfältet när anslutningen misslyckas pga auth-fel (MQTT CONNACK code 4 = "bad username or password", 5 = "not authorized").

## Plan

### 1. Credentials-state i `mqtt-client.ts`
- Lägg till in-memory + `localStorage`-sparad `{ username, password }` (nyckel `yrgo-iot-credentials`). Sparas bara om användaren själv fyller i.
- `startMqtt()` läser credentials från storage och skickar med i `mqtt.connect(url, { username, password, ... })` om de finns.
- Lägg till exporterad `setCredentials(username, password)` som:
  - sparar i localStorage
  - stänger befintlig klient (`client.end(true)`)
  - nollställer och anropar `startMqtt()` igen
- Lägg till `clearCredentials()` för att glömma sparade uppgifter.
- Utöka `useConnection()`-store så att `lastError` även exponerar en `authFailed: boolean` (sätts true när `error`-eventet innehåller "Not authorized" / "Bad user name or password", eller när broker stänger direkt efter connect-försök med credentials).

### 2. Ny komponent `CredentialsDialog.tsx`
- Enkel modal/panel i industrial-stil med fälten `Användarnamn` och `Lösenord` (type=password) + knappar `Anslut` och `Avbryt`.
- Visas när:
  - `authFailed === true`, ELLER
  - användaren klickar på en ny liten knapp "Inloggning" i headern (för att kunna mata in i förväg eller byta uppgifter).
- Vid `Anslut` → `setCredentials(...)`, stäng dialogen.
- Inkluderar en "Glöm sparade uppgifter"-länk som anropar `clearCredentials()`.

### 3. Headerjustering i `routes/index.tsx`
- Lägg till "Inloggning"-knapp bredvid "Rensa".
- Visa `CredentialsDialog` automatiskt första gången auth-fel detekteras.

### 4. `ConnectionStatus.tsx`
- Visa tydligare meddelande när `authFailed` är true: t.ex. "Auth krävs — klicka Inloggning".

### 5. Uppdatera `DEPLOY.md`
- Förtydliga att brokern körs **på samma maskin som Apache** (samma host som sidan laddas från), och att appen automatiskt använder den hostname/IP du surfade in på.
- Lägg till kort avsnitt "Om brokern kräver lösenord": exempel på Mosquitto `password_file` + `allow_anonymous false`, och notis om att UI:t då frågar efter användarnamn/lösenord.

## Vad som INTE ändras

- Fortfarande ren client-side, inget backend, inget Lovable Cloud.
- Ingen separat broker-URL-input (host = sidans host är fortfarande regeln). Bara user/password kan justeras.
- Lösenord sparas i `localStorage` i klartext — acceptabelt för en lokal lab-dashboard, men dokumenteras i DEPLOY.md.
