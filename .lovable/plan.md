# MQTT IoT Dashboard

En ren client-side webapp som ansluter till en lokal Mosquitto-broker via WebSocket och visualiserar topics under `yrgo/iot/#` med liveuppdateringar och trendgrafer. Byggs som statiska filer som läggs i Apaches webroot på Pi:n.

## Funktionalitet

- Anslut automatiskt till `ws://<samma-host>:9001` vid sidladdning, visa connection status (ansluten / återansluter / fel)
- Prenumerera på `yrgo/iot/#` och upptäck topics dynamiskt
- Grid av "topic-kort", ett per upptäckt topic:
  - Topic-namn
  - Senaste numeriska värde (stort, tydligt)
  - Tidsstämpel "senast uppdaterad"
  - Sparkline med senaste ~60 datapunkter
- Klick på kort → modal/expanderad vy med stor trendgraf
  - Tidsfönster: 1 min / 5 min / 1 h / allt sparat
  - Min/max/medel för valt fönster
- Historik per topic sparas i **localStorage** (ring buffer, t.ex. 500 punkter/topic) — överlever F5
- "Rensa historik"-knapp i UI
- Hanterar enbart numeriska payloads (parsas som float; icke-numeriska ignoreras tyst eller markeras)

## Design

Industrial-tema enligt vald palett:
- Bakgrund `#1a1a1a`, kortyta `#2d2d2d`
- Primär accent `#e85d3a` (värden, aktiva states, graflinjer)
- Sekundär accent `#fbbf24` (varningar, sekundära datapunkter)
- Mono-font för värden (JetBrains Mono), sans-serif för UI (Inter eller liknande)
- Skarpa hörn, tydliga ramar, lätt industriell känsla — inte "SaaS-mjuk"

## Teknisk plan

**Stack**
- TanStack Start (befintligt scaffold) byggt som statisk SPA — inga server functions, inget Lovable Cloud
- `mqtt` npm-paket (browser build, WebSocket-transport)
- `uplot` för trendgrafer (snabb rendering av många punkter, lättviktig)
- Tailwind v4 + design tokens i `src/styles.css`

**Filstruktur (nytt)**
```text
src/
  routes/
    index.tsx              # Dashboard (grid + modal)
  lib/
    mqtt-client.ts         # Singleton MQTT-anslutning, auto-reconnect
    topic-store.ts         # Reactive store: topics, värden, historik, localStorage-persistens
  components/
    ConnectionStatus.tsx
    TopicCard.tsx          # Kort med värde + sparkline
    TopicDetailModal.tsx   # Stor graf + tidsfönster-väljare
    TrendChart.tsx         # uPlot-wrapper
  styles.css               # Industrial-tokens
```

**Anslutning**
- `mqtt.connect("ws://" + window.location.hostname + ":9001")` — funkar oavsett om Pi:n nås via IP eller hostname
- Auto-reconnect med exponentiell backoff
- QoS 0 räcker för en dashboard

**Historik & persistens**
- I minnet: `Map<topic, { values: Array<{t: number, v: number}> }>` (ring buffer 500 punkter)
- Skrivs till localStorage debounced (t.ex. var 5:e sekund) under nyckeln `yrgo-iot-history`
- Läses in vid app-start så grafen finns direkt
- Total storlek ryms gott i 5MB-gränsen (500 punkter × ~30 byte × t.ex. 50 topics ≈ 750 kB)

**Deployment på Pi**
1. Bygg lokalt eller på Pi:n: `bun install && bun run build`
2. Kopiera innehållet i `dist/` (eller motsvarande output-mapp) till `/var/www/html/`
3. Konfigurera Mosquitto för WebSocket (se nedan)

**Mosquitto-konfig som krävs på Pi:n** (instruktion i README, inte något appen gör):
```text
listener 1883
listener 9001
protocol websockets
allow_anonymous true
```
Sen: `sudo systemctl restart mosquitto`

## Saker som INTE ingår

- Ingen autentisering, inga användare
- Ingen publish från UI (read-only dashboard)
- Ingen backend, ingen databas, ingen Lovable Cloud
- Ingen långtidshistorik utöver vad localStorage rymmer

## Leverans

Efter implementation får du en kort README med exakta steg för Mosquitto-konfig och hur du kopierar bygget till `/var/www/html/`.
