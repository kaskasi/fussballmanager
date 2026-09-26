import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { departureRiskReasons } from "./departure-risk.ts";

describe("departure risk", () => {
  it("flags low minutes over four weeks", () => {
    const player = clonePlayer();
    player.age = 17;
    player.squad_status = "u17";
    player.state.recent_weekly_minutes = [5, 8, 10, 12];
    const reasons = departureRiskReasons(player, 40, 2026);
    expect(reasons).toContain("no_game_time");
  });

  it("ignores players under 16", () => {
    const player = clonePlayer();
    player.age = 15;
    player.squad_status = "u17";
    player.state.recent_weekly_minutes = [0, 0, 0, 0];
    expect(departureRiskReasons(player, 40, 2026)).toEqual([]);
  });

  it("flags missing contract at 17+", () => {
    const player = clonePlayer();
    player.age = 17;
    player.squad_status = "u19";
    player.contract = null;
    player.state.recent_weekly_minutes = [60, 60, 60, 60];
    expect(departureRiskReasons(player, 40, 2026)).toContain("no_contract");
  });
});
