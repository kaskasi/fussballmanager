import { deriveWorldSeed, NORDSTERN_TEAM_ID } from "./world-generator.ts";

/** design-tokens.css `--rasen` — player club home shirt. */
export const PLAYER_CLUB_KIT_PRIMARY = "#2e9e46";
export const PLAYER_CLUB_KIT_SECONDARY = "#1e7a38";

export interface ClubKitColors {
  primary: string;
  secondary: string;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const toByte = (v: number) => Math.round((v + m) * 255);
  const rr = toByte(r).toString(16).padStart(2, "0");
  const gg = toByte(g).toString(16).padStart(2, "0");
  const bb = toByte(b).toString(16).padStart(2, "0");
  return `#${rr}${gg}${bb}`;
}

/** Deterministic home/away kit pair for a generated club. */
export function deriveClubKitColors(
  masterSeed: number,
  teamId: string,
  clubIndex: number,
): ClubKitColors {
  if (teamId === NORDSTERN_TEAM_ID) {
    return { primary: PLAYER_CLUB_KIT_PRIMARY, secondary: PLAYER_CLUB_KIT_SECONDARY };
  }
  const random = mulberry32(deriveWorldSeed(masterSeed, "club-kit", clubIndex));
  const hue = Math.floor(random() * 360);
  const primary = hslToHex(hue, 52 + random() * 18, 38 + random() * 12);
  const secondary = hslToHex(hue, 48 + random() * 16, 28 + random() * 10);
  return { primary, secondary };
}
