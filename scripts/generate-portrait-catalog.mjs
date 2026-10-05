#!/usr/bin/env node
/**
 * Scan baked bust SVGs (charge 1 in bust/, charge 2 in bust/charge2/) and emit portrait-bust-catalog.json.
 * Catalog id = Open Peeps vendor id (1..105) so portrait_seed mapping stays stable.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import charge2VendorIds from "../src/ui/portraits/portrait-charge2-vendor-ids.json" with { type: "json" };

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const charge2Set = new Set(charge2VendorIds);
const bustDir = join(root, "public/assets/portraits/bust");
const outPath = join(root, "src/ui/portraits/portrait-bust-catalog.json");

const VENDOR_MAX = 105;

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

function resolveBustFile(vendorId) {
  const primary = join(bustDir, `peep-${vendorId}.svg`);
  if (existsSync(primary)) return { file: `peep-${vendorId}.svg`, charge: 1 };
  if (!charge2Set.has(vendorId)) return null;
  const charge2 = join(bustDir, "charge2", `peep-${vendorId}.svg`);
  if (existsSync(charge2)) return { file: `charge2/peep-${vendorId}.svg`, charge: 2 };
  return null;
}

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
for (let id = 1; id <= VENDOR_MAX; id++) {
  const resolved = resolveBustFile(id);
  if (!resolved) continue;

  const { file, charge } = resolved;
  const svg = readFileSync(join(bustDir, file), "utf8");
  const { body, head } = parseLayers(svg);
  const pools = ["mixed"];
  if (charge === 1 && qualifiesForMensSquad(body, head)) {
    pools.push("mens_squad");
  }
  if (charge === 2 || WOMENS_INCLUDE_BODIES.has(body)) {
    pools.push("womens_squad");
  }
  busts.push({ id, file, charge, body, head, pools });
}

const catalog = {
  version: 3,
  vendor_max: VENDOR_MAX,
  charge2_vendor_ids: [...charge2VendorIds],
  mens_allowed_bodies: [...MENS_ALLOWED_BODIES],
  mens_excluded_heads: [...MENS_EXCLUDED_HEADS],
  busts,
};

writeFileSync(outPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
const mensCount = busts.filter((b) => b.pools.includes("mens_squad")).length;
const c1 = busts.filter((b) => b.charge === 1).length;
const c2 = busts.filter((b) => b.charge === 2).length;
console.log(`Wrote ${outPath} (${busts.length} busts, charge1=${c1}, charge2=${c2}, mens_squad=${mensCount})`);
