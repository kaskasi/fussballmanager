#!/usr/bin/env node
/**
 * Extract Open Peeps Bust templates (peep-1..105) into public/assets/portraits/bust/.
 * Source: assets/open-peeps/Flat Assets.zip — read-only vendor pack.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const zipPath = join(root, "assets/open-peeps/Flat Assets.zip");
const bustDir = join(root, "public/assets/portraits/bust");
const silhouettePath = join(root, "public/assets/portraits/silhouette.svg");

const BUST_COUNT = 105;

/** design.md Fernsehnachmittag — warm fills + tinte ink (token-aligned bake). */
const PORTRAIT_INK = "#3e3128";
const PORTRAIT_FILL = "#e8c4a8";
const PORTRAIT_ACCENT = "#bfdec2";

function recolorPortraitSvg(svg) {
  let out = svg.replace(/fill="#000000"/gi, `fill="${PORTRAIT_INK}"`);
  out = out.replace(/fill="#FFFFFF"/gi, `fill="${PORTRAIT_FILL}"`);
  if (out.includes('id="body/Sporty-Tee"') || out.includes('id="body/Gym-Shirt"') || out.includes('id="body/Thunder-T-Shirt"')) {
    out = out.replace(
      new RegExp(`(<g id="body/(?:Sporty-Tee|Gym-Shirt|Thunder-T-Shirt)"[\\s\\S]*?)fill="${PORTRAIT_FILL}"`, "i"),
      `$1fill="${PORTRAIT_ACCENT}"`,
    );
  }
  return out;
}

mkdirSync(bustDir, { recursive: true });

for (let n = 1; n <= BUST_COUNT; n++) {
  const entry = `Flat Assets/Templates/Bust/peep-${n}.svg`;
  const svg = execSync(`unzip -p ${JSON.stringify(zipPath)} ${JSON.stringify(entry)}`, {
    encoding: "utf8",
    maxBuffer: 512 * 1024,
  });
  if (!svg.includes("<svg")) {
    throw new Error(`Missing or invalid bust SVG for peep-${n}`);
  }
  writeFileSync(join(bustDir, `peep-${n}.svg`), recolorPortraitSvg(svg), "utf8");
}

const silhouette = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140" role="presentation" aria-hidden="true">
  <ellipse cx="60" cy="38" rx="28" ry="32" fill="#9dbfd0"/>
  <path d="M20 140c8-36 28-52 40-58 12 6 32 22 40 58H20z" fill="#9dbfd0"/>
</svg>
`;
writeFileSync(silhouettePath, silhouette, "utf8");

console.log(`Baked ${BUST_COUNT} bust SVGs → public/assets/portraits/bust/`);
console.log(`Wrote public/assets/portraits/silhouette.svg`);
