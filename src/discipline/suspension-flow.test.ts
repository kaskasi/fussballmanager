import { NORDSTERN_ID, asPlayerId, asTeamId, nordsternSquad } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { isPlayerMatchEligible } from "../development/injury-roll.ts";
import { autoLineupAssignments } from "../match/auto-lineup.ts";
import { resetSeasonMinutes } from "../player/minute-history.ts";
import { applyCareerMatchWeek } from "../sim/career-match-sync.ts";
import { careerPlayerInputs } from "../sim/career-engine-squad.ts";
import { applyRivalMatchdayStats } from "../sim/rival-matchday-stats.ts";
import { squadWithRivalRoster } from "../sim/rival-engine-squad.ts";
import { careerTeamId } from "../sim/rival-growth.ts";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import type { Player } from "../types/player.ts";
import { applyMatchCards, competitionDiscipline, isSuspended } from "./suspensions.ts";

const CLUB = "cl_fc_nordstern";
const FIXTURE = {
  homeTeamId: NORDSTERN_ID,
  awayTeamId: asTeamId("tsv-holzweg"),
  homeGoals: 1,
  awayGoals: 0,
};

function pro(id: string, position: Player["position"] = "CM"): Player {
  const player = clonePlayer();
  player.id = id;
  player.position = position;
  player.squad_status = "pro";
  player.club_id = CLUB;
  return player;
}

function squadOf(count: number): Player[] {
  return [pro("pl_gk", "GK"), ...Array.from({ length: count - 1 }, (_, index) => pro(`pl_${index}`))];
}

function statRow(playerId: string, yellowCards: number, redCards = 0) {
  return {
    playerId: asPlayerId(playerId),
    teamId: NORDSTERN_ID,
    name: playerId,
    goals: 0,
    assists: 0,
    yellowCards,
    redCards,
  };
}

describe("suspension flow (PRD 34)", () => {
  it("bans an own player after a straight red and reports it", () => {
    const squad = squadOf(14);
    const result = applyCareerMatchWeek(squad, FIXTURE, NORDSTERN_ID, 3, 2026, 1, [
      statRow("pl_0", 0, 1),
      statRow("pl_1", 1),
    ]);
    const sentOff = result.players.find((player) => player.id === "pl_0")!;
    expect(competitionDiscipline(sentOff)).toEqual({ yellows: 0, ban_matches: 2, reason: "red" });
    expect(sentOff.state.season_red_cards).toBe(1);
    expect(isPlayerMatchEligible(sentOff)).toBe(false);
    expect(result.disciplineNotices).toEqual([
      { playerId: "pl_0", name: expect.any(String), banMatches: 2, reason: "red" },
    ]);
  });

  it("serves the ban over the club's next matches without minutes", () => {
    const banned = applyMatchCards(pro("pl_0"), { yellowCards: 0, redCards: 1 }).player;
    let players = [banned, ...squadOf(14).filter((player) => player.id !== "pl_0")];

    players = applyCareerMatchWeek(players, FIXTURE, NORDSTERN_ID, 4, 2026, 1).players;
    let player = players.find((entry) => entry.id === "pl_0")!;
    expect(player.state.season_minutes).toBe(0);
    expect(competitionDiscipline(player).ban_matches).toBe(1);

    // A week without a fixture of the club serves nothing.
    players = applyCareerMatchWeek(players, null, NORDSTERN_ID, 5, 2026, 1).players;
    expect(isSuspended(players.find((entry) => entry.id === "pl_0")!)).toBe(true);

    players = applyCareerMatchWeek(players, FIXTURE, NORDSTERN_ID, 5, 2026, 1).players;
    player = players.find((entry) => entry.id === "pl_0")!;
    expect(isSuspended(player)).toBe(false);
  });

  it("warns at four yellows", () => {
    const squad = squadOf(14);
    squad[1] = { ...squad[1]!, state: { ...squad[1]!.state, discipline: { league: { yellows: 3, ban_matches: 0 } } } };
    const result = applyCareerMatchWeek(squad, FIXTURE, NORDSTERN_ID, 3, 2026, 1, [statRow("pl_0", 1)]);
    expect(result.disciplineNotices).toEqual([
      { playerId: "pl_0", name: expect.any(String), banMatches: 0 },
    ]);
  });

  it("keeps banned players out of the engine squad and the auto-lineup", () => {
    const squad = squadOf(16);
    squad[3] = applyMatchCards(squad[3]!, { yellowCards: 2, redCards: 1 }).player;
    const bannedId = squad[3]!.id;

    expect(careerPlayerInputs(squad, CLUB).some((input) => input.id === bannedId)).toBe(false);
    const assignments = autoLineupAssignments(squad, nordsternSquad.tactics.formation, "best_eleven", CLUB);
    expect(Object.values(assignments)).not.toContain(bannedId);
  });

  it("bans AI players, benches them and serves the ban on the next matchday", () => {
    const clubId = careerTeamId(nordsternSquad.team.id);
    const rivals = Array.from({ length: 14 }, (_, index) => {
      const player = pro(`rp_${index}`, index === 0 ? "GK" : "CM");
      player.club_id = clubId;
      return player;
    });
    const booked = applyRivalMatchdayStats(
      rivals,
      [{ ...statRow("rp_5", 2, 1), teamId: asTeamId("eck") }],
      NORDSTERN_ID,
    );
    const banned = booked.find((player) => player.id === "rp_5")!;
    expect(competitionDiscipline(banned)).toEqual({ yellows: 0, ban_matches: 1, reason: "second_yellow" });

    const squad = squadWithRivalRoster(nordsternSquad, booked)!;
    const fielded = [...squad.starters.map((place) => place.player.id), ...squad.bench.map((player) => player.id)];
    expect(fielded).not.toContain("rp_5");

    const next = applyRivalMatchdayStats(booked, [], NORDSTERN_ID);
    expect(isSuspended(next.find((player) => player.id === "rp_5")!)).toBe(false);
  });

  it("carries an open ban into the next season with a clean tally", () => {
    const banned = applyMatchCards(
      { ...pro("pl_0"), state: { ...pro("pl_0").state, discipline: { league: { yellows: 4, ban_matches: 0 } } } },
      { yellowCards: 1 },
    ).player;
    const reset = resetSeasonMinutes(banned);
    expect(competitionDiscipline(reset)).toEqual({ yellows: 0, ban_matches: 1, reason: "yellows" });
  });
});
