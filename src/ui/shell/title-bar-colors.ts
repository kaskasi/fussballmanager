/**
 * Title bar colour from the managed club's kit (design.md §2.4).
 * The bar is painted in a kit colour when text on it stays readable and the
 * yellow Next button still stands out; otherwise it falls back to ink.
 */

import { contrastRatio, normaliseHex } from "../../world/color-math.ts";

export { contrastRatio, relativeLuminance } from "../../world/color-math.ts";

export interface KitColors {
  primary: string;
  secondary: string;
}

export interface TitleBarColors {
  club: string;
  onClub: string;
}

export type TitleBarTheme = "light" | "dark";

/** Mirrors --text, --next and the white on-colour in design-tokens.css. */
const INK = "#16211a";
const WHITE = "#ffffff";
const NEXT = "#ffc933";

const MIN_TEXT_CONTRAST = 4.5;
const MIN_NEXT_CONTRAST = 1.5;

export function titleBarColors(
  kit: KitColors | null | undefined,
  theme: TitleBarTheme = "light",
): TitleBarColors {
  const fallback: TitleBarColors = { club: INK, onClub: WHITE };
  if (!kit) return fallback;
  const order = theme === "dark" ? [kit.secondary, kit.primary] : [kit.primary, kit.secondary];
  for (const raw of order) {
    const club = normaliseHex(raw);
    if (!club) continue;
    const inkContrast = contrastRatio(club, INK);
    const whiteContrast = contrastRatio(club, WHITE);
    const onClub = inkContrast >= whiteContrast ? INK : WHITE;
    if (Math.max(inkContrast, whiteContrast) < MIN_TEXT_CONTRAST) continue;
    if (contrastRatio(club, NEXT) < MIN_NEXT_CONTRAST) continue;
    return { club, onClub };
  }
  return fallback;
}
