#!/usr/bin/env node
/**
 * Copy pd_images mood sources + ambientCG Wood066 Color into public/assets/.
 */
import { execSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pd = join(root, "pd_images");
const photosOut = join(root, "public/assets/photos");
const texturesOut = join(root, "public/assets/textures");
const woodZip = join(root, "assets/textures/ambientcg/Wood066_1K-JPG.zip");

const PHOTO_MAP = [
  {
    src: "Window_Merijal_Office_Oulu_20230225.jpg",
    dest: "hub-office.jpg",
  },
  {
    src: "FirstEnergy_Stadium_Sunset_(50001489956).jpg",
    dest: "hub-stadium-dusk.jpg",
  },
  {
    src: "Ticket_office_at_Moreton_(Merseyside)_railway_station.jpg",
    dest: "commerce-kiosk.jpg",
  },
  {
    src: "As_One._Looking_back_up_the_players'_tunnel_in_Murrayfield_Stadium_-_geograph.org.uk_-_8355555.jpg",
    dest: "transfer-tunnel.jpg",
  },
];

mkdirSync(photosOut, { recursive: true });
mkdirSync(texturesOut, { recursive: true });

for (const { src, dest } of PHOTO_MAP) {
  const from = join(pd, src);
  const to = join(photosOut, dest);
  execSync(`cp ${JSON.stringify(from)} ${JSON.stringify(to)}`);
  execSync(`sips -Z 1400 ${JSON.stringify(to)} --out ${JSON.stringify(to)}`, { stdio: "inherit" });
}

const woodEntry = "Wood066_1K-JPG_Color.jpg";
const woodRaw = join(texturesOut, ".wood066-raw.jpg");
const woodOut = join(texturesOut, "wood066-color.jpg");
execSync(
  `unzip -p ${JSON.stringify(woodZip)} ${JSON.stringify(woodEntry)} > ${JSON.stringify(woodRaw)}`,
);
execSync(`sips -Z 512 ${JSON.stringify(woodRaw)} --out ${JSON.stringify(woodOut)}`, { stdio: "inherit" });
rmSync(woodRaw, { force: true });

console.log("Baked hub/commerce/transfer photos + wood066-color.jpg");
