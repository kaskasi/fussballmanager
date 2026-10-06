/** WIREFRAME: docs/prd/design.md §9.5 — Kalender */
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Dumbbell } from "lucide-react";
import { ClubCrest } from "../components/ClubCrest.tsx";
import { clubLogoUrlForId } from "../assets/club-logo.ts";
import { formatSeasonLabel } from "../../sim/season-label.ts";
import type { LeagueState } from "../../persistence/league-state.ts";
import { sessionMonthIndex } from "../../sim/session-civil-date.ts";
import { buildMonthGrid } from "../calendar/month-grid.ts";
import type { CalendarMilestone } from "../calendar/calendar-milestones.ts";
import { formatCalendarWeekDisplay, weekdayShortDisplay } from "../../i18n/calendar-display.ts";
import { useT } from "../../i18n/react.ts";
import { MONDAY } from "../../sim/day-calendar.ts";

const MONTH_KEYS = [
  "calendar.month.january",
  "calendar.month.february",
  "calendar.month.march",
  "calendar.month.april",
  "calendar.month.may",
  "calendar.month.june",
  "calendar.month.july",
  "calendar.month.august",
  "calendar.month.september",
  "calendar.month.october",
  "calendar.month.november",
  "calendar.month.december",
] as const;

export function CalendarScreen({
  season,
  week,
  weekday,
  league,
  milestones = [],
}: {
  season: number;
  week: number;
  weekday: number;
  league: LeagueState;
  milestones?: readonly CalendarMilestone[];
}) {
  const t = useT();
  const [monthIndex, setMonthIndex] = useState(() => sessionMonthIndex(season, week, weekday));
  const todayCellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMonthIndex(sessionMonthIndex(season, week, weekday));
  }, [season, week, weekday]);

  const cells = useMemo(
    () => buildMonthGrid(season, monthIndex, league, { week, weekday }, milestones),
    [season, monthIndex, league, week, weekday, milestones],
  );

  useEffect(() => {
    todayCellRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [week, weekday, monthIndex]);

  return (
    <main className="calendar club-shell-card-body">
      <div className="fm-tab-panel">
        <nav className="calendar-month-nav" aria-label={t("calendar.nav.monthAria")}>
          <button
            type="button"
            disabled={monthIndex <= 0}
            onClick={() => setMonthIndex((value) => Math.max(0, value - 1))}
          >
            ◀
          </button>
          <span className="calendar-month-label">
            {t(MONTH_KEYS[monthIndex] ?? "calendar.month.january")} · {formatSeasonLabel(season)} ·{" "}
            {formatCalendarWeekDisplay(week)} ·{" "}
            {weekdayShortDisplay(weekday)}
          </span>
          <button
            type="button"
            disabled={monthIndex >= MONTH_KEYS.length - 1}
            onClick={() => setMonthIndex((value) => Math.min(MONTH_KEYS.length - 1, value + 1))}
          >
            ▶
          </button>
        </nav>
        {weekday === MONDAY ? (
          <p className="calendar-context-kicker">{t("calendar.mondayRevealKicker")}</p>
        ) : null}
        <section className="game-panel calendar-grid-wrap" aria-label={t("calendar.gridAria")}>
          <div className="calendar-weekdays">
            {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {cells.map((cell) => {
              const transferClass =
                cell.transferWindow === "summer"
                  ? " is-transfer-summer"
                  : cell.transferWindow === "winter"
                    ? " is-transfer-winter"
                    : "";
              return (
                <div
                  key={cell.key}
                  ref={cell.isToday ? todayCellRef : undefined}
                  className={`calendar-cell${cell.isToday ? " is-today" : ""}${cell.match ? " has-match" : ""}${transferClass}${cell.transferLastDay ? " is-transfer-last" : ""}`}
                >
                  {cell.transferWindow ? (
                    <span
                      className="calendar-transfer-earmark"
                      title={
                        cell.transferWindow === "summer"
                          ? t("calendar.transferSummerTitle")
                          : t("calendar.transferWinterTitle")
                      }
                      aria-hidden
                    />
                  ) : null}
                  <span className="calendar-day">{cell.day}</span>
                  {cell.transferLastDay ? (
                    <p className="calendar-transfer-close">
                      <ArrowLeftRight size={12} strokeWidth={2.5} aria-hidden />
                      {t("calendar.transferClose")}
                    </p>
                  ) : null}
                  {cell.milestones?.length ? (
                    <ul className="calendar-milestone-list" aria-label={t("calendar.milestoneListAria")}>
                      {cell.milestones.map((entry) => (
                        <li
                          key={entry.id}
                          className={`calendar-milestone-chip is-${entry.kind}${entry.isPast ? " is-past" : ""}${entry.isCurrentWeek ? " is-current-week" : ""}`}
                          title={entry.title}
                        >
                          {entry.shortLabel}
                        </li>
                      ))}
                      {cell.milestoneOverflow ? (
                        <li className="calendar-milestone-overflow">
                          +{cell.milestoneOverflow}
                        </li>
                      ) : null}
                    </ul>
                  ) : null}
                  {cell.match ? (
                    <p className="calendar-match-chip">
                      <ClubCrest
                        initials={cell.match.initials}
                        logoSrc={clubLogoUrlForId(cell.match.clubId)}
                        size={28}
                      />
                      {cell.match.label}
                    </p>
                  ) : cell.isToday ? (
                    <p className="calendar-day-chip calendar-day-chip--today" aria-label={t("calendar.todayAria")}>
                      <Dumbbell size={14} strokeWidth={2.5} aria-hidden />
                      {t("calendar.todayAria")}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
