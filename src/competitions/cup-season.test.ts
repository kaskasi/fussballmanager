import type { TeamId } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { newGameSession, saveFromSession, sessionFromSave } from "../persistence/game-session.ts";
import { pyramidDivision, divisionOfClub } from "../sim/league-pyramid.ts";
import { seasonEndWeek, slotForWeek } from "../sim/season-schedule.ts";
import { CUPS, cupRoundCount, cupRoundWeek } from "./cup-definition.ts";
import {
  archiveCups,
  createCupSeason,
  cupCompetition,
  cupStrengthLookup,
  playCupWeek,
  regionalFinalists,
  type CupSeason,
  type Pools,
} from "./cup-season.ts";
import { penaltyShootout, simulateCupTie } from "./cup-tie.ts";

function playSeason(cups: CupSeason, pools: Pools, masterSeed: number, strength: (id: TeamId) => number): CupSeason {
  let state = cups;
  for (let week = 1; week <= seasonEndWeek(); week++) {
    state = playCupWeek(state, week, { masterSeed, pools, strengthOf: strength }).state;
  }
  return state;
}

function freshSeason(seed = 2026) {
  const session = newGameSession(new Date("2026-08-01T12:00:00Z"), { seed });
  const pools = session.league.league_pools ?? {};
  const strength = cupStrengthLookup(session.rivalPlayers);
  return { session, pools, strength, played: playSeason(session.cups!, pools, session.masterSeed, strength) };
}

describe("cup calendar (PRD 36 §3)", () => {
  it("gives every round its own week, outside league weeks and before season end", () => {
    const weeks = CUPS.flatMap((cup) =>
      Array.from({ length: cupRoundCount(cup.id) }, (_, index) => cupRoundWeek(cup.id, index + 1)),
    );
    expect(weeks).toHaveLength(12);
    expect(new Set(weeks).size).toBe(12);
    for (const week of weeks) {
      expect(["preseason", "cup"]).toContain(slotForWeek(week).kind);
      expect(week).toBeLessThan(seasonEndWeek());
    }
    expect(weeks.every((week) => week >= 4)).toBe(true);
  });
});

describe("cup season (PRD 36)", () => {
  const { session, pools, strength, played } = freshSeason();

  it("enters 36 regional and 64 national clubs, all distinct", () => {
    const regional = cupCompetition(session.cups, "regional")!;
    const national = cupCompetition(session.cups, "national")!;
    expect(new Set(regional.entrants).size).toBe(36);
    expect(new Set(national.entrants).size).toBe(64);
    const tierOf = (teamId: TeamId) => pyramidDivision(divisionOfClub(pools, teamId)!).tier;
    expect(regional.entrants.every((teamId) => tierOf(teamId) >= 4)).toBe(true);
    expect(national.entrants.filter((teamId) => tierOf(teamId) <= 3)).toHaveLength(54);
    const prelim = regional.rounds[0]!;
    expect(prelim.key).toBe("prelim");
    expect(prelim.ties).toHaveLength(4);
    expect(prelim.ties.flatMap((tie) => [tie.home, tie.away]).every((teamId) => tierOf(teamId) === 5)).toBe(true);
  });

  it("finishes both cups with exactly one winner and the final on neutral ground", () => {
    for (const cup of played.cups) {
      expect(cup.winner).not.toBeNull();
      expect(cup.runnerUp).not.toBeNull();
      expect(cup.winner).not.toBe(cup.runnerUp);
      expect(cup.rounds).toHaveLength(cupRoundCount(cup.id));
      const final = cup.rounds[cup.rounds.length - 1]!;
      expect(final.ties).toHaveLength(1);
      expect(final.ties[0]!.neutral).toBe(true);
      expect(final.ties[0]!.result!.winner).toBe(cup.winner);
    }
    expect(archiveCups(played).map((cup) => cup.ties.length)).toEqual([35, 63]);
  });

  it("never gives a club two cup ties in one week, and the lower tier is at home", () => {
    const tierOf = (teamId: TeamId) => pyramidDivision(divisionOfClub(pools, teamId)!).tier;
    const byWeek = new Map<number, TeamId[]>();
    for (const cup of played.cups) {
      for (const round of cup.rounds) {
        const clubs = byWeek.get(round.week) ?? [];
        for (const tie of round.ties) {
          clubs.push(tie.home, tie.away);
          if (!tie.neutral) expect(tierOf(tie.home)).toBeGreaterThanOrEqual(tierOf(tie.away));
        }
        byWeek.set(round.week, clubs);
      }
    }
    for (const clubs of byWeek.values()) expect(new Set(clubs).size).toBe(clubs.length);
  });

  it("is deterministic for the same seed", () => {
    const again = playSeason(session.cups!, pools, session.masterSeed, strength);
    expect(again).toEqual(played);
    const other = freshSeason(7).played;
    expect(other.cups.map((cup) => cup.winner)).not.toEqual(played.cups.map((cup) => cup.winner));
  });

  it("puts last season's regional finalists into next season's national cup", () => {
    const finalists = regionalFinalists(played);
    expect(finalists).toHaveLength(2);
    const next = createCupSeason({
      season: 2,
      masterSeed: session.masterSeed,
      pools,
      worldClubs: session.world.clubs,
      regionalFinalists: finalists,
    });
    const national = cupCompetition(next, "national")!;
    expect(national.entrants).toHaveLength(64);
    for (const teamId of finalists) expect(national.entrants).toContain(teamId);
  });

  it("creates and catches up the cups of a save that has none", () => {
    const save = saveFromSession(session);
    delete save.state.pipeline!.cups;
    save.state.week = 31;
    const loaded = sessionFromSave(save);
    const rounds = loaded.cups!.cups.flatMap((cup) => cup.rounds);
    expect(rounds.filter((round) => round.week < 31).every((round) => round.ties.every((tie) => tie.result))).toBe(true);
    expect(rounds.some((round) => round.week >= 31 && round.ties.every((tie) => !tie.result))).toBe(true);
    // A save that has its cups keeps them as they are.
    expect(sessionFromSave(saveFromSession(session)).cups).toEqual(session.cups);
  });
});

describe("cup ties (PRD 36 §4)", () => {
  it("never ends a shootout level", () => {
    for (let seed = 0; seed < 500; seed++) {
      const [home, away] = penaltyShootout(seed);
      expect(home).not.toBe(away);
    }
  });

  it("decides a level tie on penalties", () => {
    const even = () => 50;
    const level = Array.from({ length: 200 }, (_, seed) =>
      simulateCupTie("a" as TeamId, "b" as TeamId, seed, even),
    ).find((result) => result.homeGoals === result.awayGoals)!;
    expect(level.penalties).toBeDefined();
    expect(level.winner).toBe(level.penalties![0] > level.penalties![1] ? "a" : "b");
  });
});
