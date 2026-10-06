#!/usr/bin/env node
/**
 * Copy pd_images camp sources into public/assets/photos/camps/.
 */
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pd = join(root, "pd_images");
const outDir = join(root, "public/assets/photos/camps");

const PHOTO_MAP = [
  { src: "Brazil_Belém_Las_Docas_02.jpg", dest: "camp-br.jpg" },
  { src: "Market_-_Ikija,_Lagos,_Nigeria.jpg", dest: "camp-ng.jpg" },
  { src: "Krakow_-_Kosciol_Mariacki.jpg", dest: "camp-pl.jpg" },
  { src: "Vue_du_Rhône_depuis_le_Pont_Wilson_(Lyon),_mai_2019.jpg", dest: "camp-fr.jpg" },
  { src: "Istanbul_city_Photos-_Urban_01.jpg", dest: "camp-tr.jpg" },
  { src: "Dubrovnik_as_seen_from_Srđ_-_September_2017.jpg", dest: "camp-hr.jpg" },
];

mkdirSync(outDir, { recursive: true });

for (const { src, dest } of PHOTO_MAP) {
  const from = join(pd, src);
  const to = join(outDir, dest);
  execSync(`cp ${JSON.stringify(from)} ${JSON.stringify(to)}`);
  execSync(`sips -Z 960 ${JSON.stringify(to)} --out ${JSON.stringify(to)}`, { stdio: "inherit" });
}

console.log("Baked camp nation photos to public/assets/photos/camps/");
