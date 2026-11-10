import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import type { Player } from "../types/player.ts";
import {
  applyMatchCards,
  competitionDiscipline,
  isOneYellowFromBan,
  isSuspended,
  resetSeasonDiscipline,
  sentOffReason,
  serveBanMatch,
} from "./suspensions.ts";

function withYellows(count: number, competition = "league"): Player {
  let player = clonePlayer();
  for (let index = 0; index < count; index++) {
    player = applyMatchCards(player, { yellowCards: 1 }, competition).player;
  }
  return player;
}

describe("suspensions (PRD 34)", () => {
  it("tells a second yellow from a straight red", () => {
    expect(sentOffReason({ yellowCards: 1 })).toBeNull();
    expect(sentOffReason({ yellowCards: 2, redCards: 1 })).toBe("second_yellow");
    expect(sentOffReason({ yellowCards: 0, redCards: 1 })).toBe("red");
    expect(sentOffReason({ yellowCards: 1, redCards: 1 })).toBe("red");
  });

  it("warns at four yellows and bans for one match at the fifth", () => {
    const three = withYellows(3);
    const fourth = applyMatchCards(three, { yellowCards: 1 });
    expect(fourth.yellowWarning).toBe(true);
    expect(fourth.banAdded).toBe(0);
    expect(isOneYellowFromBan(fourth.player)).toBe(true);
    expect(isSuspended(fourth.player)).toBe(false);

    const fifth = applyMatchCards(fourth.player, { yellowCards: 1 });
    expect(fifth.banAdded).toBe(1);
    expect(fifth.reason).toBe("yellows");
    expect(isSuspended(fifth.player)).toBe(true);
  });

  it("bans again at the tenth yellow, not the sixth", () => {
    const six = serveBanMatch(withYellows(6));
    expect(isSuspended(six)).toBe(false);
    const ten = withYellows(10);
    expect(competitionDiscipline(ten).ban_matches).toBe(2);
  });

  it("gives one match for a yellow-red and leaves the tally alone", () => {
    const outcome = applyMatchCards(withYellows(4), { yellowCards: 2, redCards: 1 });
    expect(outcome.banAdded).toBe(1);
    expect(outcome.reason).toBe("second_yellow");
    expect(competitionDiscipline(outcome.player).yellows).toBe(4);
    expect(outcome.player.state.season_red_cards).toBe(1);
  });

  it("gives two matches for a straight red and adds a fifth-yellow ban on top", () => {
    const red = applyMatchCards(clonePlayer(), { yellowCards: 0, redCards: 1 });
    expect(red.banAdded).toBe(2);
    expect(red.reason).toBe("red");

    const both = applyMatchCards(withYellows(4), { yellowCards: 1, redCards: 1 });
    expect(both.banAdded).toBe(3);
    expect(both.reason).toBe("red");
  });

  it("serves a ban match by match", () => {
    let player = applyMatchCards(clonePlayer(), { yellowCards: 0, redCards: 1 }).player;
    player = serveBanMatch(player);
    expect(isSuspended(player)).toBe(true);
    player = serveBanMatch(player);
    expect(isSuspended(player)).toBe(false);
    expect(competitionDiscipline(player).reason).toBeUndefined();
    expect(serveBanMatch(player)).toBe(player);
  });

  it("keeps tallies and bans per competition", () => {
    const player = applyMatchCards(withYellows(4), { yellowCards: 1 }, "cup").player;
    expect(isSuspended(player, "league")).toBe(false);
    expect(competitionDiscipline(player, "cup").yellows).toBe(1);

    const banned = applyMatchCards(player, { yellowCards: 1 }, "league").player;
    expect(isSuspended(banned, "league")).toBe(true);
    expect(isSuspended(banned, "cup")).toBe(false);
    expect(isSuspended(serveBanMatch(banned, "cup"), "league")).toBe(true);
  });

  it("resets tallies at season end and carries open bans over", () => {
    const banned = applyMatchCards(withYellows(4), { yellowCards: 1 }).player;
    const carried = resetSeasonDiscipline(banned.state);
    expect(carried.discipline?.league).toEqual({ yellows: 0, ban_matches: 1, reason: "yellows" });

    const clean = resetSeasonDiscipline(withYellows(3).state);
    expect(clean.discipline).toBeUndefined();
    expect(clean.season_red_cards).toBeUndefined();
  });

  it("returns the same player when there are no cards", () => {
    const player = clonePlayer();
    expect(applyMatchCards(player, { yellowCards: 0 }).player).toBe(player);
  });
});
