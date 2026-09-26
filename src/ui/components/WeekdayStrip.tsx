/** WIREFRAME: PRD 09.2 — week day strip (Mo–So), match day highlighted */
import { isMatchSaturday, SATURDAY, WEEKDAY_LABELS, weekdayLabel } from "../../sim/day-calendar.ts";

export function WeekdayStrip({
  week,
  weekday,
}: {
  week: number;
  weekday: number;
}) {
  const matchWeek = isMatchSaturday(week);

  return (
    <div className="weekday-strip" aria-label={`Kalenderwoche ${week}, ${weekdayLabel(weekday)}`}>
      {WEEKDAY_LABELS.map((label, index) => {
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
          <span key={label} className={className} aria-current={isToday ? "date" : undefined}>
            {label}
          </span>
        );
      })}
    </div>
  );
}
