/**
 * Season time on the civil calendar (design.md §9.5): which days a season covers,
 * whether a day is past / today / future, and the player's results per matchday.
 * Season weeks are the source of truth; civil dates come from `civilDateFromSession`.
 */
import type { TeamId } from "@fussballmanager/shared";
import type { LeagueState } from "../../persistence/league-state.ts";
import { MONDAY, SATURDAY, SUNDAY } from "../../sim/day-calendar.ts";
import {
  CAREER_START_WEEK,
  isLeagueMatchWeek,
  LEAGUE_FIRST_WEEK,
  LEAGUE_LAST_WEEK,
  SEASON_END_WEEK,
} from "../../sim/game-calendar.ts";
import { fixtureResult, playerFixture } from "../../sim/league-week.ts";
import { civilDateFromSession, type CivilDate } from "../../sim/session-civil-date.ts";

export type DayPhase = "past" | "today" | "future" | "off";
export type MatchOutcome = "win" | "draw" | "loss";

export interface SessionDay {
  week: number;
  weekday: number;
}

export interface PlayerMatch {
  matchday: number;
  opponentId: TeamId;
  home: boolean;
  result?: { goalsFor: number; goalsAgainst: number; outcome: MatchOutcome };
}

export function civilKey(date: CivilDate): string {
  return `${date.year}-${date.monthIndex}-${date.day}`;
}

/** Pre-season weeks only exist in a career's first season; later seasons start on matchday 1. */
export function seasonFirstWeek(season: number): number {
  return season === 1 ? CAREER_START_WEEK : LEAGUE_FIRST_WEEK;
}

/** Every civil day the season covers, keyed by `civilKey`. Days outside (summer break, ISO week 53) are never lived. */
export function seasonDays(season: number): Map<string, SessionDay> {
  const days = new Map<string, SessionDay>();
  for (let week = seasonFirstWeek(season); week <= SEASON_END_WEEK; week += 1) {
    for (let weekday = MONDAY; weekday <= SUNDAY; weekday += 1) {
      days.set(civilKey(civilDateFromSession(season, week, weekday)), { week, weekday });
    }
  }
  return days;
}

export function compareSessionDays(left: SessionDay, right: SessionDay): number {
  return left.week !== right.week ? left.week - right.week : left.weekday - right.weekday;
}

export function dayPhase(day: SessionDay | undefined, today: SessionDay): DayPhase {
  if (!day) return "off";
  const order = compareSessionDays(day, today);
  if (order < 0) return "past";
  return order === 0 ? "today" : "future";
}

/** Months the season touches, in season order (late August → April). */
export function seasonMonths(season: number): Array<{ year: number; monthIndex: number }> {
  const start = civilDateFromSession(season, seasonFirstWeek(season), MONDAY);
  const end = civilDateFromSession(season, SEASON_END_WEEK, SUNDAY);
  const months: Array<{ year: number; monthIndex: number }> = [];
  let year = start.year;
  let monthIndex = start.monthIndex;
  while (year < end.year || (year === end.year && monthIndex <= end.monthIndex)) {
    months.push({ year, monthIndex });
    monthIndex += 1;
    if (monthIndex > 11) {
      monthIndex = 0;
      year += 1;
    }
  }
  return months;
}

export function matchOutcome(goalsFor: number, goalsAgainst: number): MatchOutcome {
  if (goalsFor > goalsAgainst) return "win";
  return goalsFor === goalsAgainst ? "draw" : "loss";
}

/** The player's fixture on a matchday, with the score once it is played. */
export function playerMatch(league: LeagueState, matchday: number): PlayerMatch | undefined {
  if (!isLeagueMatchWeek(matchday)) return undefined;
  const fixture = playerFixture(league, matchday);
  if (!fixture) return undefined;
  const home = fixture.homeTeamId === league.player_club_id;
  const match: PlayerMatch = {
    matchday,
    opponentId: home ? fixture.awayTeamId : fixture.homeTeamId,
    home,
  };
  const played = fixtureResult(league.results, fixture);
  if (played) {
    const goalsFor = home ? played.homeGoals : played.awayGoals;
    const goalsAgainst = home ? played.awayGoals : played.homeGoals;
    match.result = { goalsFor, goalsAgainst, outcome: matchOutcome(goalsFor, goalsAgainst) };
  }
  return match;
}

export interface SeasonStripMonth {
  year: number;
  monthIndex: number;
  phase: "past" | "current" | "future";
  /** Share of the month's season days already lived (0–1). */
  progress: number;
  matches: Array<{ matchday: number; outcome: MatchOutcome | null }>;
}

/** The season ribbon: one segment per month, filling up as time passes. */
export function buildSeasonStrip(
  season: number,
  league: LeagueState,
  today: SessionDay,
): SeasonStripMonth[] {
  const todayCivil = civilDateFromSession(season, today.week, today.weekday);
  const totals = new Map<string, { days: number; lived: number }>();
  for (const [key, day] of seasonDays(season)) {
    const monthKey = key.slice(0, key.lastIndexOf("-"));
    const entry = totals.get(monthKey) ?? { days: 0, lived: 0 };
    entry.days += 1;
    if (dayPhase(day, today) !== "future") entry.lived += 1;
    totals.set(monthKey, entry);
  }

  const matchesByMonth = new Map<string, SeasonStripMonth["matches"]>();
  for (let matchday = LEAGUE_FIRST_WEEK; matchday <= LEAGUE_LAST_WEEK; matchday += 1) {
    const match = playerMatch(league, matchday);
    if (!match) continue;
    const date = civilDateFromSession(season, matchday, SATURDAY);
    const monthKey = `${date.year}-${date.monthIndex}`;
    const list = matchesByMonth.get(monthKey) ?? [];
    list.push({ matchday, outcome: match.result?.outcome ?? null });
    matchesByMonth.set(monthKey, list);
  }

  return seasonMonths(season).map(({ year, monthIndex }) => {
    const monthKey = `${year}-${monthIndex}`;
    const total = totals.get(monthKey) ?? { days: 0, lived: 0 };
    const isCurrent = year === todayCivil.year && monthIndex === todayCivil.monthIndex;
    const isPast = year < todayCivil.year || (year === todayCivil.year && monthIndex < todayCivil.monthIndex);
    return {
      year,
      monthIndex,
      phase: isCurrent ? "current" : isPast ? "past" : "future",
      progress: total.days === 0 ? 0 : total.lived / total.days,
      matches: matchesByMonth.get(monthKey) ?? [],
    };
  });
}
