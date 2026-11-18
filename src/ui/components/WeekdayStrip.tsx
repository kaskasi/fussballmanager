/** WIREFRAME: PRD 09.2 — week day strip (Mo–So), match day highlighted */
import { weekdayShortDisplay, weekdayStripAriaLabel } from "../../i18n/calendar-display.ts";
import { SATURDAY } from "../../sim/day-calendar.ts";
import { isLeagueWeek } from "../../sim/season-schedule.ts";

export function WeekdayStrip({
  week,
  weekday,
}: {
  week: number;
  weekday: number;
}) {
  const matchWeek = isLeagueWeek(week);
  const dayLabels = [1, 2, 3, 4, 5, 6, 7].map((day) => weekdayShortDisplay(day));

  return (
    <div className="weekday-strip" aria-label={weekdayStripAriaLabel(week, weekday)}>
      {dayLabels.map((label, index) => {
        const day = index + 1;
        const isToday = day === weekday;
        const isMatchDay = matchWeek && day === SATURDAY;
        const className = [
          "weekday-strip-day",
          isToday ? "is-today" : "",
          isMatchDay ? "is-matchday" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <span key={day} className={className} aria-current={isToday ? "date" : undefined}>
            {label}
          </span>
        );
      })}
    </div>
  );
}
