import { describe, expect, it } from "vitest";
import { ACHIEVEMENT } from "../player/achievements.ts";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { simulateYouthWeek } from "./youth-sim.ts";

describe("youth sim", () => {
  it("produces a weekly report with team results and standout players", () => {
    const player = clonePlayer();
    player.squad_status = "u17";
    player.age = 16;
    const { players, report } = simulateYouthWeek([player], 34, 2026);
    expect(report.week).toBe(34);
    expect(report.u17_results.wins + report.u17_results.draws + report.u17_results.losses).toBeGreaterThan(0);
    expect(report.standout_players[0]?.player_id).toBe(player.id);
    expect(players[0]?.state.weekly_minutes).toBeGreaterThan(0);
  });

  it("records achievement badges for standout youth weeks", () => {
    let player = clonePlayer();
    player.squad_status = "u17";
    player.id = "pl_00042";
    player.portrait_seed = 424242;
    for (let week = 1; week <= 40; week++) {
      const result = simulateYouthWeek([player], week, 77_007);
      player = result.players[0]!;
      if (player.history.achievements.length > 0) break;
    }
    expect(player.history.achievements.some((badge) => badge === ACHIEVEMENT.youthTopForm || badge === ACHIEVEMENT.youthHeavyMinutes)).toBe(
      true,
    );
  });

  it("is deterministic for the same seed", () => {
    const player = clonePlayer();
    player.squad_status = "u19";
    const first = simulateYouthWeek([player], 12, 99);
    const second = simulateYouthWeek([player], 12, 99);
    expect(second.report).toEqual(first.report);
  });
});
