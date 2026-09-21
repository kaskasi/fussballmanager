import {
  asPlayerId,
  asTeamId,
  DEFAULT_LINE_CONTROL,
  POSSESSION_LINE_DUTIES,
  type PlayerMatchStatus,
  type TeamTactics,
} from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { pickPressUnit } from "./open-play.ts";
import { carryPermission } from "./weights.ts";
import type { MatchState } from "@fussballmanager/shared";

const tactics: TeamTactics = {
  teamId: asTeamId("away"),
  formation: "4-4-2",
  mentality: 50,
  pressing: 70,
  width: 55,
  tempo: 50,
  marking: "zonal",
  ...DEFAULT_LINE_CONTROL,
  ...POSSESSION_LINE_DUTIES,
};

const attrs = {
  passing: 50,
  tackling: 60,
  shooting: 50,
  pace: 60,
  stamina: 50,
  positioning: 55,
  aerial: 50,
  dribbling: 50,
  goalkeeping: 8,
  heightCm: 180,
};

function stub(
  role: PlayerMatchStatus["role"],
  id: string,
  position: { x: number; y: number },
): PlayerMatchStatus {
  return {
    playerId: asPlayerId(id),
    teamId: asTeamId("away"),
    role,
    position,
    onPitch: true,
    attributes: attrs,
    fatigue: 0,
    form: 50,
    yellowCards: 0,
    sentOff: false,
  };
}

describe("presser and cover", () => {
  it("sends a midfielder to press, not both centre-backs", () => {
    const cm = stub("CM", "cm", { x: 48, y: 46 });
    const lcb = stub("CB", "lcb", { x: 28, y: 38 });
    const rcb = stub("CB", "rcb", { x: 28, y: 62 });
    const gk = stub("GK", "gk", { x: 6, y: 50 });
    gk.attributes = { ...attrs, goalkeeping: 70 };
    const state = {
      ball: { x: 50, y: 48 },
      homeTeamId: asTeamId("home"),
      awayTeamId: asTeamId("away"),
      possessionTeamId: asTeamId("home"),
      homeTactics: tactics,
      awayTactics: tactics,
    } as MatchState;
    const unit = pickPressUnit([gk, lcb, rcb, cm], state, asTeamId("away"));
    expect(unit.presser?.role).toBe("CM");
    expect(unit.cover?.role).toBe("CB");
  });
});

describe("carry permission", () => {
  it("almost never lets a centre-back dribble into the final third", () => {
    const cb = stub("CB", "cb", { x: 70, y: 50 });
    const w = stub("W", "w", { x: 70, y: 16 });
    const fb = stub("FB", "fb", { x: 70, y: 14 });
    fb.slot = "LB";
    const overlap: TeamTactics = {
      ...tactics,
      fullbackDuty: { LB: "overlap", RB: "overlap" },
    };
    expect(carryPermission(cb, tactics, 18)).toBeLessThan(
      carryPermission(w, tactics, 18),
    );
    expect(carryPermission(fb, overlap, 30)).toBeGreaterThan(
      carryPermission(cb, tactics, 30),
    );
  });
});
