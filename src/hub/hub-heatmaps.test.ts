import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { hubAttributeRollup } from "./hub-heatmaps.ts";
import { copyAttributes } from "../player/growth-history.ts";

describe("hubAttributeRollup", () => {
  it("sums growth per σ group from week-start baseline", () => {
    const session = newGameSession();
    const { season, week, clubId } = session;
    const player = session.players.find((p) => p.club_id === clubId && p.squad_status === "pro");
    expect(player).toBeDefined();
    if (!player) return;

    const baseline = copyAttributes(player.attributes);
    const bumped = {
      ...player,
      attributes: {
        ...player.attributes,
        passing: player.attributes.passing + 2,
        pace: player.attributes.pace + 1,
        composure: player.attributes.composure + 3,
      },
      state: {
        ...player.state,
        week_start_attributes: baseline,
        week_start_key: { season, week },
      },
    };
    const players = session.players.map((p) => (p.id === player.id ? bumped : p));

    const rollup = hubAttributeRollup(players, clubId, season, week);
    const byGroup = Object.fromEntries(rollup.map((row) => [row.group, row.totalDelta]));
    expect(byGroup.technical).toBe(2);
    expect(byGroup.physical).toBe(1);
    expect(byGroup.mental).toBe(3);
  });
});
