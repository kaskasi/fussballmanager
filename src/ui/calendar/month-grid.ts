import { LEAGUE_MATCHDAYS, slotKind, type SeasonSlotKind, weekForMatchday } from "../../sim/season-schedule.ts";
import type { TeamId } from "@fussballmanager/shared";
import type { CupSeason } from "../../competitions/cup-season.ts";
import type { CupId, CupRoundKey } from "../../competitions/cup-definition.ts";
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
  /** PRD 35 — break, free (cup) week or season end; absent for league and pre-season days. */
  slotKind?: Exclude<SeasonSlotKind, "league" | "preseason">;
  match?: {
    label: string;
    initials: string;
    clubId: string;
    short: string;
    home: boolean;
    matchday: number;
    result?: PlayerMatch["result"];
    /** PRD 36 — set on the manager's cup tie. */
    cup?: { id: CupId; key: CupRoundKey };
  };
  milestones?: CalendarMilestoneView[];
  milestoneOverflow?: number;
}

function civilDateKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${monthIndex}-${day}`;
}

function bandKind(week: number): CalendarMonthCell["slotKind"] {
  const kind = slotKind(week);
  return kind === "league" || kind === "preseason" ? undefined : kind;
}

/** Civil Saturday → matchday played on it. */
function leagueMatchSaturdays(season: number): Map<string, number> {
  const map = new Map<string, number>();
  for (let matchday = 1; matchday <= LEAGUE_MATCHDAYS; matchday += 1) {
    const sat = civilDateFromSession(season, weekForMatchday(matchday), SATURDAY);
    map.set(civilDateKey(sat.year, sat.monthIndex, sat.day), matchday);
  }
  return map;
}

interface CupSaturday {
  cup: { id: CupId; key: CupRoundKey };
  opponentId: TeamId;
  home: boolean;
  result?: PlayerMatch["result"];
}

/** Civil Saturday → the manager's cup tie on it (PRD 36). */
function managerCupSaturdays(season: number, teamId: TeamId, cups?: CupSeason): Map<string, CupSaturday> {
  const map = new Map<string, CupSaturday>();
  if (!cups || cups.season !== season) return map;
  for (const cup of cups.cups) {
    for (const round of cup.rounds) {
      const tie = round.ties.find((entry) => entry.home === teamId || entry.away === teamId);
      if (!tie) continue;
      const home = tie.home === teamId;
      const sat = civilDateFromSession(season, round.week, SATURDAY);
      const entry: CupSaturday = { cup: { id: cup.id, key: round.key }, opponentId: home ? tie.away : tie.home, home };
      if (tie.result) {
        const goalsFor = home ? tie.result.homeGoals : tie.result.awayGoals;
        const goalsAgainst = home ? tie.result.awayGoals : tie.result.homeGoals;
        // A shootout decides the tie: the calendar shows who went through.
        entry.result = { goalsFor, goalsAgainst, outcome: tie.result.winner === teamId ? "win" : "loss" };
      }
      map.set(civilDateKey(sat.year, sat.monthIndex, sat.day), entry);
    }
  }
  return map;
}

export function buildMonthGrid(
  season: number,
  monthIndex: number,
  league: LeagueState,
  today?: { week: number; weekday: number },
  milestones: readonly CalendarMilestone[] = [],
  cups?: CupSeason,
): CalendarMonthCell[] {
  const year = calendarGridYear(season, monthIndex);
  const matchSaturdays = leagueMatchSaturdays(season);
  const cupSaturdays = managerCupSaturdays(season, league.player_club_id, cups);
  const first = new Date(year, monthIndex, 1);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const sessionDays = seasonDays(season);
  const cells: CalendarMonthCell[] = [];

  for (let index = 0; index < startPad; index += 1) {
    cells.push({ key: `pad-${index}`, day: null, isToday: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const matchday = matchSaturdays.get(civilDateKey(year, monthIndex, day));
    let match: CalendarMonthCell["match"];
    const fixture = matchday ? playerMatch(league, matchday) : undefined;
    const cupMatch = cupSaturdays.get(civilDateKey(year, monthIndex, day));
    if (cupMatch) {
      match = {
        label: t("calendar.match.cup", {
          cup: t(`cup.name.${cupMatch.cup.id}`),
          club: clubDisplayName(cupMatch.opponentId),
        }),
        initials: clubShortName(cupMatch.opponentId).slice(0, 2).toUpperCase(),
        clubId: cupMatch.opponentId,
        short: clubShortName(cupMatch.opponentId),
        home: cupMatch.home,
        matchday: 0,
        ...(cupMatch.result ? { result: cupMatch.result } : {}),
        cup: cupMatch.cup,
      };
    } else if (fixture) {
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
    // Windows follow the game's season weeks (PRD 35: KW 29–32, KW 52–2), not fixed civil dates.
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
      slotKind: session ? bandKind(session.week) : undefined,
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
