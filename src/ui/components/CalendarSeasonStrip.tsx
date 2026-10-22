/** Season ribbon on the Calendar screen (design.md §9.5): fills month by month, one tick per matchday. */
import type { SeasonStripMonth } from "../calendar/season-timeline.ts";
import { monthDisplay, monthShortDisplay } from "../../i18n/calendar-display.ts";
import { useT } from "../../i18n/react.ts";

export function CalendarSeasonStrip({
  months,
  selected,
  onSelect,
}: {
  months: readonly SeasonStripMonth[];
  selected: { year: number; monthIndex: number };
  onSelect: (monthIndex: number) => void;
}) {
  const t = useT();
  return (
    <nav className="tc-cal-strip" aria-label={t("calendar.strip.aria")}>
      <ol className="tc-cal-strip__list">
        {months.map((month) => {
          const isSelected = month.year === selected.year && month.monthIndex === selected.monthIndex;
          const played = month.matches.filter((match) => match.outcome != null).length;
          return (
            <li key={`${month.year}-${month.monthIndex}`}>
              <button
                type="button"
                className={`tc-cal-strip__month is-${month.phase}`}
                aria-current={isSelected ? "true" : undefined}
                aria-label={t("calendar.strip.month", {
                  month: monthDisplay(month.monthIndex),
                  year: month.year,
                  played,
                  total: month.matches.length,
                })}
                onClick={() => onSelect(month.monthIndex)}
              >
                <span className="tc-cal-strip__name">{monthShortDisplay(month.monthIndex)}</span>
                <span className="tc-cal-strip__bar" aria-hidden>
                  <span
                    className="tc-cal-strip__fill"
                    style={{ inlineSize: `${Math.round(month.progress * 100)}%` }}
                  />
                </span>
                <span className="tc-cal-strip__ticks" aria-hidden>
                  {month.matches.map((match) => (
                    <span key={match.matchday} className={`tc-cal-strip__tick is-${match.outcome ?? "open"}`} />
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
