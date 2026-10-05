import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  createInjuryForPlayer,
  injuryWeeklyChance,
  rollWeeklyInjuries,
  tickInjuryRecovery,
} from "./injury-roll.ts";

describe("injury roll", () => {
  it("returns zero chance below the risk floor", () => {
    expect(injuryWeeklyChance(20)).toBe(0);
    expect(injuryWeeklyChance(39)).toBe(0);
  });

  it("increases chance with higher risk scores", () => {
    const mid = injuryWeeklyChance(60);
    const high = injuryWeeklyChance(95);
    expect(high).toBeGreaterThan(mid);
    expect(high).toBeLessThanOrEqual(0.12);
  });

  it("ticks injury recovery down each week", () => {
    const player = clonePlayer();
    player.state.injury = {
      type_id: "ankle",
      weeks_remaining: 2,
      severity: "minor",
      sustained_week: 4,
    };
    const once = tickInjuryRecovery(player);
    expect(once.state.injury?.weeks_remaining).toBe(1);
    const cleared = tickInjuryRecovery(once);
    expect(cleared.state.injury).toBeNull();
  });

  it("rolls injuries deterministically for the same seed", () => {
    const player = clonePlayer();
    player.state.fitness = 48;
    player.state.weekly_minutes = 88;
    player.state.recent_weekly_minutes = [90, 85];

    const context = {
      masterSeed: 4242,
      season: 1,
      week: 12,
      intensity: 125,
      injuryRiskFactor: 1,
      managerClubId: player.club_id ?? "cl_fc_nordstern",
    };

    const first = rollWeeklyInjuries([player], context);
    const second = rollWeeklyInjuries([player], context);
    expect(first.notices.length).toBe(second.notices.length);
    if (first.notices.length > 0) {
      expect(first.notices[0]?.playerId).toBe(second.notices[0]?.playerId);
    }
  });

  it("creates stable injury shape from seed", () => {
    const player = clonePlayer();
    const injury = createInjuryForPlayer(player, 80, 1, 5, 999);
    expect(injury.weeks_remaining).toBeGreaterThan(0);
    expect(["minor", "moderate", "severe"]).toContain(injury.severity);
  });
});
