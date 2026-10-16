import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import type { PositionPrimary } from "../types/player.ts";
import {
  MAX_U19_SQUAD_SIZE,
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
  it("allows pro promotion even when the senior squad is large", () => {
    const players = Array.from({ length: 40 }, (_, index) =>
      proPlayer(`pro_${index}`, index % 2 === 0 ? "CB" : "DM"),
    );
    const candidate = u19Player("youth_1", "RB");
    expect(canPromotePlayer(players, CLUB, candidate).allowed).toBe(true);
  });

  it("allows pro promotion when many players share the same position", () => {
    const players = [proPlayer("rb1", "RB"), proPlayer("rb2", "RB"), u19Player("youth_rb", "RB")];
    expect(promotionGate(players, CLUB, "RB", "pro").allowed).toBe(true);
  });

  it("blocks u17 promotion when U19 is full", () => {
    const u19 = Array.from({ length: MAX_U19_SQUAD_SIZE }, (_, index) => {
      const player = clonePlayer();
      player.id = `u19_${index}`;
      player.club_id = CLUB;
      player.squad_status = "u19";
      return player;
    });
    const u17 = clonePlayer();
    u17.club_id = CLUB;
    u17.squad_status = "u17";
    expect(canPromotePlayer(u19, CLUB, u17).allowed).toBe(false);
    expect(canPromotePlayer(u19, CLUB, u17).reason).toBe("u19_full");
  });

  it("allows pro promotion when there is squad and position room", () => {
    const players = [proPlayer("rb1", "RB"), u19Player("youth_rb", "RB")];
    expect(canPromotePlayer(players, CLUB, players[1]!).allowed).toBe(true);
    expect(proSquadSize(players, CLUB)).toBe(1);
  });
});
