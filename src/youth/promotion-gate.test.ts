import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import type { PositionPrimary } from "../types/player.ts";
import {
  MAX_PRO_SQUAD_SIZE,
  canPromotePlayer,
  promotionGate,
  proSquadSize,
} from "./promotion-gate.ts";

const CLUB = "cl_fc_nordstern";

function proPlayer(id: string, position: PositionPrimary = "RB") {
  const player = clonePlayer();
  player.id = id;
  player.club_id = CLUB;
  player.squad_status = "pro";
  player.position = position;
  return player;
}

function u19Player(id: string, position: PositionPrimary = "RB") {
  const player = clonePlayer();
  player.id = id;
  player.club_id = CLUB;
  player.squad_status = "u19";
  player.position = position;
  return player;
}

describe("promotion gate", () => {
  it("blocks pro promotion when the squad is full", () => {
    const players = Array.from({ length: MAX_PRO_SQUAD_SIZE }, (_, index) =>
      proPlayer(`pro_${index}`, index % 2 === 0 ? "CB" : "DM"),
    );
    const candidate = u19Player("youth_1", "RB");
    expect(canPromotePlayer(players, CLUB, candidate).allowed).toBe(false);
    expect(canPromotePlayer(players, CLUB, candidate).reason).toBe("squad_full");
  });

  it("blocks pro promotion when the position is saturated", () => {
    const players = [
      proPlayer("rb1", "RB"),
      proPlayer("rb2", "RB"),
      u19Player("youth_rb", "RB"),
    ];
    expect(promotionGate(players, CLUB, "RB", "pro").allowed).toBe(false);
    expect(promotionGate(players, CLUB, "RB", "pro").reason).toBe("position_full");
  });

  it("allows pro promotion when there is squad and position room", () => {
    const players = [proPlayer("rb1", "RB"), u19Player("youth_rb", "RB")];
    expect(canPromotePlayer(players, CLUB, players[1]!).allowed).toBe(true);
    expect(proSquadSize(players, CLUB)).toBe(1);
  });
});
