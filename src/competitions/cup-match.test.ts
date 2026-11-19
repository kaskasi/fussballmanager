import { asPlayerId, type PlayerSeasonStat } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { isPlayerMatchEligible } from "../development/injury-roll.ts";
import { applyMatchCards, competitionDiscipline } from "../discipline/suspensions.ts";
import { newGameSession, type GameSession } from "../persistence/game-session.ts";
import { careerPlayerInputs } from "../sim/career-engine-squad.ts";
import { prepareCareerMatch } from "../sim/career-match-setup.ts";
import { resolveSmartSkip, SATURDAY } from "../sim/day-calendar.ts";
import { nextEventWeek } from "../sim/game-calendar.ts";
import { simulateGameWeek } from "../sim/week-pipeline.ts";
import { watchedCupResult, type WatchedPlayerMatch } from "../sim/watched-player-match.ts";
import { cupPrizeForWin } from "./cup-definition.ts";
import { catchUpCupSeason, cupStrengthLookup, managerCupTie, managerCupWeeks } from "./cup-season.ts";
import { cupShootout } from "./cup-shootout.ts";

/** A fresh career moved to the Nordpokal R32 week, with the preliminary round played. */
function atCupWeek(week = 5): GameSession {
  const session = newGameSession(new Date("2026-08-01T12:00:00Z"), { seed: 2026 });
  const cups = catchUpCupSeason(session.cups!, week, {
    masterSeed: session.masterSeed,
    pools: session.league.league_pools ?? {},
    strengthOf: cupStrengthLookup(session.rivalPlayers),
  });
  return { ...session, week, weekday: SATURDAY, cups };
}

describe("the manager's cup tie (PRD 36 slice 2)", () => {
  it("is this week's match setup and the Saturday stop of the Next flow", () => {
    const session = atCupWeek();
    const own = session.league.player_club_id;
    const tie = managerCupTie(session.cups, 5, own);
    expect(tie?.cup).toBe("regional");
    expect(tie?.key).toBe("r32");

    const setup = prepareCareerMatch(session)!;
    expect(setup.cup).toEqual({ id: "regional", round: 2, key: "r32", neutral: false });
    expect([setup.homeTeamId, setup.awayTeamId]).toContain(own);
    expect(resolveSmartSkip(session, false).action).toBe("match");
    expect(managerCupWeeks(session.cups, own).has(5)).toBe(true);
  });

  it("uses the watched result, books cup cards under the cup key and pays the prize", async () => {
    const session = atCupWeek();
    const own = session.league.player_club_id;
    const setup = prepareCareerMatch(session)!;
    const pro = session.players.find((player) => player.club_id === session.clubId && player.squad_status === "pro")!;
    const red: PlayerSeasonStat = {
      playerId: asPlayerId(pro.id),
      teamId: own,
      name: "Red",
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 1,
    };
    const ownIsHome = setup.homeTeamId === own;
    const watched: WatchedPlayerMatch = {
      homeTeamId: setup.homeTeamId,
      awayTeamId: setup.awayTeamId,
      homeGoals: 1,
      awayGoals: 1,
      matchday: setup.matchday,
      playerClubStats: [red],
      fixtureStats: [red],
      cup: setup.cup!,
      shootout: { kicks: [], score: ownIsHome ? [5, 4] : [4, 5] },
    };
    expect(watchedCupResult(watched).winner).toBe(own);

    const result = await simulateGameWeek(session, watched);
    const next = result.session;
    const round = next.cups!.cups.find((cup) => cup.id === "regional")!.rounds[1]!;
    const tie = round.ties.find((entry) => entry.home === setup.homeTeamId && entry.away === setup.awayTeamId)!;
    expect(tie.result).toEqual({ homeGoals: 1, awayGoals: 1, penalties: ownIsHome ? [5, 4] : [4, 5], winner: own });

    const banned = next.players.find((player) => player.id === pro.id)!;
    expect(competitionDiscipline(banned, "regional").ban_matches).toBe(2);
    expect(competitionDiscipline(banned, "league").ban_matches).toBe(0);
    expect(isPlayerMatchEligible(banned, "league")).toBe(true);
    expect(isPlayerMatchEligible(banned, "regional")).toBe(false);

    const prize = (next.finances.pending_lines ?? []).filter((line) => line.kind === "cup_prize");
    expect(prize.map((line) => line.amount)).toEqual([cupPrizeForWin("regional", "r32")]);
    expect(next.clubEvents.some((event) => event.message.includes("Nordpokal"))).toBe(true);
  });

  it("keeps a league-banned player available for the cup and the other way round", () => {
    const session = atCupWeek();
    const pro = session.players.find((player) => player.club_id === session.clubId && player.squad_status === "pro")!;
    const leagueBanned = applyMatchCards(pro, { yellowCards: 0, redCards: 1 }, "league").player;
    const players = session.players.map((player) => (player.id === pro.id ? leagueBanned : player));
    const ids = (competition: string) => careerPlayerInputs(players, session.clubId, competition).map((input) => input.id);
    expect(ids("league")).not.toContain(pro.id);
    expect(ids("regional")).toContain(pro.id);
  });

  it("stops 'until the next event' at a cup week the quiet-week rule would skip", () => {
    // Week 30 (cup slot 3, Nordpokal R16) is a quiet week without the manager's tie.
    const skipped = nextEventWeek(1, 29);
    expect(skipped.week).not.toBe(30);
    expect(nextEventWeek(1, 29, (_season, week) => week === 30).week).toBe(30);
  });
});

describe("giant-killing (PRD 36 slice 3)", () => {
  it("reports a cup win over a higher tier and relieves board pressure", async () => {
    const base = atCupWeek();
    const own = base.league.player_club_id;
    const topClub = base.league.league_pools!.meisterliga![0]!;
    // Put a top-flight club into the manager's R32 tie.
    const cups = {
      ...base.cups!,
      cups: base.cups!.cups.map((cup) =>
        cup.id !== "regional"
          ? cup
          : {
              ...cup,
              rounds: cup.rounds.map((round) =>
                round.round !== 2
                  ? round
                  : {
                      ...round,
                      ties: round.ties.map((tie) =>
                        tie.home === own ? { ...tie, away: topClub } : tie.away === own ? { ...tie, home: own, away: topClub } : tie,
                      ),
                    },
              ),
            },
      ),
    };
    const session = { ...base, cups, board: { ...base.board, pressure: 50 } };
    // Same week, same result against the drawn same-tier opponent: no upset.
    const plainSetup = prepareCareerMatch({ ...base, board: { ...base.board, pressure: 50 } })!;
    const plainOwnHome = plainSetup.homeTeamId === own;
    const plain = (
      await simulateGameWeek(
        { ...base, board: { ...base.board, pressure: 50 } },
        {
          homeTeamId: plainSetup.homeTeamId,
          awayTeamId: plainSetup.awayTeamId,
          homeGoals: plainOwnHome ? 2 : 1,
          awayGoals: plainOwnHome ? 1 : 2,
          matchday: plainSetup.matchday,
          cup: plainSetup.cup!,
        },
      )
    ).session;
    const setup = prepareCareerMatch(session)!;
    expect(setup.awayTeamId).toBe(topClub);
    const watched: WatchedPlayerMatch = {
      homeTeamId: own,
      awayTeamId: topClub,
      homeGoals: 2,
      awayGoals: 1,
      matchday: setup.matchday,
      cup: setup.cup!,
    };
    const next = (await simulateGameWeek(session, watched)).session;
    expect(next.clubEvents.some((event) => /Cup upset|Pokalsensation/.test(event.message))).toBe(true);
    expect(plain.clubEvents.some((event) => /Cup upset|Pokalsensation/.test(event.message))).toBe(false);
    expect(next.board.pressure).toBe(Math.max(0, plain.board.pressure - 5));
  });
});

describe("penalty shootout (PRD 36 slice 2)", () => {
  const takers = (side: string) =>
    Array.from({ length: 11 }, (_, index) => ({ id: `${side}${index}`, name: `${side} ${index}` }));

  it("is never level, deterministic, and stops once decided", () => {
    for (let seed = 0; seed < 300; seed++) {
      const shootout = cupShootout(seed, takers("h"), takers("a"));
      expect(shootout.score[0]).not.toBe(shootout.score[1]);
      expect(cupShootout(seed, takers("h"), takers("a"))).toEqual(shootout);
      const scored = (side: "home" | "away") =>
        shootout.kicks.filter((kick) => kick.side === side && kick.scored).length;
      expect([scored("home"), scored("away")]).toEqual(shootout.score);
      // Within the first five each, nobody kicks after the result is settled.
      const regular = shootout.kicks.slice(0, 10);
      const homeKicks = regular.filter((kick) => kick.side === "home").length;
      const awayKicks = regular.filter((kick) => kick.side === "away").length;
      expect(homeKicks - awayKicks).toBeGreaterThanOrEqual(0);
      expect(homeKicks - awayKicks).toBeLessThanOrEqual(1);
    }
  });
});
