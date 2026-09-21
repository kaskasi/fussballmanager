import {
  asPlayerId,
  asTeamId,
  DEFAULT_LINE_CONTROL,
  POSSESSION_LINE_DUTIES,
  type PlayerMatchStatus,
  type TeamTactics,
} from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { passTargetWeight, rolePassLink } from "./pass-graph.ts";
import { occupyBoxTarget } from "./shape.ts";

const tactics: TeamTactics = {
  teamId: asTeamId("home"),
  formation: "4-3-3",
  mentality: 55,
  pressing: 50,
  width: 62,
  tempo: 50,
  marking: "zonal",
  ...DEFAULT_LINE_CONTROL,
  ...POSSESSION_LINE_DUTIES,
};

const attrs = {
  passing: 60,
  tackling: 50,
  shooting: 50,
  pace: 50,
  stamina: 50,
  positioning: 50,
  aerial: 50,
  dribbling: 50,
  goalkeeping: 8,
  heightCm: 180,
};

function stub(
  role: PlayerMatchStatus["role"],
  slot: PlayerMatchStatus["slot"],
  position: { x: number; y: number },
): PlayerMatchStatus {
  return {
    playerId: asPlayerId(`${role}-${slot}`),
    teamId: asTeamId("home"),
    role,
    slot,
    position,
    onPitch: true,
    attributes: attrs,
    fatigue: 0,
    form: 50,
    yellowCards: 0,
    sentOff: false,
  };
}

describe("pass graph", () => {
  it("recycles from a centre-back to the keeper more than to the striker", () => {
    expect(rolePassLink("CB", "GK")).toBeGreaterThan(rolePassLink("CB", "ST"));
    expect(rolePassLink("ST", "CB")).toBeLessThan(rolePassLink("ST", "W"));
  });

  it("treats a GK short ball to a CB as a restart, not a 50/50", () => {
    const gk = stub("GK", "GK", { x: 6, y: 50 });
    const cb = stub("CB", "RCB", { x: 18, y: 62 });
    const st = stub("ST", "ST", { x: 70, y: 50 });
    const ownGoal = { x: 0, y: 50 };
    const toCb = passTargetWeight({
      passer: gk,
      target: cb,
      ownGoal,
      attackSign: 1,
      kind: "restart",
      offside: false,
      tactics,
    });
    const toSt = passTargetWeight({
      passer: gk,
      target: st,
      ownGoal,
      attackSign: 1,
      kind: "restart",
      offside: false,
      tactics,
    });
    expect(toCb).toBeGreaterThan(toSt);
  });
});

describe("box occupation", () => {
  it("sends the striker into the box when the ball is wide in the final third", () => {
    const st = stub("ST", "ST", { x: 70, y: 50 });
    const ownGoal = { x: 0, y: 50 };
    const box = occupyBoxTarget(st, { x: 82, y: 12 }, ownGoal, 1, tactics);
    expect(box).not.toBeNull();
    expect(box?.x).toBeGreaterThan(78);
    expect(Math.abs((box?.y ?? 0) - 50)).toBeLessThan(15);
  });
});
