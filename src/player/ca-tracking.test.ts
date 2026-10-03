import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { appendSeasonSnapshot } from "../ui/player-profile.ts";
import {
  caDeltaMark,
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
