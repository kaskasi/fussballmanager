/** WIREFRAME: docs/prd/design.md §9.5 — Kalender */
import { useEffect, useMemo, useState } from "react";
import { Dumbbell } from "lucide-react";
import { ClubCrest } from "../components/ClubCrest.tsx";
import { clubLogoUrlForId } from "../assets/club-logo.ts";
import { formatSeasonLabel } from "../../sim/season-label.ts";
import { calendarWeek } from "../../sim/game-calendar.ts";
import type { LeagueState } from "../../persistence/league-state.ts";
import { buildMonthGrid } from "../calendar/month-grid.ts";

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
  const [monthIndex, setMonthIndex] = useState(() => monthIndexForSeasonWeek(week));
  useEffect(() => {
    setMonthIndex(monthIndexForSeasonWeek(week));
  }, [week]);
  const cells = useMemo(
    () => buildMonthGrid(season, monthIndex, league, { week, weekday }),
    [season, monthIndex, league, week, weekday],
  );

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
            {MONTHS[monthIndex]} · {formatSeasonLabel(season)}
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
          {cells.map((cell) => (
            <div
              key={cell.key}
              className={`calendar-cell${cell.isToday ? " is-today" : ""}${cell.match ? " has-match" : ""}`}
            >
              <span className="calendar-day">{cell.day}</span>
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
                <p className="calendar-day-chip" aria-label="Training">
                  <Dumbbell size={14} strokeWidth={2.5} aria-hidden />
                  Training
                </p>
              ) : null}
            </div>
          ))}
        </div>
        </section>
      </div>
    </main>
  );
}

function monthIndexForSeasonWeek(seasonWeek: number): number {
  const kw = calendarWeek(seasonWeek);
  if (kw >= 35) return 7;
  if (kw >= 27) return 6;
  if (kw >= 22) return 5;
  if (kw >= 18) return 4;
  if (kw >= 14) return 3;
  if (kw >= 10) return 2;
  if (kw >= 6) return 1;
  return 0;
}
