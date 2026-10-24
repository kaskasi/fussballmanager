/** WIREFRAME: docs/prd/design.md §9.5 — Kalender */
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, BookMarked, ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarDay } from "../components/CalendarDay.tsx";
import { CalendarJournal } from "../components/CalendarJournal.tsx";
import { CalendarSeasonStrip } from "../components/CalendarSeasonStrip.tsx";
import { formatSeasonLabel } from "../../sim/season-label.ts";
import type { LeagueState } from "../../persistence/league-state.ts";
import { civilDateFromSession } from "../../sim/session-civil-date.ts";
import {
  civilDateEndOfMonth,
  hasReachedFastForwardTarget,
  type SimulateUntil,
} from "../../sim/fast-forward-to-month.ts";
import { calendarWeek } from "../../sim/game-calendar.ts";
import { buildMonthGrid, type CalendarMonthCell } from "../calendar/month-grid.ts";
import { buildMonthJournal } from "../calendar/month-journal.ts";
import { buildSeasonStrip } from "../calendar/season-timeline.ts";
import type { CalendarMilestone } from "../calendar/calendar-milestones.ts";
import {
  formatCalendarWeekDisplay,
  monthDisplay,
  weekdayShortDisplay,
} from "../../i18n/calendar-display.ts";
import { useT } from "../../i18n/react.ts";
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import type { TreterEdition } from "../../media/kicker-digest.ts";
import type { ChronicleEntry } from "../../narrative/story-state.ts";
import type { TransferRecord } from "../../transfers/transfer-history.ts";
import {
  activeTripCivilDayKeys,
  civilDateKey,
  countActiveScoutTrips,
} from "../../scouting/scout-calendar-day.ts";
import { calendarGridYear } from "../../sim/session-civil-date.ts";
import { isPlaytestShortcutsEnabled } from "../playtest-flags.ts";
import { COACH_TARGET } from "../../tutorial/tutorial-targets.ts";

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

function weekRows(cells: readonly CalendarMonthCell[]): CalendarMonthCell[][] {
  const padded = [...cells];
  while (padded.length % 7 !== 0) padded.push({ key: `end-${padded.length}`, day: null, isToday: false });
  const rows: CalendarMonthCell[][] = [];
  for (let index = 0; index < padded.length; index += 7) rows.push(padded.slice(index, index + 7));
  return rows;
}

export function CalendarScreen({
  season,
  week,
  weekday,
  league,
  milestones = [],
  scoutBoard,
  transfers = [],
  editions = [],
  chronicle = [],
  onFastForwardToMonth,
  onSimulateUntil,
  busy = false,
}: {
  season: number;
  week: number;
  weekday: number;
  league: LeagueState;
  milestones?: readonly CalendarMilestone[];
  scoutBoard?: ScoutBoard;
  transfers?: readonly TransferRecord[];
  editions?: readonly TreterEdition[];
  chronicle?: readonly ChronicleEntry[];
  onFastForwardToMonth?: (monthIndex: number) => void;
  /** Header "Simulate until": run time forward to the next week / next month. */
  onSimulateUntil?: (kind: SimulateUntil) => void;
  /** Any simulation (fast-forward, week advance) in flight — keeps the controls inert. */
  busy?: boolean;
}) {
  const t = useT();
  const today = useMemo(() => ({ week, weekday }), [week, weekday]);
  const todayMonth = civilDateFromSession(season, week, weekday).monthIndex;
  const [monthIndex, setMonthIndex] = useState(todayMonth);

  useEffect(() => {
    setMonthIndex(todayMonth);
  }, [todayMonth]);

  const months = useMemo(() => buildSeasonStrip(season, league, today), [season, league, today]);
  const position = months.findIndex((month) => month.monthIndex === monthIndex);
  const selected = months[position];
  const year = calendarGridYear(season, monthIndex);

  const cells = useMemo(
    () => buildMonthGrid(season, monthIndex, league, today, milestones),
    [season, monthIndex, league, today, milestones],
  );
  const journal = useMemo(
    () =>
      buildMonthJournal({
        season,
        year,
        monthIndex,
        today,
        league,
        transfers,
        editions,
        chronicle,
        milestones,
      }),
    [season, year, monthIndex, today, league, transfers, editions, chronicle, milestones],
  );

  const recordWeeks = useMemo(() => {
    const transferWeeks = new Set<number>();
    const chronicleWeeks = new Set<number>();
    for (const group of journal.past) {
      for (const entry of group.entries) {
        if (entry.kind === "transfer") transferWeeks.add(group.week);
        if (entry.kind === "chronicle") chronicleWeeks.add(group.week);
      }
    }
    return { transferWeeks, chronicleWeeks };
  }, [journal]);

  const activeTrips = scoutBoard?.active_scout_trips ?? [];
  const scoutTripCount = countActiveScoutTrips(activeTrips);
  const scoutBusyDayKeys = useMemo(
    () => activeTripCivilDayKeys(season, week, activeTrips),
    [activeTrips, season, week],
  );
  const monthTargetReached = hasReachedFastForwardTarget(
    season,
    week,
    weekday,
    civilDateEndOfMonth(season, monthIndex),
  );

  const monthName = monthDisplay(monthIndex);
  const monthTitle = t("calendar.monthTitle", { month: monthName, year });
  const { summary } = journal;
  const summaryParts: string[] = [];
  if (summary.played > 0) {
    summaryParts.push(
      t("calendar.summary.played", { count: summary.played }),
      t("calendar.summary.record", { won: summary.won, drawn: summary.drawn, lost: summary.lost }),
      t("calendar.summary.goals", { for: summary.goalsFor, against: summary.goalsAgainst }),
    );
  }
  if (summary.remaining > 0) {
    summaryParts.push(
      t(summary.played > 0 ? "calendar.summary.remaining" : "calendar.summary.ahead", { count: summary.remaining }),
    );
  }
  if (summary.played === 0 && summary.remaining === 0) summaryParts.push(t("calendar.summary.quiet"));
  if (summary.transfers > 0) summaryParts.push(t("calendar.summary.transfers", { count: summary.transfers }));

  const hasOffDays = cells.some((cell) => cell.phase === "off");
  const hasWindow = cells.some((cell) => cell.transferWindow);

  return (
    <main className="calendar club-shell-card-body">
      <div className="fm-tab-panel tc-cal">
        <header className="tc-page-head">
          <span className="tc-label">
            {formatSeasonLabel(season)} · {formatCalendarWeekDisplay(week)} · {weekdayShortDisplay(weekday)}
          </span>
          <div className="tc-cal__titlerow">
            <h1 className="tc-page-title">{monthTitle}</h1>
            <div className="tc-cal__controls">
              <div className="tc-cal__nav" role="group" aria-label={t("calendar.nav.monthAria")}>
                <button
                  type="button"
                  className="tc-iconbtn"
                  aria-label={t("calendar.nav.prev")}
                  disabled={position <= 0}
                  onClick={() => setMonthIndex(months[position - 1]?.monthIndex ?? monthIndex)}
                >
                  <ChevronLeft className="tc-icon" aria-hidden />
                </button>
                <button
                  type="button"
                  className="tc-btn tc-btn--sm"
                  disabled={monthIndex === todayMonth}
                  onClick={() => setMonthIndex(todayMonth)}
                >
                  {t("calendar.nav.today")}
                </button>
                <button
                  type="button"
                  className="tc-iconbtn"
                  aria-label={t("calendar.nav.next")}
                  disabled={position < 0 || position >= months.length - 1}
                  onClick={() => setMonthIndex(months[position + 1]?.monthIndex ?? monthIndex)}
                >
                  <ChevronRight className="tc-icon" aria-hidden />
                </button>
              </div>
              {onSimulateUntil ? (
                <div className="tc-cal__nav" role="group" aria-label={t("calendar.simulate.aria")}>
                  {(["next_week", "next_month"] as const).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      className="tc-btn tc-btn--sm"
                      disabled={busy}
                      onClick={() => onSimulateUntil(kind)}
                    >
                      {t(kind === "next_week" ? "shell.simulate.nextWeek" : "shell.simulate.nextMonth")}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <p className="tc-page-sub tc-cal__summary">
            {summaryParts.map((part) => (
              <span key={part}>{part}</span>
            ))}
          </p>
        </header>

        <CalendarSeasonStrip months={months} selected={{ year, monthIndex }} onSelect={setMonthIndex} />

        {isPlaytestShortcutsEnabled() && onFastForwardToMonth ? (
          <p className="tc-cal__playtest">
            <button
              type="button"
              className="tc-btn tc-btn--sm"
              disabled={busy || monthTargetReached}
              onClick={() => onFastForwardToMonth(monthIndex)}
            >
              {busy
                ? t("calendar.fastForward.busy")
                : monthTargetReached
                  ? t("calendar.fastForward.alreadyThere", { month: monthName })
                  : t("calendar.fastForward.toMonth", { month: monthName })}
            </button>
          </p>
        ) : null}

        <div className="tc-split tc-cal__split">
          <section
            className="tc-panel tc-cal__panel"
            aria-label={t("calendar.gridAria")}
            data-coach-target={COACH_TARGET.calendarMilestones}
          >
            <div key={`${year}-${monthIndex}`} className="tc-cal__grid">
              <span className="tc-cal__colhead tc-cal__colhead--kw">{t("calendar.weekShort")}</span>
              {WEEKDAYS.map((day) => (
                <span key={day} className="tc-cal__colhead">
                  {weekdayShortDisplay(day)}
                </span>
              ))}
              {weekRows(cells).map((row) => {
                const sessionWeek = row.find((cell) => cell.session)?.session?.week;
                const lived = sessionWeek != null && sessionWeek <= week;
                return (
                  <div key={row[0]!.key} className="tc-cal__row">
                    <div className={`tc-cal__kw${lived ? " is-lived" : ""}`}>
                      {sessionWeek != null ? <span>{calendarWeek(sessionWeek)}</span> : null}
                      {sessionWeek != null && recordWeeks.transferWeeks.has(sessionWeek) ? (
                        <ArrowLeftRight className="tc-icon" aria-hidden />
                      ) : null}
                      {sessionWeek != null && recordWeeks.chronicleWeeks.has(sessionWeek) ? (
                        <BookMarked className="tc-icon" aria-hidden />
                      ) : null}
                    </div>
                    {row.map((cell) => (
                      <CalendarDay
                        key={cell.key}
                        cell={cell}
                        scoutBusy={
                          cell.day != null &&
                          scoutTripCount > 0 &&
                          scoutBusyDayKeys.has(civilDateKey({ year, monthIndex, day: cell.day }))
                        }
                        scoutTripCount={scoutTripCount}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
            <ul className="tc-legend tc-cal__legend" aria-label={t("calendar.legend.aria")}>
              {(["win", "draw", "loss"] as const).map((outcome) => (
                <li key={outcome} className="tc-legend__item">
                  <span className={`tc-cal__swatch is-${outcome}`} aria-hidden />
                  {t(`calendar.outcome.${outcome}`)}
                </li>
              ))}
              {hasWindow ? (
                <li className="tc-legend__item">
                  <span className="tc-cal__swatch is-window" aria-hidden />
                  {t("calendar.legend.window")}
                </li>
              ) : null}
              {hasOffDays ? (
                <li className="tc-legend__item">
                  <span className="tc-cal__swatch is-off" aria-hidden />
                  {t("calendar.legend.offSeason")}
                </li>
              ) : null}
            </ul>
          </section>

          <CalendarJournal
            journal={journal}
            monthLabel={monthTitle}
            futureMonth={selected?.phase === "future"}
            revealNote={selected?.phase !== "past"}
          />
        </div>
      </div>
    </main>
  );
}
