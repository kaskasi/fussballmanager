import {
  isLeagueMatchWeek,
  LEAGUE_FIRST_WEEK,
  LEAGUE_LAST_WEEK,
} from "../../sim/game-calendar.ts";
import { SATURDAY } from "../../sim/day-calendar.ts";
import type { LeagueState } from "../../persistence/league-state.ts";
import { clubShortName, playerFixture } from "../../sim/league-week.ts";

export interface CalendarMonthCell {
  key: string;
  day: number | null;
  isToday: boolean;
  match?: { label: string; initials: string };
}

/** Map month grid day to season week (Spieltag); null if off-season in this month slice. */
export function seasonWeekForMonthDay(monthIndex: number, day: number): number | null {
  if (monthIndex === 7 && day >= 20) return LEAGUE_FIRST_WEEK;
  if (monthIndex === 8) return Math.min(LEAGUE_LAST_WEEK, 2 + Math.floor(day / 7));
  if (monthIndex >= 9) {
    return Math.min(LEAGUE_LAST_WEEK, 6 + Math.floor((day + (monthIndex - 9) * 30) / 7));
  }
  return null;
}

/** ISO weekday Mon=1 … Sun=7 for a civil date. */
export function isoWeekdayForDate(year: number, monthIndex: number, day: number): number {
  const js = new Date(year, monthIndex, day).getDay();
  return js === 0 ? 7 : js;
}

export function isLeagueMatchDay(year: number, monthIndex: number, day: number): boolean {
  if (isoWeekdayForDate(year, monthIndex, day) !== SATURDAY) return false;
  const seasonWeek = seasonWeekForMonthDay(monthIndex, day);
  return seasonWeek !== null && isLeagueMatchWeek(seasonWeek);
}

export function buildMonthGrid(
  season: number,
  monthIndex: number,
  league: LeagueState,
  today?: { week: number; weekday: number },
): CalendarMonthCell[] {
  const year = season + 2025;
  const first = new Date(year, monthIndex, 1);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: CalendarMonthCell[] = [];

  for (let index = 0; index < startPad; index += 1) {
    cells.push({ key: `pad-${index}`, day: null, isToday: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const seasonWeek = seasonWeekForMonthDay(monthIndex, day);
    let match: CalendarMonthCell["match"];
    if (
      seasonWeek &&
      isLeagueMatchWeek(seasonWeek) &&
      isLeagueMatchDay(year, monthIndex, day)
    ) {
      const fixture = playerFixture(league, seasonWeek);
      if (fixture) {
        const home = fixture.homeTeamId === league.player_club_id;
        const opponent = home ? fixture.awayTeamId : fixture.homeTeamId;
        match = {
          label: home ? `Heim vs ${clubShortName(opponent)}` : `Ausw. @ ${clubShortName(opponent)}`,
          initials: clubShortName(opponent).slice(0, 2).toUpperCase(),
        };
      }
    }

    const isToday =
      today !== undefined &&
      seasonWeek === today.week &&
      isoWeekdayForDate(year, monthIndex, day) === today.weekday;

    cells.push({
      key: `d-${day}`,
      day,
      isToday,
      match,
    });
  }

  return cells;
}
