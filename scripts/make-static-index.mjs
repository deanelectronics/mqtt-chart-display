#!/usr/bin/env node
// Genererar en statisk index.html i dist/client/ så att Apache (eller vilken
// static-host som helst) kan serva appen utan SSR-worker.
//
// Lovable-mallens vite-config låser Nitro till "cloudflare", så NITRO_PRESET=static
// gör ingenting. Men eftersom vår "/"-route har ssr:false är JS-bundlen i
// dist/client/assets/ i praktiken en SPA. Vi behöver bara en HTML-skal som
// laddar entry-chunken och CSS:en.
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const CLIENT = "dist/client";
const ASSETS = join(CLIENT, "assets");

if (!existsSync(ASSETS)) {
  console.error(`[make-static-index] ${ASSETS} saknas — kör 'bun run build' först`);
  process.exit(1);
}

const files = readdirSync(ASSETS);
const jsFiles = files.filter((f) => f.endsWith(".js"));
const cssFiles = files.filter((f) => f.endsWith(".css"));

if (jsFiles.length === 0) {
  console.error("[make-static-index] inga .js-filer i dist/client/assets");
  process.exit(1);
}

// Entry-chunken är den som importerar från andra chunkar (vendor).
// Vendor-chunken refereras med strängar som "./index-XXXX.js" inuti entry.
function findEntry() {
  if (jsFiles.length === 1) return jsFiles[0];
  for (const f of jsFiles) {
    const txt = readFileSync(join(ASSETS, f), "utf8");
    const importsAnother = jsFiles.some(
      (g) => g !== f && txt.includes(g),
    );
    if (importsAnother) return f;
  }
  // fallback: ta sist alfabetiskt
  return jsFiles.sort().at(-1);
}

const entry = findEntry();
console.log(`[make-static-index] entry  = ${entry}`);
cssFiles.forEach((c) => console.log(`[make-static-index] css    = ${c}`));

const cssLinks = cssFiles
  .map((c) => `    <link rel="stylesheet" href="/assets/${c}">`)
  .join("\n");

const html = `<!doctype html>
<html lang="sv">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Yrgo IoT Dashboard</title>
    <meta name="description" content="Live MQTT dashboard för yrgo/iot/# topics med trendgrafer." />
${cssLinks}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/${entry}"></script>
  </body>
</html>
`;

writeFileSync(join(CLIENT, "index.html"), html);
// SPA-fallback för djuplänkar
writeFileSync(join(CLIENT, "404.html"), html);
console.log("[make-static-index] skrev dist/client/index.html + 404.html");
