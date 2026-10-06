import { describe, expect, it } from "vitest";
import { sandboxPlanFromFormation } from "@fussballmanager/shared";
import {
  buildOpponentScoutReport,
  tacticHashFromPlan,
  opponentScoutVariantPlans,
} from "./opponent-scout-bundle.ts";
import type { OpponentScoutSimVariant } from "./opponent-scout-sims.ts";

describe("opponent scout report", () => {
  it("returns 2 rows at low trust and wider bands than high trust", () => {
    const variants: OpponentScoutSimVariant[] = Array.from({ length: 10 }, (_, index) => ({
      variantIndex: index,
      seed: index,
      homeScore: 2,
      awayScore: 1,
      eventCount: 100,
      formationLabel: index < 5 ? "4-3-3" : "4-4-2",
      risk: "balanced",
      goalsFor: index % 3,
      goalsAgainst: 1,
    }));
    const low = buildOpponentScoutReport("m1", variants, 40);
    const high = buildOpponentScoutReport("m1", variants, 80);
    expect(low.bundleSummary.simCount).toBe(10);
    expect(low.recommendations.length).toBeLessThanOrEqual(2);
    expect(high.recommendations.length).toBeLessThanOrEqual(3);
    const lowWidth = low.recommendations[0]!.goalsForBand[1] - low.recommendations[0]!.goalsForBand[0];
    const highWidth = high.recommendations[0]!.goalsForBand[1] - high.recommendations[0]!.goalsForBand[0];
    expect(lowWidth).toBeGreaterThanOrEqual(highWidth);
  });

  it("builds deterministic tactic hashes and 10 variant plans", () => {
    const plan = sandboxPlanFromFormation("4-3-3");
    const hashA = tacticHashFromPlan(plan);
    const hashB = tacticHashFromPlan({ ...plan, pressing: plan.pressing + 5 });
    expect(hashA).not.toBe(hashB);
    expect(opponentScoutVariantPlans(plan)).toHaveLength(10);
  });
});
