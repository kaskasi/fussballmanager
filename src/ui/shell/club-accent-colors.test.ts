import { describe, expect, it } from "vitest";
import { hexToHsl } from "../../world/color-math.ts";
import { PLAYER_CLUB_KIT_PRIMARY, PLAYER_CLUB_KIT_SECONDARY } from "../../world/club-kit.ts";
import { CLUB_ACCENT_SLATE, clubAccentColors } from "./club-accent-colors.ts";
import { contrastRatio } from "./title-bar-colors.ts";

const PANEL = "#ffffff";
const PAGE = "#f3f5f1";
const INK = "#16211a";

function hueOf(hex: string): number {
  return hexToHsl(hex)!.h;
}

describe("clubAccentColors", () => {
  it("keeps the stylesheet defaults for Kieler FC and without a kit", () => {
    expect(clubAccentColors({ primary: PLAYER_CLUB_KIT_PRIMARY, secondary: PLAYER_CLUB_KIT_SECONDARY })).toBeNull();
    expect(clubAccentColors({ primary: "#2E9E46", secondary: "#1E7A38" })).toBeNull();
    expect(clubAccentColors(null)).toBeNull();
    expect(clubAccentColors(undefined)).toBeNull();
  });

  it("tints a navy club blue and stays readable", () => {
    const colors = clubAccentColors({ primary: "#1d3a8a", secondary: "#0f1f4d" })!;
    expect(hueOf(colors.accent)).toBeCloseTo(hueOf("#1d3a8a"), -1);
    expect(contrastRatio(colors.accent, PANEL)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.accent, PAGE)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.accent, colors.onAccent)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.accentStrong, colors.onAccent)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.accentSoft, INK)).toBeGreaterThanOrEqual(4.5);
  });

  it("darkens a light sky-blue kit until text on the page passes", () => {
    const colors = clubAccentColors({ primary: "#5fb4e8", secondary: "#3d8fc2" })!;
    expect(hueOf(colors.accent)).toBeCloseTo(hueOf("#5fb4e8"), -1);
    expect(contrastRatio(colors.accent, PAGE)).toBeGreaterThanOrEqual(4.5);
    expect(hexToHsl(colors.accent)!.l).toBeLessThan(hexToHsl("#5fb4e8")!.l);
  });

  it("makes the strong shade darker than the accent", () => {
    const colors = clubAccentColors({ primary: "#6a2c91", secondary: "#4a1d66" })!;
    expect(hexToHsl(colors.accentStrong)!.l).toBeLessThan(hexToHsl(colors.accent)!.l);
  });

  it.each([
    ["red", "#c0262d", "#8a1a1f"],
    ["orange", "#e0701e", "#a84f12"],
    ["yellow", "#f2c500", "#b89200"],
    ["crimson", "#b3123f", "#7d0c2c"],
  ])("falls back to slate for a %s kit", (_name, primary, secondary) => {
    expect(clubAccentColors({ primary, secondary })).toEqual(CLUB_ACCENT_SLATE);
  });

  it("uses the secondary colour when only the primary is warm", () => {
    const colors = clubAccentColors({ primary: "#c0262d", secondary: "#1d3a8a" })!;
    expect(hueOf(colors.accent)).toBeCloseTo(hueOf("#1d3a8a"), -1);
  });

  it("accepts a grey kit as a neutral accent", () => {
    const colors = clubAccentColors({ primary: "#777777", secondary: "#444444" })!;
    expect(colors).not.toEqual(CLUB_ACCENT_SLATE);
    expect(contrastRatio(colors.accent, PAGE)).toBeGreaterThanOrEqual(4.5);
  });

  it("falls back to slate for unparseable kit colours", () => {
    expect(clubAccentColors({ primary: "tomato", secondary: "" })).toEqual(CLUB_ACCENT_SLATE);
  });

  it("ships a readable slate set", () => {
    const s = CLUB_ACCENT_SLATE;
    expect(contrastRatio(s.accent, PAGE)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(s.accent, s.onAccent)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(s.accentStrong, s.onAccent)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(s.accentSoft, INK)).toBeGreaterThanOrEqual(4.5);
  });
});
