import { describe, expect, it } from "vitest";
import {
  asPlayerId,
  asTeamId,
  DEFAULT_LINE_CONTROL,
  POSSESSION_LINE_DUTIES,
  type PlayerMatchStatus,
  type TeamTactics,
} from "@fussballmanager/shared";
import {
  clampBackLine,
  cmDutyFor,
  fullbackDutyFor,
  keeperTarget,
  lineDuty,
  manMarkTarget,
  restAttackTarget,
  strikerDutyFor,
  triangleAssignments,
  triangleSpots,
  wideDutyFor,
  zonalCoverTarget,
} from "./shape.ts";

const attrs = {
  passing: 50,
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

describe("marking targets", () => {
  it("puts a zonal defender on the ball-to-goal corridor, not on the attacker", () => {
    const ball = { x: 60, y: 40 };
    const ownGoal = { x: 0, y: 50 };
    const attacker = { x: 72, y: 20 };
    const cb: PlayerMatchStatus = {
      playerId: asPlayerId("cb"),
      teamId: asTeamId("home"),
      role: "CB",
      position: { x: 20, y: 40 },
      onPitch: true,
      attributes: attrs,
      fatigue: 0,
      form: 50,
      yellowCards: 0,
      sentOff: false,
    };
    const zonal = zonalCoverTarget(cb, ball, ownGoal);
    const man = manMarkTarget(attacker, ownGoal);
    expect(zonal.x).toBeGreaterThan(ownGoal.x);
    expect(zonal.x).toBeLessThan(ball.x);
    expect(man.x).toBeLessThan(attacker.x);
    expect(Math.abs(man.y - attacker.y)).toBeLessThan(
      Math.abs(zonal.y - attacker.y),
    );
  });

  it("places two teammates ahead of the ball and one behind for a triangle", () => {
    const spots = triangleSpots({ x: 50, y: 50 }, 1, 60, false);
    expect(spots.left.x).toBeGreaterThan(50);
    expect(spots.right.x).toBeGreaterThan(50);
    expect(spots.back.x).toBeLessThan(50);
    expect(spots.left.y).toBeLessThan(spots.right.y);
    const cm: PlayerMatchStatus = {
      playerId: asPlayerId("cm"),
      teamId: asTeamId("home"),
      slot: "RCM",
      role: "CM",
      position: { x: 48, y: 40 },
      onPitch: true,
      attributes: attrs,
      fatigue: 0,
      form: 50,
      yellowCards: 0,
      sentOff: false,
    };
    const w: PlayerMatchStatus = {
      ...cm,
      playerId: asPlayerId("w"),
      role: "W",
      position: { x: 55, y: 70 },
    };
    const dm: PlayerMatchStatus = {
      ...cm,
      playerId: asPlayerId("dm"),
      role: "DM",
      position: { x: 40, y: 50 },
    };
    const assigned = triangleAssignments(asPlayerId("st"), [cm, w, dm], spots, {
      teamId: asTeamId("home"),
      formation: "4-3-3",
      mentality: 50,
      pressing: 50,
      width: 60,
      tempo: 50,
      marking: "zonal",
      ...DEFAULT_LINE_CONTROL,
      ...POSSESSION_LINE_DUTIES,
    });
    expect(assigned.size).toBe(3);
    expect(lineDuty("CB")).toBe("defend");
    expect(lineDuty("CM")).toBe("mid");
    expect(lineDuty("ST")).toBe("attack");
  });

  it("keeps a stay goalie in the box and lets a sweeper hunt to halfway", () => {
    const ownGoal = { x: 0, y: 50 };
    const ball = { x: 38, y: 44 };
    const stay = keeperTarget({
      duty: "stay",
      defending: true,
      ball,
      ownGoal,
      attackSign: 1,
      teammates: [],
    });
    const sweeper = keeperTarget({
      duty: "sweeper",
      defending: true,
      ball,
      ownGoal,
      attackSign: 1,
      teammates: [],
    });
    expect(stay.x).toBeLessThan(16);
    expect(sweeper.x).toBeGreaterThan(stay.x);
    expect(sweeper.x).toBeLessThan(50);
  });

  it("tucks an inside full-back and sends an overlap full-back up the banana", () => {
    const ownGoal = { x: 0, y: 50 };
    const ball = { x: 55, y: 50 };
    const lb: PlayerMatchStatus = {
      playerId: asPlayerId("lb"),
      teamId: asTeamId("home"),
      role: "FB",
      slot: "LB",
      position: { x: 22, y: 14 },
      onPitch: true,
      attributes: attrs,
      fatigue: 0,
      form: 50,
      yellowCards: 0,
      sentOff: false,
    };
    const insideTactics: TeamTactics = {
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
    const overlapTactics: TeamTactics = {
      ...insideTactics,
      ...{
        keeperDuty: "stay" as const,
        fullbackDuty: { LB: "overlap" as const, RB: "overlap" as const },
      },
    };
    const inside = restAttackTarget(lb, ball, ownGoal, 1, insideTactics);
    const overlap = restAttackTarget(lb, ball, ownGoal, 1, overlapTactics);
    expect(fullbackDutyFor(lb, insideTactics)).toBe("inside");
    expect(inside.x).toBeLessThan(50);
    expect(inside.y).toBeGreaterThan(30);
    expect(overlap.x).toBeGreaterThan(inside.x);
    expect(overlap.y).toBeLessThan(20);
    const cb: PlayerMatchStatus = { ...lb, role: "CB", slot: "LCB", position: { x: 20, y: 40 } };
    const dragged = clampBackLine(cb, { x: 88, y: 50 }, ownGoal, 1, insideTactics);
    expect(dragged.x).toBeLessThanOrEqual(50);
  });

  it("splits midfield and attack jobs: hold vs mezzala, wide vs invert, poacher vs false nine", () => {
    const ownGoal = { x: 0, y: 50 };
    const ball = { x: 58, y: 48 };
    const base: TeamTactics = {
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
    const stub = (
      role: PlayerMatchStatus["role"],
      slot: PlayerMatchStatus["slot"],
      position: { x: number; y: number },
    ): PlayerMatchStatus => ({
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
    });
    const hold = restAttackTarget(stub("DM", "DM", { x: 34, y: 50 }), ball, ownGoal, 1, base);
    const regista = restAttackTarget(stub("DM", "DM", { x: 34, y: 50 }), ball, ownGoal, 1, {
      ...base,
      dmDuty: "regista",
    });
    const playmaker = restAttackTarget(
      stub("CM", "LCM", { x: 42, y: 32 }),
      ball,
      ownGoal,
      1,
      base,
    );
    const mezzala = restAttackTarget(
      stub("CM", "RCM", { x: 42, y: 68 }),
      ball,
      ownGoal,
      1,
      base,
    );
    const invert = restAttackTarget(
      stub("W", "LW", { x: 64, y: 16 }),
      ball,
      ownGoal,
      1,
      base,
    );
    const wide = restAttackTarget(stub("W", "LW", { x: 64, y: 16 }), ball, ownGoal, 1, {
      ...base,
      wideDuty: { left: "wide", right: "wide" },
    });
    const nine = restAttackTarget(stub("ST", "ST", { x: 70, y: 50 }), ball, ownGoal, 1, base);
    const poacher = restAttackTarget(stub("ST", "ST", { x: 70, y: 50 }), ball, ownGoal, 1, {
      ...base,
      strikerDuty: { ST: "poacher", LST: "target", RST: "poacher" },
    });
    expect(hold.x).toBeLessThan(regista.x);
    expect(cmDutyFor(stub("CM", "LCM", { x: 42, y: 32 }), base)).toBe("playmaker");
    expect(playmaker.x).toBeLessThan(mezzala.x);
    expect(wideDutyFor(stub("W", "LW", { x: 64, y: 16 }), base)).toBe("invert");
    expect(invert.y).toBeGreaterThan(wide.y);
    expect(strikerDutyFor(stub("ST", "ST", { x: 70, y: 50 }), base)).toBe("false_nine");
    expect(nine.x).toBeLessThan(poacher.x);
    expect(poacher.x).toBeGreaterThan(75);
    const nineHigh = restAttackTarget(
      stub("ST", "ST", { x: 70, y: 50 }),
      { x: 90, y: 50 },
      ownGoal,
      1,
      base,
    );
    expect(nineHigh.x).toBeGreaterThan(nine.x);
    expect(nineHigh.x).toBeGreaterThan(80);
  });

  it("pushes the attacking line higher when lineHeight is raised", () => {
    const ownGoal = { x: 0, y: 50 };
    const ball = { x: 55, y: 50 };
    const st: PlayerMatchStatus = {
      playerId: asPlayerId("st"),
      teamId: asTeamId("home"),
      role: "ST",
      slot: "ST",
      position: { x: 70, y: 50 },
      onPitch: true,
      attributes: attrs,
      fatigue: 0,
      form: 50,
      yellowCards: 0,
      sentOff: false,
    };
    const low = restAttackTarget(st, ball, ownGoal, 1, {
      teamId: asTeamId("home"),
      formation: "4-3-3",
      mentality: 50,
      pressing: 50,
      width: 50,
      tempo: 50,
      marking: "zonal",
      ...POSSESSION_LINE_DUTIES,
      lineHeight: 36,
      intensity: 100,
    });
    const high = restAttackTarget(st, ball, ownGoal, 1, {
      teamId: asTeamId("home"),
      formation: "4-3-3",
      mentality: 50,
      pressing: 80,
      width: 50,
      tempo: 50,
      marking: "zonal",
      ...POSSESSION_LINE_DUTIES,
      lineHeight: 78,
      intensity: 110,
    });
    expect(high.x).toBeGreaterThan(low.x);
  });
});
