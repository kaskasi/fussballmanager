import { holzwegSquad, scatterAttributes } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import {
  formatMatchTally,
  formatSide,
  formatShotAutopsy,
  probeKnob,
  probeShotAutopsy,
  probeTacticsSwap,
  probeVenue,
} from "./probe.ts";

describe("cadres are not role clones", () => {
  it("scatters the same base card deterministically by salt", () => {
    const base = holzwegSquad.starters[0]!.player.attributes;
    const a = scatterAttributes(base, "holz-6");
    const b = scatterAttributes(base, "holz-6");
    const c = scatterAttributes(base, "holz-8");
    expect(a).toEqual(b);
    expect(a.pace === c.pace && a.passing === c.passing).toBe(false);
  });
});

describe("matchup probes", () => {
  const seeds = [7, 11] as const;

  it("runs Nordstern home and away so venue can be compared to cadre", () => {
    const venue = probeVenue(seeds);
    expect(venue.nordsternAtHome.shots + venue.nordsternAway.shots).toBeGreaterThan(
      0,
    );
    expect(venue.rheinwachtAtHome.shots + venue.rheinwachtAway.shots).toBeGreaterThan(
      0,
    );
    expect(formatSide("NOR home", venue.nordsternAtHome)).toContain("goals");
  });

  it("runs the same XIs with swapped instructions", () => {
    const tactics = probeTacticsSwap(seeds);
    expect(tactics.ownTactics.shots + tactics.swappedTactics.shots).toBeGreaterThan(
      0,
    );
  });

  it("turns one home knob over the same seeds", () => {
    const line = probeKnob("line", seeds);
    expect(line.baseline.homeShots + line.variant.homeShots).toBeGreaterThan(0);
    expect(formatMatchTally(line.baselineLabel, line.baseline)).toContain("–");
  });

  it("autopsies home shots by role, distance, and outcome", () => {
    const report = probeShotAutopsy(seeds);
    expect(formatShotAutopsy("own", report.ownTactics)).toContain("shots");
    expect(
      report.ownTactics.n + report.directTactics.n,
    ).toBeGreaterThanOrEqual(0);
  });
});
