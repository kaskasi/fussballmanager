import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import type { Player } from "../types/player.ts";
import { pickStoryCompanions, STORY_COMPANION_MAX } from "./story-companions.ts";

const session = newGameSession(new Date("2026-08-01T12:00:00Z"));
const club = session.clubId;
const own = session.players.filter((player) => player.club_id === club);

function withState(player: Player, patch: Partial<Player["state"]>): Player {
  return { ...player, state: { ...player.state, ...patch } };
}

describe("pickStoryCompanions (PRD 19 Act 1 → 2)", () => {
  it("returns at most two players from the old club, a youth first", () => {
    const picks = pickStoryCompanions(session.players, club, null, 1);
    expect(picks.length).toBeLessThanOrEqual(STORY_COMPANION_MAX);
    expect(picks.length).toBeGreaterThan(0);
    expect(picks.every((player) => player.club_id === club)).toBe(true);
    expect(["u17", "u19"]).toContain(picks[0]!.squad_status);
  });

  it("is deterministic", () => {
    const first = pickStoryCompanions(session.players, club, null, 1).map((p) => p.id);
    const second = pickStoryCompanions([...session.players].reverse(), club, null, 1).map((p) => p.id);
    expect(second).toEqual(first);
  });

  it("prefers the captain and praised, growing players", () => {
    const pro = own.find((player) => player.squad_status === "pro")!;
    const youth = own.find((player) => player.squad_status === "u19")!;
    const boosted = session.players.map((player) => {
      if (player.id === youth.id) {
        return withState(player, { ca_history: [50, 70], last_praise_season: 1 });
      }
      return player;
    });
    const picks = pickStoryCompanions(boosted, club, pro.id, 1).map((p) => p.id);
    expect(picks[0]).toBe(youth.id);
    expect(picks).toContain(pro.id);
  });

  it("never picks loanees", () => {
    const loanee = own.find((player) => player.squad_status === "pro")!;
    const players = session.players.map((player) =>
      player.id === loanee.id ? { ...player, squad_status: "loaned_out" as const } : player,
    );
    const picks = pickStoryCompanions(players, club, loanee.id, 1);
    expect(picks.some((player) => player.id === loanee.id)).toBe(false);
  });
});
