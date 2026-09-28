import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { formatScoutCa, formatScoutMarketValue, scoutReveal } from "./scout-visibility.ts";

describe("scout visibility", () => {
  it("reveals more detail as uncertainty shrinks", () => {
    expect(scoutReveal(40).visibleBarCount).toBe(2);
    expect(scoutReveal(40).showExactSkills).toBe(false);
    expect(scoutReveal(25).showCi).toBe(true);
    expect(scoutReveal(12).visibleBarCount).toBe(6);
    expect(scoutReveal(8).showExactSkills).toBe(true);
    expect(scoutReveal(8).showExactState).toBe(true);
  });

  it("formats CA as a band until the player is well known", () => {
    const player = clonePlayer();
    expect(formatScoutCa(player, { estimatedAbilityMean: 65, uncertaintyRange: 40, sampleSize: 0 }, false)).toBe("?");
    expect(formatScoutCa(player, { estimatedAbilityMean: 72, uncertaintyRange: 28, sampleSize: 1 }, false)).toMatch(/–/);
    expect(formatScoutCa(player, { estimatedAbilityMean: 72, uncertaintyRange: 8, sampleSize: 2 }, false)).toMatch(/^\d+$/);
  });

  it("hides market value until scouting narrows uncertainty", () => {
    const player = clonePlayer();
    expect(formatScoutMarketValue(player, { estimatedAbilityMean: 65, uncertaintyRange: 40, sampleSize: 0 }, 1, false)).toBe(
      "?",
    );
    expect(
      formatScoutMarketValue(player, { estimatedAbilityMean: 72, uncertaintyRange: 28, sampleSize: 1 }, 1, false),
    ).toMatch(/–/);
    expect(
      formatScoutMarketValue(player, { estimatedAbilityMean: 72, uncertaintyRange: 8, sampleSize: 2 }, 1, false),
    ).not.toBe("?");
  });
});
