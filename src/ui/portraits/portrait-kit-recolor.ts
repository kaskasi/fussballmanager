import catalog from "./portrait-bust-catalog.json";

/** Baked bust defaults — keep in sync with scripts/portrait-bake-lib.mjs */
export const PORTRAIT_INK = "#3e3128";
export const PORTRAIT_FILL = "#e8c4a8";
export const PORTRAIT_ACCENT = "#bfdec2";

const SHIRT_BODY_IDS: readonly string[] =
  "mens_allowed_bodies" in catalog && Array.isArray(catalog.mens_allowed_bodies)
    ? catalog.mens_allowed_bodies
    : ["Sporty-Tee", "Gym-Shirt", "Thunder-T-Shirt"];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Replace baked shirt accent / skin fills on torso layers with club kit primary. */
export function recolorPortraitSvgShirt(svg: string, kitPrimary: string): string {
  const color = kitPrimary.trim();
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    return svg;
  }
  let out = svg.replaceAll(PORTRAIT_ACCENT, color);
  for (const bodyId of SHIRT_BODY_IDS) {
    if (!out.includes(`id="body/${bodyId}"`)) continue;
    const pattern = new RegExp(
      `(<g id="body/${escapeRegExp(bodyId)}"[\\s\\S]*?)fill="${PORTRAIT_FILL}"`,
      "i",
    );
    out = out.replace(pattern, `$1fill="${color}"`);
  }
  return out;
}
