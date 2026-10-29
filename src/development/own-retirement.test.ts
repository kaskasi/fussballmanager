import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { runSeasonEnd } from "../sim/season-end.ts";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import type { Player } from "../types/player.ts";
import { applyInboxDecision, emptyInbox } from "../youth/decision-inbox.ts";
import { enqueueRetirementItems, retirementInboxItemId } from "../inbox/retirement-inbox.ts";
import {
  announceOwnRetirements,
  answerRetirement,
  clearMentorshipsTo,
  persuadeChance,
  retiresAtSeasonEnd,
} from "./own-retirement.ts";

const CLUB = "cl_fc_nordstern";

function veteran(id: string, age: number, patch: Partial<Player["state"]> = {}): Player {
  const base = clonePlayer();
  return {
    ...base,
    id,
    age,
    club_id: CLUB,
    squad_status: "pro",
    contract: base.contract ? { ...base.contract, until_season: 1 } : null,
    state: { ...base.state, season_apps: 10, morale: 60, ...patch },
  };
}

describe("own-player retirement (PRD 31 §9)", () => {
  it("announces once per season and only for own pros", () => {
    const players = Array.from({ length: 40 }, (_, index) => veteran(`pl_v${index}`, 36));
    const first = announceOwnRetirements(players, CLUB, 1, 7);
    expect(first.announcedIds.length).toBeGreaterThan(20);
    const again = announceOwnRetirements(first.players, CLUB, 1, 7);
    expect(again.announcedIds).toEqual([]);
    const elsewhere = announceOwnRetirements(players.map((p) => ({ ...p, club_id: "cl_other" })), CLUB, 1, 7);
    expect(elsewhere.announcedIds).toEqual([]);
  });

  it("persuading depends on morale and minutes, never at the hard stop", () => {
    const happy = veteran("pl_a", 34, { morale: 85, season_apps: 20 });
    const sulking = veteran("pl_b", 34, { morale: 30, season_apps: 2 });
    expect(persuadeChance(happy, 28)).toBeGreaterThan(persuadeChance(sulking, 28));
    expect(persuadeChance(veteran("pl_c", 39), 28)).toBe(0);
  });

  it("accept retires; a successful persuade extends the contract one year", () => {
    const player = { ...veteran("pl_d", 34, { morale: 100, season_apps: 28 }), state: { ...veteran("pl_d", 34).state, morale: 100, season_apps: 28, retirement: { season: 1, status: "announced" as const } } };
    expect(answerRetirement(player, "accept", 1, 7, 28).outcome).toBe("retiring");
    const outcomes = Array.from({ length: 30 }, (_, index) =>
      answerRetirement({ ...player, id: `pl_p${index}` }, "persuade", 1, 7, 28),
    );
    const stayed = outcomes.find((entry) => entry.outcome === "staying");
    expect(stayed?.player.contract?.until_season).toBe(2);
    expect(retiresAtSeasonEnd(stayed!.player, 1)).toBe(false);
    expect(outcomes.some((entry) => entry.outcome === "retiring")).toBe(true);
  });

  it("clears mentor links to players who left", () => {
    const talent = veteran("pl_t", 19, { mentorship: { mentor_player_id: "pl_m", since_season: 1, since_week: 3 } });
    expect(clearMentorshipsTo([talent], new Set(["pl_m"]))[0]!.state.mentorship).toBeUndefined();
  });

  it("resolves the Postfach item with an outcome", () => {
    const player = { ...veteran("pl_e", 35), state: { ...veteran("pl_e", 35).state, retirement: { season: 1, status: "announced" as const } } };
    const inbox = enqueueRetirementItems(emptyInbox(28), [player.id], 1, 28, [player]);
    const result = applyInboxDecision(inbox, [player], retirementInboxItemId(player.id, 1), "retire_accept", 1, 28);
    expect(result.retirementOutcome).toBe("retiring");
    expect(result.players[0]!.state.retirement?.status).toBe("retiring");
  });

  it("retires announced own players at season end and writes their record", () => {
    const session = newGameSession();
    const pro = session.players.find((player) => player.squad_status === "pro")!;
    const talent = session.players.find((player) => player.id !== pro.id && player.squad_status === "pro")!;
    const players = session.players.map((player) => {
      if (player.id === pro.id) return { ...player, state: { ...player.state, retirement: { season: 1, status: "retiring" as const } } };
      if (player.id === talent.id) {
        return { ...player, state: { ...player.state, mentorship: { mentor_player_id: pro.id, since_season: 1, since_week: 1 } } };
      }
      return player;
    });
    const result = runSeasonEnd({ ...session, players }, 1);
    expect(result.session.players.some((player) => player.id === pro.id)).toBe(false);
    expect(result.ownRetired.map((entry) => entry.id)).toEqual([pro.id]);
    expect(result.session.retiredPlayers.some((entry) => entry.id === pro.id)).toBe(true);
    const mentee = result.session.players.find((player) => player.id === talent.id)!;
    expect(mentee.state.mentorship).toBeUndefined();
  });
});
