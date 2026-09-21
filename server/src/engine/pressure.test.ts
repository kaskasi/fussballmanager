import { describe, expect, it } from "vitest";
import { effectivePressing, isolationFactor, localPressCount } from "./pressure.ts";
import { shotOutcomeChances } from "./weights.ts";
import type { TeamTactics } from "@fussballmanager/shared";
import { asTeamId, DEFAULT_LINE_CONTROL, POSSESSION_LINE_DUTIES } from "@fussballmanager/shared";

const tactics: TeamTactics = {
  teamId: asTeamId("home"),
  formation: "4-3-3",
  mentality: 50,
  pressing: 80,
  width: 50,
  tempo: 50,
  marking: "zonal",
  ...DEFAULT_LINE_CONTROL,
  intensity: 110,
  ...POSSESSION_LINE_DUTIES,
};

describe("pressing from numbers, not formation id", () => {
  it("raises effective pressing when more teammates swarm the ball", () => {
    const sparse = effectivePressing(tactics, 1);
    const pack = effectivePressing(tactics, 5);
    const wave = effectivePressing(tactics, 1, 5);
    expect(pack).toBeGreaterThan(sparse);
    expect(wave).toBeGreaterThan(sparse);
  });

  it("makes shots easier when few players sit between ball and goal", () => {
    const base = {
      shooting: 70,
      form: 60,
      fatigue: 10,
      mentality: 55,
      distanceToGoal: 16,
      keeperGoalkeeping: 70,
      keeperPositioning: 60,
      keeperForm: 55,
      keeperFatigue: 5,
      defenderClose: true,
      defenderTackling: 70,
    };
    const packed = shotOutcomeChances({ ...base, restCovers: 5 });
    const stripped = shotOutcomeChances({ ...base, restCovers: 2 });
    expect(stripped.goalGivenOnTarget).toBeGreaterThan(packed.goalGivenOnTarget);
    expect(stripped.block).toBeLessThan(packed.block);
  });

  it("counts local pressers by radius", () => {
    const ball = { x: 70, y: 50 };
    const count = localPressCount(
      [
        {
          playerId: "a" as never,
          teamId: asTeamId("home"),
          role: "ST",
          position: { x: 72, y: 48 },
          onPitch: true,
          attributes: {
            passing: 50,
            tackling: 50,
            shooting: 50,
            pace: 50,
            stamina: 50,
            positioning: 50,
            aerial: 50,
            dribbling: 50,
            goalkeeping: 8,
          },
          fatigue: 0,
          form: 50,
          yellowCards: 0,
          sentOff: false,
        },
        {
          playerId: "b" as never,
          teamId: asTeamId("home"),
          role: "CB",
          position: { x: 20, y: 50 },
          onPitch: true,
          attributes: {
            passing: 50,
            tackling: 50,
            shooting: 50,
            pace: 50,
            stamina: 50,
            positioning: 50,
            aerial: 50,
            dribbling: 50,
            goalkeeping: 8,
          },
          fatigue: 0,
          form: 50,
          yellowCards: 0,
          sentOff: false,
        },
      ],
      ball,
    );
    expect(count).toBe(1);
    expect(isolationFactor(2)).toBeGreaterThan(isolationFactor(5));
  });
});
