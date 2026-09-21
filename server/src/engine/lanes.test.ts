import { describe, expect, it } from "vitest";
import {
  coveringLane,
  openKeeperLook,
  pointToSegmentDistance,
} from "./lanes.ts";
import { asPlayerId, asTeamId } from "@fussballmanager/shared";
import type { PlayerMatchStatus } from "@fussballmanager/shared";

const attrs = {
  passing: 50,
  tackling: 50,
  shooting: 50,
  pace: 60,
  stamina: 50,
  positioning: 70,
  aerial: 50,
  dribbling: 50,
  goalkeeping: 8,
  heightCm: 180,
};

function defender(x: number, y: number): PlayerMatchStatus {
  return {
    playerId: asPlayerId("d1"),
    teamId: asTeamId("away"),
    role: "CM",
    position: { x, y },
    onPitch: true,
    attributes: attrs,
    fatigue: 0,
    form: 50,
    yellowCards: 0,
    sentOff: false,
  };
}

describe("passing lanes", () => {
  it("treats a player on the pass as covering the lane", () => {
    const from = { x: 40, y: 50 };
    const to = { x: 70, y: 50 };
    expect(pointToSegmentDistance({ x: 55, y: 50 }, from, to).distance).toBeLessThan(
      0.2,
    );
    expect(coveringLane(defender(55, 51), from, to)).toBe(true);
    expect(coveringLane(defender(55, 80), from, to)).toBe(false);
  });

  it("lets any shirt shoot when the keeper is the only body on the goal line", () => {
    const from = { x: 84, y: 48 };
    const mouth = { x: 100, y: 50 };
    const gk = { ...defender(96, 50), role: "GK" as const, playerId: asPlayerId("gk") };
    const wide = { ...defender(82, 78), playerId: asPlayerId("wide") };
    const blocker = { ...defender(90, 49), playerId: asPlayerId("block") };
    expect(
      openKeeperLook({
        from,
        mouth,
        defenders: [gk, wide],
        distanceToGoal: 16,
      }),
    ).toBe(true);
    expect(
      openKeeperLook({
        from,
        mouth,
        defenders: [gk, blocker],
        distanceToGoal: 16,
      }),
    ).toBe(false);
  });
});
