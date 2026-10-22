import { asTeamId, matchdayFixtures } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import type { TreterEdition } from "../../media/kicker-digest.ts";
import type { LeagueState } from "../../persistence/league-state.ts";
import { SATURDAY } from "../../sim/day-calendar.ts";
import { civilDateFromSession } from "../../sim/session-civil-date.ts";
import type { TransferRecord } from "../../transfers/transfer-history.ts";
import type { CalendarMilestone } from "./calendar-milestones.ts";
import { buildMonthJournal } from "./month-journal.ts";

const SEASON = 2;

function minimalLeague(): LeagueState {
  const club_ids = Array.from({ length: 18 }, (_, index) => asTeamId(`cl_${index}`));
  return {
    division_id: "regionalliga-nord",
    player_club_id: club_ids[0]!,
    club_ids,
    meetings_per_opponent: 2,
    matchday: 1,
    results: [],
    player_stats: [],
  };
}

function play(league: LeagueState, matchday: number, goalsFor: number, goalsAgainst: number): LeagueState {
  const fixture = matchdayFixtures(league.club_ids, matchday).find(
    (entry) => entry.homeTeamId === league.player_club_id || entry.awayTeamId === league.player_club_id,
  )!;
  const home = fixture.homeTeamId === league.player_club_id;
  return {
    ...league,
    results: [
      ...league.results,
      {
        homeTeamId: fixture.homeTeamId,
        awayTeamId: fixture.awayTeamId,
        homeGoals: home ? goalsFor : goalsAgainst,
        awayGoals: home ? goalsAgainst : goalsFor,
      },
    ],
  };
}

function transfer(week: number, kind: TransferRecord["kind"], season = SEASON): TransferRecord {
  return {
    id: `tr-${week}-${kind}`,
    season,
    week,
    kind,
    player_id: "p1",
    player_name: "Finn Bergmann",
    other_club_id: "cl_9",
    other_club_name: "Südhafen",
  };
}

function edition(week: number): TreterEdition {
  return {
    season: SEASON,
    week,
    masthead: "Der Treter",
    articles: [
      { id: "a", kind: "column", headline: "Small", body: "", layout: "column", priority: 10 },
      { id: "b", kind: "hero", headline: "Big", body: "", layout: "hero", priority: 90 },
    ],
    league: {},
  } as unknown as TreterEdition;
}

/** Matchdays 5–8 fall in one civil month; pick that month. */
const month = civilDateFromSession(SEASON, 6, SATURDAY);
const monthWeeks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((week) => {
  const sat = civilDateFromSession(SEASON, week, SATURDAY);
  return sat.year === month.year && sat.monthIndex === month.monthIndex;
});
const [firstWeek, secondWeek, thirdWeek] = monthWeeks as [number, number, number];

function journal(overrides: Partial<Parameters<typeof buildMonthJournal>[0]> = {}) {
  return buildMonthJournal({
    season: SEASON,
    year: month.year,
    monthIndex: month.monthIndex,
    today: { week: secondWeek + 1, weekday: 2 },
    league: minimalLeague(),
    ...overrides,
  });
}

describe("buildMonthJournal", () => {
  it("sums played matches and leaves the rest as upcoming", () => {
    let league = minimalLeague();
    for (let matchday = 1; matchday < firstWeek; matchday += 1) league = play(league, matchday, 0, 0);
    league = play(league, firstWeek, 3, 1);
    league = play(league, secondWeek, 0, 2);
    const result = journal({ league });
    expect(result.summary).toMatchObject({ played: 2, won: 1, lost: 1, drawn: 0, goalsFor: 3, goalsAgainst: 3 });
    expect(result.summary.remaining).toBe(monthWeeks.length - 2);
    expect(result.upcoming[0]).toMatchObject({ kind: "match", week: thirdWeek });
  });

  it("orders the past newest week first", () => {
    const result = journal({
      transfers: [transfer(firstWeek, "in"), transfer(secondWeek, "out")],
    });
    expect(result.past.map((week) => week.week)).toEqual([secondWeek, firstWeek]);
  });

  it("keeps only the club's own transfers of this season", () => {
    const result = journal({
      transfers: [transfer(firstWeek, "in"), transfer(firstWeek, "ai"), transfer(firstWeek, "out", SEASON - 1)],
    });
    expect(result.summary.transfers).toBe(1);
    expect(result.past.flatMap((week) => week.entries)).toHaveLength(1);
  });

  it("shows the lead story of each lived week's paper, not future weeks", () => {
    const result = journal({ editions: [edition(firstWeek), edition(thirdWeek + 1)] });
    const news = result.past.flatMap((week) => week.entries).filter((entry) => entry.kind === "news");
    expect(news).toHaveLength(1);
    expect(news[0]).toMatchObject({ week: firstWeek, article: { headline: "Big" } });
  });

  it("splits milestones around today and puts day entries before week records", () => {
    const milestone = (week: number): CalendarMilestone => ({
      id: `m-${week}`,
      kind: "injury_return",
      season: SEASON,
      week,
      weekday: SATURDAY,
      label: "Fit again",
      shortLabel: "Fit",
      priority: 1,
      isPast: false,
    });
    const result = journal({
      milestones: [milestone(firstWeek), milestone(thirdWeek)],
      transfers: [transfer(firstWeek, "in")],
    });
    expect(result.upcoming.map((entry) => entry.id)).toContain(`m-${thirdWeek}`);
    const first = result.past.find((week) => week.week === firstWeek)!;
    expect(first.entries.map((entry) => entry.kind)).toEqual(["milestone", "transfer"]);
  });

  it("is empty for a month that has not started", () => {
    const result = journal({ today: { week: 1, weekday: 1 }, transfers: [transfer(firstWeek, "in")] });
    expect(result.past).toEqual([]);
    expect(result.upcoming.length).toBeGreaterThan(0);
  });
});
