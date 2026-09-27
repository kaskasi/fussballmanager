import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { listDevelopmentMovers, playerCa, stampLastWeekCa, weeklyCaDelta } from "./ca-tracking.ts";

describe("ca tracking", () => {
  it("computes weekly CA delta from last_week_ca", () => {
    const player = clonePlayer();
    player.state.last_week_ca = playerCa(player) - 2;
    expect(weeklyCaDelta(player)).toBe(2);
  });

  it("ranks development movers by recent growth", () => {
    const hot = clonePlayer();
    hot.id = "pl_hot";
    hot.club_id = "cl_fc_nordstern";
    hot.state.recent_growth_26w = 4.2;
    const cold = clonePlayer();
    cold.id = "pl_cold";
    cold.club_id = "cl_fc_nordstern";
    cold.state.recent_growth_26w = 0.1;
    const movers = listDevelopmentMovers([hot, cold], "cl_fc_nordstern");
    expect(movers[0]?.playerId).toBe("pl_hot");
  });

  it("stamps last week CA after simulation", () => {
    const player = clonePlayer();
    const stamped = stampLastWeekCa(player);
    expect(stamped.state.last_week_ca).toBe(playerCa(player));
  });
});
