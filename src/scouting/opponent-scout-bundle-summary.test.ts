import { describe, expect, it } from "vitest";
import { buildOpponentScoutBundleSummary } from "./opponent-scout-bundle-summary.ts";
import type { OpponentScoutSimVariant } from "./opponent-scout-sims.ts";

describe("opponent scout bundle summary", () => {
  it("aggregates win rates and averages", () => {
    const variants: OpponentScoutSimVariant[] = [
      {
        variantIndex: 0,
        seed: 1,
        homeScore: 2,
        awayScore: 0,
        eventCount: 10,
        goalsFor: 2,
        goalsAgainst: 0,
        shotsFor: 10,
        shotsOnTargetFor: 5,
        shotsAgainst: 3,
        shotsOnTargetAgainst: 1,
        cornersFor: 4,
        cornersAgainst: 2,
        passCompletionPctFor: 80,
      },
      {
        variantIndex: 1,
        seed: 2,
        homeScore: 1,
        awayScore: 1,
        eventCount: 10,
        goalsFor: 1,
        goalsAgainst: 1,
        shotsFor: 6,
        shotsOnTargetFor: 2,
        shotsAgainst: 6,
        shotsOnTargetAgainst: 2,
        cornersFor: 2,
        cornersAgainst: 2,
        passCompletionPctFor: 70,
      },
    ];
    const summary = buildOpponentScoutBundleSummary(variants, "2:0");
    expect(summary.winPct).toBe(50);
    expect(summary.drawPct).toBe(50);
    expect(summary.avgGoalsFor).toBe(1.5);
    expect(summary.avgPassCompletionPct).toBe(75);
  });
});
