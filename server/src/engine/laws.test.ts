import { asPlayerId, asTeamId } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import {
  foulRestartPhase,
  inPenaltyArea,
  isOffsideReceiver,
  outOfPlayRestart,
  penaltySpot,
} from "./laws.ts";
import type { PlayerMatchStatus } from "@fussballmanager/shared";

const home = asTeamId("home");
const away = asTeamId("away");

function defender(x: number, id: string): PlayerMatchStatus {
  return {
    playerId: asPlayerId(id),
    teamId: away,
    role: id.startsWith("gk") ? "GK" : "CB",
    position: { x, y: 50 },
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
      heightCm: 180,
    },
    fatigue: 0,
    form: 50,
    yellowCards: 0,
    sentOff: false,
  };
}

describe("pitch laws", () => {
  it("puts a foul in the box on a penalty spot, not a free kick", () => {
    expect(inPenaltyArea({ x: 90, y: 50 }, away, home)).toBe(true);
    expect(inPenaltyArea({ x: 70, y: 50 }, away, home)).toBe(false);
    expect(foulRestartPhase({ x: 91, y: 48 }, away, home)).toBe("penalty");
    expect(foulRestartPhase({ x: 60, y: 48 }, away, home)).toBe("free_kick");
    expect(penaltySpot(home, home)).toEqual({ x: 88.5, y: 50 });
  });

  it("flags a receiver beyond the second-last man in the other half", () => {
    const line = [defender(96, "gk"), defender(72, "cb1"), defender(70, "cb2")];
    expect(
      isOffsideReceiver({
        receiver: { x: 78, y: 50 },
        ball: { x: 60, y: 50 },
        defenders: line,
        attackingTeamId: home,
        homeTeamId: home,
      }),
    ).toBe(true);
    expect(
      isOffsideReceiver({
        receiver: { x: 68, y: 50 },
        ball: { x: 60, y: 50 },
        defenders: line,
        attackingTeamId: home,
        homeTeamId: home,
      }),
    ).toBe(false);
    expect(
      isOffsideReceiver({
        receiver: { x: 73, y: 50 },
        ball: { x: 60, y: 50 },
        defenders: line,
        attackingTeamId: home,
        homeTeamId: home,
      }),
    ).toBe(false);
  });

  it("does not flag a receiver in their own half", () => {
    const deep = [defender(96, "gk"), defender(40, "cb1"), defender(38, "cb2")];
    expect(
      isOffsideReceiver({
        receiver: { x: 48, y: 40 },
        ball: { x: 30, y: 50 },
        defenders: deep,
        attackingTeamId: home,
        homeTeamId: home,
      }),
    ).toBe(false);
  });

  it("turns a ball over the touchline into a throw-in for the other side", () => {
    const thrown = outOfPlayRestart({ x: 40, y: -3 }, home, home, away);
    expect(thrown?.phase).toBe("throw_in");
    expect(thrown?.takingTeamId).toBe(away);
    expect(thrown?.spot.y).toBe(0);
  });

  it("gives a goal kick when the attacker last touches over the byline", () => {
    const kick = outOfPlayRestart({ x: 104, y: 50 }, home, home, away);
    expect(kick?.phase).toBe("goal_kick");
    expect(kick?.takingTeamId).toBe(away);
  });
});
