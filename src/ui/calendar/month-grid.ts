import {
  isLeagueMatchWeek,
  LEAGUE_FIRST_WEEK,
  LEAGUE_LAST_WEEK,
} from "../../sim/game-calendar.ts";
import { SATURDAY, SUNDAY } from "../../sim/day-calendar.ts";
import {
  calendarGridYear,
  civilDateFromSession,
} from "../../sim/session-civil-date.ts";
import type { LeagueState } from "../../persistence/league-state.ts";
import { clubShortName } from "../../sim/league-week.ts";
import { clubDisplayName } from "../../sim/league-divisions.ts";
import { t } from "../../i18n/index.ts";
import { transferWindowKind, type TransferWindowKind } from "../../sim/transfer-windows.ts";
import type { CalendarMilestone } from "./calendar-milestones.ts";
import {
  attachMilestonesToGrid,
  milestoneOverflowCount,
  type CalendarMilestoneView,
} from "./calendar-milestones.ts";
import {
  civilKey,
  dayPhase,
  playerMatch,
  seasonDays,
  type DayPhase,
  type PlayerMatch,
  type SessionDay,
} from "./season-timeline.ts";

export interface CalendarMonthCell {
  key: string;
  day: number | null;
  isToday: boolean;
  /** Season week + weekday of this civil day; absent outside the season. */
  session?: SessionDay;
  /** Only set when `today` is passed to `buildMonthGrid`. */
  phase?: DayPhase;
  transferWindow?: TransferWindowKind;
  transferLastDay?: boolean;
  match?: {
    label: string;
    initials: string;
    clubId: string;
    short: string;
    home: boolean;
    matchday: number;
    result?: PlayerMatch["result"];
  };
  milestones?: CalendarMilestoneView[];
  milestoneOverflow?: number;
}

function civilDateKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${monthIndex}-${day}`;
}

function leagueMatchSaturdayWeeks(season: number): Map<string, number> {
  const map = new Map<string, number>();
  for (let week = LEAGUE_FIRST_WEEK; week <= LEAGUE_LAST_WEEK; week += 1) {
    if (!isLeagueMatchWeek(week)) continue;
    const sat = civilDateFromSession(season, week, SATURDAY);
    map.set(civilDateKey(sat.year, sat.monthIndex, sat.day), week);
  }
  return map;
}

export function buildMonthGrid(
  season: number,
  monthIndex: number,
  league: LeagueState,
  today?: { week: number; weekday: number },
  milestones: readonly CalendarMilestone[] = [],
): CalendarMonthCell[] {
  const year = calendarGridYear(season, monthIndex);
  const matchSaturdays = leagueMatchSaturdayWeeks(season);
  const first = new Date(year, monthIndex, 1);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const sessionDays = seasonDays(season);
  const cells: CalendarMonthCell[] = [];

  for (let index = 0; index < startPad; index += 1) {
    cells.push({ key: `pad-${index}`, day: null, isToday: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const seasonWeek = matchSaturdays.get(civilDateKey(year, monthIndex, day));
    let match: CalendarMonthCell["match"];
    const fixture = seasonWeek ? playerMatch(league, seasonWeek) : undefined;
    if (fixture) {
      match = {
        label: t(fixture.home ? "calendar.match.home" : "calendar.match.away", {
          club: clubDisplayName(fixture.opponentId),
        }),
        initials: clubShortName(fixture.opponentId).slice(0, 2).toUpperCase(),
        clubId: fixture.opponentId,
        short: clubShortName(fixture.opponentId),
        home: fixture.home,
        matchday: fixture.matchday,
        result: fixture.result,
      };
    }

    const isToday =
      today !== undefined &&
      (() => {
        const civil = civilDateFromSession(season, today.week, today.weekday);
        return civil.monthIndex === monthIndex && civil.day === day && civil.year === year;
      })();

    const session = sessionDays.get(civilKey({ year, monthIndex, day }));
    // Windows follow the game's season weeks (KW 33–36, KW 2–4), not fixed civil dates.
    const transferWindow = session ? transferWindowKind(session.week) : null;
    const transferLastDay =
      transferWindow != null && session?.weekday === SUNDAY && transferWindowKind(session.week + 1) == null;

    cells.push({
      key: `d-${day}`,
      day,
      isToday,
      session,
      phase: today ? dayPhase(session, today) : undefined,
      transferWindow: transferWindow ?? undefined,
      transferLastDay: transferLastDay || undefined,
      match,
    });
  }

  const milestoneMap = attachMilestonesToGrid(
    cells,
    season,
    monthIndex,
    milestones,
    2,
    today ? { season, week: today.week } : undefined,
  );
  const overflowMap = milestoneOverflowCount(cells, season, monthIndex, milestones);

  return cells.map((cell) => {
    if (cell.day == null) return cell;
    const key = cell.key;
    return {
      ...cell,
      milestones: milestoneMap.get(key),
      milestoneOverflow: overflowMap.get(key),
    };
  });
}

/** One civil day for a session weekday — same rules as the month grid (match, transfer, milestones). */
export function calendarCellForSessionWeekday(
  season: number,
  week: number,
  weekday: number,
  league: LeagueState,
  milestones: readonly CalendarMilestone[],
  today: { week: number; weekday: number },
): CalendarMonthCell {
  const civil = civilDateFromSession(season, week, weekday);
  const grid = buildMonthGrid(season, civil.monthIndex, league, today, milestones);
  const found = grid.find((cell) => cell.day === civil.day);
  if (found) return found;
  return {
    key: `session-${week}-${weekday}`,
    day: civil.day,
    isToday: today.week === week && today.weekday === weekday,
  };
}
