#!/usr/bin/env node
/**
 * Scan baked bust SVGs and emit portrait-bust-catalog.json (pools for pitch vs staff).
 * mens_squad = strict allowlist for men's football on the pitch (staff uses mixed).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bustDir = join(root, "public/assets/portraits/bust");
const outPath = join(root, "src/ui/portraits/portrait-bust-catalog.json");

/** Bodies that read as matchday / casual mens sportswear in Open Peeps. */
const MENS_ALLOWED_BODIES = new Set([
  "Sporty-Tee",
  "Gym-Shirt",
  "Thunder-T-Shirt",
  "Shirt-and-Coat",
  "Hoodie",
  "Striped-Tee",
  "Tee-1",
  "Tee-2",
  "Tee-Arms-Crossed",
  "Button-Shirt-1",
  "Striped-Pocket-Tee",
]);

/** Heads that read clearly feminine in the bust pack — excluded from pitch pool only. */
const MENS_EXCLUDED_HEADS = new Set([
  "Bangs",
  "Bangs-2",
  "Bun",
  "Bun-2",
  "Buns",
  "Gray-Bun",
  "Long-Bangs",
  "Long-Curly",
  "Medium-Bangs",
  "Medium-Bangs-2",
  "Medium-Bangs-3",
  "Pomp",
  "Hijab",
]);

const WOMENS_INCLUDE_BODIES = new Set(["Dress", "Tee-Selena", "Polka-Dot-Jacket"]);

function parseLayers(svg) {
  const body = svg.match(/id="body\/([^"]+)"/)?.[1] ?? "Unknown";
  const head = svg.match(/id="head\/([^"]+)"/)?.[1] ?? "Unknown";
  return { body, head };
}

function qualifiesForMensSquad(body, head) {
  if (!MENS_ALLOWED_BODIES.has(body)) return false;
  if (MENS_EXCLUDED_HEADS.has(head)) return false;
  return true;
}

const busts = [];
for (let id = 1; id <= 105; id++) {
  const svg = readFileSync(join(bustDir, `peep-${id}.svg`), "utf8");
  const { body, head } = parseLayers(svg);
  const pools = ["mixed"];
  if (qualifiesForMensSquad(body, head)) {
    pools.push("mens_squad");
  }
  if (WOMENS_INCLUDE_BODIES.has(body)) {
    pools.push("womens_squad");
  }
  busts.push({ id, body, head, pools });
}

const catalog = {
  version: 2,
  mens_allowed_bodies: [...MENS_ALLOWED_BODIES],
  mens_excluded_heads: [...MENS_EXCLUDED_HEADS],
  busts,
};

writeFileSync(outPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
const mensCount = busts.filter((b) => b.pools.includes("mens_squad")).length;
console.log(`Wrote ${outPath} (${busts.length} busts, mens_squad=${mensCount})`);
