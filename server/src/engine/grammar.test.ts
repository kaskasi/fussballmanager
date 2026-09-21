import { asPlayerId, asTeamId, createRng } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { pickDuelKind } from "./duels.ts";
import { widePassFeedWeight } from "./possession.ts";
import type { PlayerMatchStatus } from "@fussballmanager/shared";

const attrs = {
  passing: 50,
  tackling: 70,
  shooting: 50,
  pace: 50,
  stamina: 50,
  positioning: 60,
  aerial: 80,
  dribbling: 70,
  goalkeeping: 8,
  heightCm: 180,
};

function player(role: PlayerMatchStatus["role"], id: string): PlayerMatchStatus {
  return {
    playerId: asPlayerId(id),
    teamId: asTeamId("home"),
    role,
    position: { x: 50, y: 50 },
    onPitch: true,
    attributes: attrs,
    fatigue: 0,
    form: 50,
    yellowCards: 0,
    sentOff: false,
  };
}

describe("duel grammar", () => {
  it("does not pick aerial contests when the ball is on the ground", () => {
    let rng = createRng(9);
    const attacker = player("ST", "a");
    const defender = player("CB", "d");
    for (let i = 0; i < 80; i += 1) {
      const picked = pickDuelKind(attacker, defender, rng, false);
      expect(picked.kind).not.toBe("aerial");
      rng = picked.rng;
    }
  });

  it("can pick aerial contests when the ball is in the air", () => {
    let rng = createRng(3);
    const attacker = player("ST", "a");
    const defender = player("CB", "d");
    const kinds = new Set<string>();
    for (let i = 0; i < 80; i += 1) {
      const picked = pickDuelKind(attacker, defender, rng, true);
      kinds.add(picked.kind);
      rng = picked.rng;
    }
    expect(kinds.has("aerial")).toBe(true);
  });
});

describe("wide service", () => {
  it("feeds the box ahead of a striker standing on the D", () => {
    const dZone = widePassFeedWeight({
      passerWide: true,
      targetRole: "ST",
      targetDistGoal: 20,
      targetY: 50,
      passerInFinalThird: true,
    });
    const box = widePassFeedWeight({
      passerWide: true,
      targetRole: "ST",
      targetDistGoal: 10,
      targetY: 50,
      passerInFinalThird: true,
    });
    expect(box).toBeGreaterThan(dZone * 1.6);
  });
});
