#!/usr/bin/env node
/**
 * Charge 2: female Open Peeps busts curated out of charge 1 (mens pitch pool).
 * Files live under public/assets/portraits/bust/charge2/ with stable vendor ids.
 */
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import charge2Ids from "../src/ui/portraits/portrait-charge2-vendor-ids.json" with { type: "json" };
import { readOpenPeepsBustSvg } from "./portrait-bake-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const zipPath = join(root, "assets/open-peeps/Flat Assets.zip");
const bustDir = join(root, "public/assets/portraits/bust");
const charge2Dir = join(bustDir, "charge2");

const allowed = new Set(charge2Ids);

mkdirSync(charge2Dir, { recursive: true });

for (const name of readdirSync(charge2Dir)) {
  if (!name.endsWith(".svg")) continue;
  const id = Number(name.replace(/^peep-(\d+)\.svg$/, "$1"));
  if (!allowed.has(id)) {
    unlinkSync(join(charge2Dir, name));
  }
}

let baked = 0;
for (const id of charge2Ids) {
  const out = join(charge2Dir, `peep-${id}.svg`);
  if (existsSync(out)) continue;
  const svg = readOpenPeepsBustSvg(zipPath, id);
  writeFileSync(out, svg, "utf8");
  baked += 1;
}

console.log(
  `Charge2 (female): ${charge2Ids.length} ids, ${baked} newly baked → public/assets/portraits/bust/charge2/`,
);
