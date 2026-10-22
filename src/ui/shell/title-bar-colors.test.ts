import { describe, expect, it } from "vitest";
import { PLAYER_CLUB_KIT_PRIMARY, PLAYER_CLUB_KIT_SECONDARY } from "../../world/club-kit.ts";
import { contrastRatio, titleBarColors } from "./title-bar-colors.ts";

const INK = "#16211a";
const WHITE = "#ffffff";

describe("contrastRatio", () => {
  it("matches WCAG for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  it("accepts short hex and is symmetric", () => {
    expect(contrastRatio("#fff", "#16211a")).toBeCloseTo(contrastRatio("#16211a", "#ffffff"), 5);
  });

  it("returns 1 for unparseable input", () => {
    expect(contrastRatio("tomato", "#ffffff")).toBe(1);
  });
});

describe("titleBarColors", () => {
  it("paints Nordstern green with ink text", () => {
    const colors = titleBarColors({ primary: PLAYER_CLUB_KIT_PRIMARY, secondary: PLAYER_CLUB_KIT_SECONDARY });
    expect(colors).toEqual({ club: "#2e9e46", onClub: INK });
    expect(contrastRatio(colors.club, colors.onClub)).toBeGreaterThanOrEqual(4.5);
  });

  it("puts white text on a navy kit", () => {
    expect(titleBarColors({ primary: "#1d3a8a", secondary: "#0f1f4d" })).toEqual({
      club: "#1d3a8a",
      onClub: WHITE,
    });
  });

  it("skips a yellow primary that would swallow the Next button", () => {
    expect(titleBarColors({ primary: "#f2c500", secondary: "#1d3a8a" })).toEqual({
      club: "#1d3a8a",
      onClub: WHITE,
    });
  });

  it("falls back to ink when neither kit colour works", () => {
    expect(titleBarColors({ primary: "#ffd000", secondary: "#f5c400" })).toEqual({
      club: INK,
      onClub: WHITE,
    });
  });

  it("skips mid-tone kits where neither text colour reaches 4.5:1", () => {
    expect(titleBarColors({ primary: "#e0503a", secondary: "#7a1d12" }).club).toBe("#7a1d12");
  });

  it("prefers the secondary colour in the dark theme", () => {
    expect(
      titleBarColors({ primary: PLAYER_CLUB_KIT_PRIMARY, secondary: PLAYER_CLUB_KIT_SECONDARY }, "dark"),
    ).toEqual({ club: "#1e7a38", onClub: WHITE });
  });

  it("falls back to ink without a kit", () => {
    expect(titleBarColors(null)).toEqual({ club: INK, onClub: WHITE });
  });
});
