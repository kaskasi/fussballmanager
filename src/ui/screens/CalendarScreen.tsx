/** WIREFRAME: docs/prd/design.md §9.5 — Kalender */
import { useMemo, useState } from "react";
import { ClubCrest } from "../components/ClubCrest.tsx";
import { formatSeasonLabel } from "../../sim/season-label.ts";
import {
  calendarWeek,
  isLeagueMatchWeek,
  LEAGUE_FIRST_WEEK,
  LEAGUE_LAST_WEEK,
} from "../../sim/game-calendar.ts";
import type { LeagueState } from "../../persistence/league-state.ts";
import { clubShortName, playerFixture } from "../../sim/league-week.ts";

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
  league,
}: {
  season: number;
  week: number;
  league: LeagueState;
}) {
  const [monthIndex, setMonthIndex] = useState(() => monthIndexForSeasonWeek(week));
  const cells = useMemo(() => buildMonthGrid(season, monthIndex, league), [season, monthIndex, league]);

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
                  <ClubCrest initials={cell.match.initials} />
                  {cell.match.label}
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

function buildMonthGrid(season: number, monthIndex: number, league: LeagueState) {
  const year = season + 2025;
  const first = new Date(year, monthIndex, 1);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<{
    key: string;
    day: number | null;
    isToday: boolean;
    match?: { label: string; initials: string };
  }> = [];
  for (let index = 0; index < startPad; index += 1) {
    cells.push({ key: `pad-${index}`, day: null, isToday: false });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const matchWeek = matchWeekForDay(monthIndex, day);
    let match: { label: string; initials: string } | undefined;
    if (matchWeek && isLeagueMatchWeek(matchWeek)) {
      const fixture = playerFixture(league, matchWeek);
      if (fixture) {
        const home = fixture.homeTeamId === league.player_club_id;
        const opponent = home ? fixture.awayTeamId : fixture.homeTeamId;
        match = {
          label: home ? `Heim vs ${clubShortName(opponent)}` : `Ausw. @ ${clubShortName(opponent)}`,
          initials: clubShortName(opponent).slice(0, 2).toUpperCase(),
        };
      }
    }
    cells.push({
      key: `d-${day}`,
      day,
      isToday: false,
      match,
    });
  }
  return cells;
}

function matchWeekForDay(monthIndex: number, day: number): number | null {
  if (monthIndex === 7 && day >= 20) return LEAGUE_FIRST_WEEK;
  if (monthIndex === 8) return Math.min(LEAGUE_LAST_WEEK, 2 + Math.floor(day / 7));
  if (monthIndex >= 9) return Math.min(LEAGUE_LAST_WEEK, 6 + Math.floor((day + (monthIndex - 9) * 30) / 7));
  return null;
}
