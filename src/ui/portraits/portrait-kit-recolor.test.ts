import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PLAYER_CLUB_KIT_PRIMARY } from "../../world/club-kit.ts";
import {
  PORTRAIT_ACCENT,
  recolorPortraitSvgShirt,
} from "./portrait-kit-recolor.ts";

describe("recolorPortraitSvgShirt", () => {
  it("swaps baked accent for kit primary", () => {
    const svg = `<svg><path fill="${PORTRAIT_ACCENT}"/></svg>`;
    const out = recolorPortraitSvgShirt(svg, PLAYER_CLUB_KIT_PRIMARY);
    expect(out).toContain(PLAYER_CLUB_KIT_PRIMARY);
    expect(out).not.toContain(PORTRAIT_ACCENT);
  });

  it("recolors first shirt skin fill on a mens_squad bust", () => {
    const file = path.join(process.cwd(), "public/assets/portraits/bust/peep-3.svg");
    const svg = readFileSync(file, "utf8");
    const out = recolorPortraitSvgShirt(svg, "#2244aa");
    expect(out).toContain('fill="#2244aa"');
  });
});
