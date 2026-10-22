/**
 * Title bar colour from the managed club's kit (design.md §2.4).
 * The bar is painted in a kit colour when text on it stays readable and the
 * yellow Next button still stands out; otherwise it falls back to ink.
 */

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

function parseHex(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match?.[1]) return null;
  let digits = match[1];
  if (digits.length === 3) {
    digits = digits
      .split("")
      .map((d) => d + d)
      .join("");
  }
  const value = Number.parseInt(digits, 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function channel(byte: number): number {
  const c = byte / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.x relative luminance; null for an unparseable colour. */
export function relativeLuminance(hex: string): number | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

/** WCAG contrast ratio between two hex colours (1–21); 1 when either is unparseable. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return 1;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function normalise(hex: string): string | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  return `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function titleBarColors(
  kit: KitColors | null | undefined,
  theme: TitleBarTheme = "light",
): TitleBarColors {
  const fallback: TitleBarColors = { club: INK, onClub: WHITE };
  if (!kit) return fallback;
  const order = theme === "dark" ? [kit.secondary, kit.primary] : [kit.primary, kit.secondary];
  for (const raw of order) {
    const club = normalise(raw);
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
