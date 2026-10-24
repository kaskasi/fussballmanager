/**
 * Action colour (--accent family) from the managed club's kit (design.md §2.5).
 * The kit hue is kept and darkened until text in it stays readable on the page.
 * Red, orange and yellow kits would read as error, warning or Next, so they get slate.
 */

import { contrastRatio, hexToHsl, hslToHex, mixHex, normaliseHex } from "../../world/color-math.ts";
import { PLAYER_CLUB_KIT_PRIMARY, PLAYER_CLUB_KIT_SECONDARY } from "../../world/club-kit.ts";
import type { KitColors } from "./title-bar-colors.ts";

export interface ClubAccentColors {
  accent: string;
  accentStrong: string;
  accentSoft: string;
  onAccent: string;
}

/** Mirrors --panel, --page and --text in design-tokens.css. */
const PANEL = "#ffffff";
const PAGE = "#f3f5f1";
const INK = "#16211a";
const WHITE = "#ffffff";

const MIN_CONTRAST = 4.5;
/** Hues (degrees) that collide with --negative, --warning and --next. */
const WARM_HUE_BELOW = 50;
const WARM_HUE_ABOVE = 340;
/** Below this saturation the hue does not read as a colour. */
const NEUTRAL_SATURATION = 25;
const STRONG_STEP = 8;
const SOFT_AMOUNT = 0.12;

export const CLUB_ACCENT_SLATE: ClubAccentColors = {
  accent: "#33475b",
  accentStrong: "#22303e",
  accentSoft: "#e4e8ec",
  onAccent: WHITE,
};

function isWarm(h: number, s: number): boolean {
  return s > NEUTRAL_SATURATION && (h <= WARM_HUE_BELOW || h >= WARM_HUE_ABOVE);
}

function accentFrom(raw: string): ClubAccentColors | null {
  const hsl = hexToHsl(raw);
  if (!hsl || isWarm(hsl.h, hsl.s)) return null;
  let l = hsl.l;
  let accent = hslToHex(hsl.h, hsl.s, l);
  while (Math.min(contrastRatio(accent, PAGE), contrastRatio(accent, PANEL)) < MIN_CONTRAST && l > 0) {
    l = Math.max(0, l - 1);
    accent = hslToHex(hsl.h, hsl.s, l);
  }
  const onAccent = contrastRatio(accent, WHITE) >= contrastRatio(accent, INK) ? WHITE : INK;
  return {
    accent,
    accentStrong: hslToHex(hsl.h, hsl.s, Math.max(0, l - STRONG_STEP)),
    accentSoft: mixHex(accent, PANEL, SOFT_AMOUNT) ?? CLUB_ACCENT_SLATE.accentSoft,
    onAccent,
  };
}

function isDefaultKit(kit: KitColors): boolean {
  return (
    normaliseHex(kit.primary) === PLAYER_CLUB_KIT_PRIMARY && normaliseHex(kit.secondary) === PLAYER_CLUB_KIT_SECONDARY
  );
}

/** null: keep the stylesheet's green (no kit, or the Kieler FC kit it was designed for). */
export function clubAccentColors(kit: KitColors | null | undefined): ClubAccentColors | null {
  if (!kit || isDefaultKit(kit)) return null;
  for (const raw of [kit.primary, kit.secondary]) {
    const colors = accentFrom(raw);
    if (colors) return colors;
  }
  return CLUB_ACCENT_SLATE;
}
