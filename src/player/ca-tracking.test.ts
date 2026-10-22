import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { appendSeasonSnapshot } from "../ui/player-profile.ts";
import {
  caDeltaMark,
  developmentMoverPeriodDelta,
  formatDevelopmentPeriodDelta,
  formatSquadCaDeltaSummary,
  listDevelopmentMovers,
  playerCa,
  seasonCaDelta,
  squadWeeklyCaDeltaSummary,
  stampLastWeekCa,
  weeklyCaDelta,
} from "./ca-tracking.ts";

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

  it("uses icon marks for CA deltas", () => {
    expect(caDeltaMark(2)).toBe("▲");
    expect(caDeltaMark(-1)).toBe("▼");
    expect(caDeltaMark(0)).toBe("—");
  });

  it("summarises squad CA movement for the hub", () => {
    const up = clonePlayer();
    up.club_id = "cl_fc_nordstern";
    up.squad_status = "pro";
    up.state.last_week_ca = playerCa(up) - 1;
    const flat = clonePlayer();
    flat.id = "pl_flat";
    flat.club_id = "cl_fc_nordstern";
    flat.squad_status = "pro";
    flat.state.last_week_ca = playerCa(flat);
    const summary = squadWeeklyCaDeltaSummary([up, flat], "cl_fc_nordstern");
    expect(summary.total).toBe(1);
    expect(summary.risers).toBe(1);
    expect(formatSquadCaDeltaSummary(summary)).toMatch(/\+1 CA/);
  });

  it("stamps last week CA after simulation", () => {
    const player = clonePlayer();
    const stamped = stampLastWeekCa(player);
    expect(stamped.state.last_week_ca).toBe(playerCa(player));
  });

  it("stamps the CA from the start of the week, so growth shows as a weekly delta", () => {
    const weekStart = clonePlayer();
    const grown = { ...weekStart, attributes: { ...weekStart.attributes, passing: 99, vision: 99 } };
    const stamped = stampLastWeekCa(grown, weekStart);
    expect(stamped.state.last_week_ca).toBe(playerCa(weekStart));
    expect(weeklyCaDelta(stamped)).toBeGreaterThan(0);
    expect(stamped.state.ca_history).toHaveLength(1);
  });

  it("measures week, month and year deltas from the CA history", () => {
    const player = clonePlayer();
    expect(developmentMoverPeriodDelta(player, "week")).toBeNull();
    const now = playerCa(player);
    player.state.ca_history = [now - 6, now - 3, now - 2, now - 1.5, now - 0.5];
    expect(developmentMoverPeriodDelta(player, "week")).toBeCloseTo(0.5, 0);
    expect(developmentMoverPeriodDelta(player, "month")).toBeCloseTo(3, 0);
    expect(developmentMoverPeriodDelta(player, "year")).toBeCloseTo(6, 0);
    expect(formatDevelopmentPeriodDelta(0.01)).toBe("0");
    expect(formatDevelopmentPeriodDelta(null)).toBe("—");
  });

  it("ranks desk movers by the selected period", () => {
    const steady = clonePlayer();
    steady.id = "pl_steady";
    steady.club_id = "cl_fc_nordstern";
    steady.state.recent_growth_26w = 9;
    steady.state.ca_history = [playerCa(steady)];
    const riser = clonePlayer();
    riser.id = "pl_riser";
    riser.club_id = "cl_fc_nordstern";
    riser.state.recent_growth_26w = 0;
    riser.state.ca_history = [playerCa(riser) - 2];
    const movers = listDevelopmentMovers([steady, riser], "cl_fc_nordstern", 3, "week");
    expect(movers[0]?.playerId).toBe("pl_riser");
  });

  it("computes season CA delta from the prior season snapshot", () => {
    const player = clonePlayer();
    expect(seasonCaDelta(player, 1)).toBeNull();
    const snapshotted = appendSeasonSnapshot(player, 1);
    const baselineCa = playerCa(snapshotted);
    const grown = {
      ...snapshotted,
      attributes: { ...snapshotted.attributes, passing: 99, vision: 99 },
    };
    expect(seasonCaDelta(grown, 2)).toBe(playerCa(grown) - baselineCa);
    expect(seasonCaDelta(grown, 2)).toBeGreaterThan(0);
  });
});
