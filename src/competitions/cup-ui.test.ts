import type { TeamId } from "@fussballmanager/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { generateSeasonObjectives, objectiveProgress } from "../board/season-objectives.ts";
import { advanceWeeklyClubFinances, CUP_GATE_SHARE, defaultClubFinances, matchdayTicketIncome } from "../economy/club-finances.ts";
import { objectiveDisplayLabel } from "../i18n/board-display.ts";
import { setLocale } from "../i18n/index.ts";
import { newGameSession } from "../persistence/game-session.ts";
import { pressConferenceKey } from "../press/press-session.ts";
import { SATURDAY } from "../sim/day-calendar.ts";
import { civilDateFromSession } from "../sim/session-civil-date.ts";
import { buildMonthGrid } from "../ui/calendar/month-grid.ts";
import { catchUpCupSeason, cupCompetition, cupStrengthLookup, playCupWeek, type CupSeason } from "./cup-season.ts";
import { cupRoundReached, cupRunSummary, nextCupFixture } from "./cup-run.ts";

const session = newGameSession(new Date("2026-08-01T12:00:00Z"), { seed: 2026 });
const own = session.league.player_club_id;
const pools = session.league.league_pools ?? {};
const ctx = { masterSeed: session.masterSeed, pools, strengthOf: cupStrengthLookup(session.rivalPlayers) };

/** Cups played up to (not including) `week`. */
function cupsAt(week: number): CupSeason {
  return catchUpCupSeason(session.cups!, week, ctx);
}

/** The manager's cups with every remaining tie of the club forced to `winner`. */
function forceOwn(state: CupSeason, win: boolean): CupSeason {
  let current = state;
  for (let week = 1; week <= 52; week++) {
    const overrides = new Map<string, { homeGoals: number; awayGoals: number; winner: TeamId }>();
    for (const cup of current.cups) {
      for (const round of cup.rounds.filter((entry) => entry.week === week)) {
        for (const tie of round.ties) {
          if (tie.result || (tie.home !== own && tie.away !== own)) continue;
          const ownHome = tie.home === own;
          const ownWins = win;
          overrides.set(`${tie.home}|${tie.away}`, {
            homeGoals: ownHome === ownWins ? 2 : 0,
            awayGoals: ownHome === ownWins ? 0 : 2,
            winner: ownWins ? own : ownHome ? tie.away : tie.home,
          });
        }
      }
    }
    current = playCupWeek(current, week, { ...ctx, overrides }).state;
  }
  return current;
}

beforeEach(() => setLocale("en"));

describe("cup run (PRD 36 slice 3)", () => {
  it("is waiting before its first tie is drawn, then drawn, then out or winner", () => {
    const regional = cupCompetition(session.cups, "regional")!;
    const before = cupRunSummary(regional, own);
    expect(before.status).toBe("waiting");

    const drawn = cupRunSummary(cupCompetition(cupsAt(5), "regional")!, own);
    expect(drawn.status).toBe("drawn");
    expect(drawn.status === "drawn" && drawn.key).toBe("r32");
    expect(nextCupFixture(cupsAt(5), own)?.week).toBe(5);

    const lost = cupCompetition(forceOwn(session.cups!, false), "regional")!;
    const out = cupRunSummary(lost, own);
    expect(out.status).toBe("out");
    expect(out.status === "out" && out.score).toBe("0:2");
    expect(cupRoundReached(forceOwn(session.cups!, false), "regional", own)).toBe(2);

    const won = forceOwn(session.cups!, true);
    expect(cupRunSummary(cupCompetition(won, "regional")!, own).status).toBe("winner");
    expect(cupRoundReached(won, "regional", own)).toBe(7);
  });

  it("counts a preliminary-round bye as reaching the bracket", () => {
    // The manager's Regionalliga club skips the preliminary round.
    expect(cupRoundReached(session.cups, "regional", own)).toBe(0);
    expect(cupRoundReached(cupsAt(5), "regional", own)).toBe(2);
  });
});

describe("cup board objective (PRD 36 slice 3)", () => {
  it("asks a tier-4 club for a Nordpokal round and is met once reached", () => {
    const objectives = generateSeasonObjectives(own, 1, session.league, { avg_ca: 80 }, session.masterSeed);
    const cup = objectives.find((objective) => objective.kind === "cup_round_min")!;
    expect(cup.cupId).toBe("regional");
    expect([3, 4]).toContain(cup.target);
    expect(objectiveDisplayLabel(cup, 1)).toMatch(/^Nordpokal: reach the (Round of 16|Quarter-final)$/);

    const base = { players: session.players, clubId: session.clubId, stadium: session.stadium, youthCamps: [], weeklyWageBill: 0 };
    const progress = (cups: CupSeason) => objectiveProgress(cup, session.league, session.finances, { ...base, cups });
    expect(progress(session.cups!).met).toBe(false);
    expect(progress(forceOwn(session.cups!, true)).met).toBe(true);
  });
});

describe("cup calendar and money (PRD 36 slice 3)", () => {
  it("shows the manager's cup tie on its Saturday", () => {
    const cups = cupsAt(5);
    const sat = civilDateFromSession(1, 5, SATURDAY);
    const cell = buildMonthGrid(1, sat.monthIndex, session.league, undefined, [], cups).find(
      (entry) => entry.day === sat.day,
    );
    expect(cell?.match?.cup).toEqual({ id: "regional", key: "r32" });
    expect(cell?.match?.label).toMatch(/^Nordpokal vs /);
  });

  it("splits a cup gate 50/50", () => {
    const base = {
      players: session.players,
      clubId: session.clubId,
      divisionId: session.league.division_id,
      season: 1,
      week: 5,
    };
    const ticketLine = (extra: object) =>
      advanceWeeklyClubFinances(defaultClubFinances(), { ...base, isHomeMatchWeek: true, ...extra }).lines.find(
        (line) => line.kind === "matchday_tickets",
      )?.amount ?? 0;
    const full = ticketLine({});
    expect(ticketLine({ cupGate: { home: true } })).toBe(Math.round(full * CUP_GATE_SHARE));
    const away = advanceWeeklyClubFinances(defaultClubFinances(), {
      ...base,
      isHomeMatchWeek: false,
      cupGate: { home: false, hostDivisionId: "meisterliga" },
    }).lines.find((line) => line.kind === "matchday_tickets")?.amount;
    expect(away).toBe(Math.round(matchdayTicketIncome("meisterliga", true) * CUP_GATE_SHARE));
  });

  it("keys a cup press conference apart from the league matchday", () => {
    const league = pressConferenceKey(1, { matchday: 3 });
    const cup = pressConferenceKey(1, { matchday: 3, cup: { id: "regional", round: 2 } });
    expect(cup).not.toBe(league);
  });
});
