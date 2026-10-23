import { SEED_MATCHUP } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { bandRows, matchTotals, runCalibration, scaleSquad } from "./calibration.ts";
import { createInitialState } from "./initial-state.ts";
import { simulate } from "./step.ts";

describe("calibration harness", () => {
  it("tallies goals from the stream that match the final score", () => {
    const state = createInitialState({ home: SEED_MATCHUP.home, away: SEED_MATCHUP.away, seed: 7 });
    const { events, finalState } = simulate({
      state,
      homeTactics: state.homeTactics,
      awayTactics: state.awayTactics,
    });
    const totals = matchTotals(events, state.homeTeamId, state.awayTeamId);
    expect(totals.homeGoals).toBe(finalState.score.home);
    expect(totals.awayGoals).toBe(finalState.score.away);
    expect(totals.onTarget).toBeLessThanOrEqual(totals.shots);
    expect(totals.passesComplete).toBeLessThanOrEqual(totals.passes);
  });

  it("averages per match and reports every band", () => {
    const metrics = runCalibration({
      fixtures: [{ home: SEED_MATCHUP.home, away: SEED_MATCHUP.away }],
      seeds: [3, 5],
    });
    expect(metrics.matches).toBe(2);
    expect(metrics.homeWinRate + metrics.drawRate + metrics.awayWinRate).toBeCloseTo(1);
    expect(bandRows(metrics).map((row) => row.metric)).toContain("shots");
  });

  it("scales skills but not height or outfield keeping", () => {
    const scaled = scaleSquad(SEED_MATCHUP.home, 0.5);
    const before = SEED_MATCHUP.home.starters[5]!.player.attributes;
    const after = scaled.starters[5]!.player.attributes;
    expect(after.passing).toBe(Math.round(before.passing * 0.5));
    expect(after.heightCm).toBe(before.heightCm);
    expect(after.goalkeeping).toBe(before.goalkeeping > 1 ? Math.round(before.goalkeeping * 0.5) : before.goalkeeping);
  });
});
