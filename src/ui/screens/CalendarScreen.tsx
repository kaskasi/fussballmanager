/** WIREFRAME: docs/prd/design.md §9.5 — Kalender */
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Dumbbell } from "lucide-react";
import { ClubCrest } from "../components/ClubCrest.tsx";
import { clubLogoUrlForId } from "../assets/club-logo.ts";
import { formatSeasonLabel } from "../../sim/season-label.ts";
import type { LeagueState } from "../../persistence/league-state.ts";
import { sessionMonthIndex } from "../../sim/session-civil-date.ts";
import { buildMonthGrid } from "../calendar/month-grid.ts";
import { formatCalendarWeekDisplay, weekdayShortDisplay } from "../../i18n/calendar-display.ts";

const MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;

export function CalendarScreen({
  season,
  week,
  weekday,
  league,
}: {
  season: number;
  week: number;
  weekday: number;
  league: LeagueState;
}) {
  const [monthIndex, setMonthIndex] = useState(() => sessionMonthIndex(season, week, weekday));
  const todayCellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMonthIndex(sessionMonthIndex(season, week, weekday));
  }, [season, week, weekday]);

  const cells = useMemo(
    () => buildMonthGrid(season, monthIndex, league, { week, weekday }),
    [season, monthIndex, league, week, weekday],
  );

  useEffect(() => {
    todayCellRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [week, weekday, monthIndex]);

  return (
    <main className="calendar club-shell-card-body">
      <div className="fm-tab-panel">
        <nav className="calendar-month-nav" aria-label="Monat">
          <button
            type="button"
            disabled={monthIndex <= 0}
            onClick={() => setMonthIndex((value) => Math.max(0, value - 1))}
          >
            ◀
          </button>
          <span className="calendar-month-label">
            {MONTHS[monthIndex]} · {formatSeasonLabel(season)} · {formatCalendarWeekDisplay(week)} ·{" "}
            {weekdayShortDisplay(weekday)}
          </span>
          <button
            type="button"
            disabled={monthIndex >= MONTHS.length - 1}
            onClick={() => setMonthIndex((value) => Math.min(MONTHS.length - 1, value + 1))}
          >
            ▶
          </button>
        </nav>
        <section className="game-panel calendar-grid-wrap" aria-label="Saisonkalender">
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
                        cell.transferWindow === "summer" ? "Sommerfenster" : "Winterfenster"
                      }
                      aria-hidden
                    />
                  ) : null}
                  <span className="calendar-day">{cell.day}</span>
                  {cell.transferLastDay ? (
                    <p className="calendar-transfer-close">
                      <ArrowLeftRight size={12} strokeWidth={2.5} aria-hidden />
                      Fenster schließt
                    </p>
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
                    <p className="calendar-day-chip calendar-day-chip--today" aria-label="Heute">
                      <Dumbbell size={14} strokeWidth={2.5} aria-hidden />
                      Heute
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
