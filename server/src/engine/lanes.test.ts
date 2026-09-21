import { describe, expect, it } from "vitest";
import {
  coveringLane,
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
});
