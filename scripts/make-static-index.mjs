#!/usr/bin/env node
// För Apache/Raspberry Pi använder vi en ren Vite/React-SPA build i dist-static.
// Den vanliga TanStack Start-builden hydrerar hela document och kräver SSR
// bootstrap-data; utan den blir sidan svart på en enkel static-host.
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const CLIENT = "dist-static";
const INDEX = join(CLIENT, "index.html");

if (!existsSync(INDEX)) {
  console.error(`[make-static-index] ${INDEX} saknas — kör static-builden först`);
  process.exit(1);
}

// SPA-fallback för djuplänkar
copyFileSync(INDEX, join(CLIENT, "404.html"));
console.log("[make-static-index] skrev dist-static/404.html");
