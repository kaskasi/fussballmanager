import { execSync } from "node:child_process";

/** design.md Fernsehnachmittag — warm fills + tinte ink (token-aligned bake). */
export const PORTRAIT_INK = "#3e3128";
export const PORTRAIT_FILL = "#e8c4a8";
export const PORTRAIT_ACCENT = "#bfdec2";

export function recolorPortraitSvg(svg) {
  let out = svg.replace(/fill="#000000"/gi, `fill="${PORTRAIT_INK}"`);
  out = out.replace(/fill="#FFFFFF"/gi, `fill="${PORTRAIT_FILL}"`);
  if (
    out.includes('id="body/Sporty-Tee"') ||
    out.includes('id="body/Gym-Shirt"') ||
    out.includes('id="body/Thunder-T-Shirt"')
  ) {
    out = out.replace(
      new RegExp(`(<g id="body/(?:Sporty-Tee|Gym-Shirt|Thunder-T-Shirt)"[\\s\\S]*?)fill="${PORTRAIT_FILL}"`, "i"),
      `$1fill="${PORTRAIT_ACCENT}"`,
    );
  }
  return out;
}

export function readOpenPeepsBustSvg(zipPath, vendorId) {
  const entry = `Flat Assets/Templates/Bust/peep-${vendorId}.svg`;
  const svg = execSync(`unzip -p ${JSON.stringify(zipPath)} ${JSON.stringify(entry)}`, {
    encoding: "utf8",
    maxBuffer: 512 * 1024,
  });
  if (!svg.includes("<svg")) {
    throw new Error(`Missing or invalid bust SVG for peep-${vendorId}`);
  }
  return recolorPortraitSvg(svg);
}
