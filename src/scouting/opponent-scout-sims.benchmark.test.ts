import { describe, expect, it } from "vitest";
import { SEED_MATCHUP } from "@fussballmanager/shared";
import {
  OPPONENT_SCOUT_SIM_COUNT,
  opponentScoutSimSeed,
  summarizeOpponentScoutVariants,
  type OpponentScoutSimVariant,
} from "./opponent-scout-sims.ts";

describe("opponent scout sim bundle (PRD 22)", () => {
  it("runs 10 headless match views within 3s (no 128× playback needed)", async () => {
    const { buildMatchView } = await import("../../server/src/api/match-view.ts");
    const started = performance.now();
    const variants: OpponentScoutSimVariant[] = [];
    for (let variantIndex = 0; variantIndex < OPPONENT_SCOUT_SIM_COUNT; variantIndex += 1) {
      const seed = opponentScoutSimSeed(2026, 1, 12, "match_next", variantIndex);
      const view = buildMatchView({
        seed,
        home: SEED_MATCHUP.home,
        away: SEED_MATCHUP.away,
      });
      variants.push({
        variantIndex,
        seed,
        homeScore: view.finalScore.home,
        awayScore: view.finalScore.away,
        eventCount: view.eventCount,
      });
    }
    const elapsedMs = performance.now() - started;
    const summary = summarizeOpponentScoutVariants("match_next", variants);
    expect(variants).toHaveLength(10);
    expect(summary.modeScoreline).toMatch(/^\d+:\d+$/);
    expect(elapsedMs).toBeLessThan(3000);
  });
});
