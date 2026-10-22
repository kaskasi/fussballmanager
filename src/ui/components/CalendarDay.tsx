/** One day on the Calendar screen (design.md §9.5): crossed off once lived, carries the score once played. */
import { ArrowLeftRight, Check, Radar } from "lucide-react";
import { ClubCrest } from "./ClubCrest.tsx";
import { clubLogoUrlForId } from "../assets/club-logo.ts";
import type { CalendarMonthCell } from "../calendar/month-grid.ts";
import { useT } from "../../i18n/react.ts";

export function CalendarDay({
  cell,
  scoutBusy = false,
  scoutTripCount = 0,
}: {
  cell: CalendarMonthCell;
  scoutBusy?: boolean;
  scoutTripCount?: number;
}) {
  const t = useT();
  if (cell.day == null) return <div className="tc-cal__day tc-cal__day--pad" aria-hidden />;

  const phase = cell.phase ?? "future";
  const result = cell.match?.result;
  const className = [
    "tc-cal__day",
    `is-${phase}`,
    cell.match ? "has-match" : "",
    result ? `has-result is-${result.outcome}` : "",
    cell.milestones?.length ? "has-notes" : "",
    cell.transferWindow ? "is-window" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const windowTitle =
    cell.transferWindow === "summer"
      ? t("calendar.transferSummerTitle")
      : cell.transferWindow === "winter"
        ? t("calendar.transferWinterTitle")
        : undefined;

  return (
    <div className={className} aria-current={phase === "today" ? "date" : undefined} title={windowTitle}>
      <div className="tc-cal__dayhead">
        <span className="tc-cal__date">{cell.day}</span>
        {phase === "today" ? <span className="tc-cal__today">{t("calendar.todayAria")}</span> : null}
        {scoutBusy ? (
          <span className="tc-cal__scout" title={t("calendar.scoutTrips", { count: scoutTripCount })}>
            <Radar className="tc-icon" aria-hidden />
            {scoutTripCount}
          </span>
        ) : null}
      </div>
      {cell.match ? (
        <p className="tc-cal__match" title={cell.match.label}>
          <ClubCrest
            initials={cell.match.initials}
            logoSrc={clubLogoUrlForId(cell.match.clubId)}
            size={24}
          />
          <span className="tc-cal__opp">
            {t(cell.match.home ? "calendar.match.homeShort" : "calendar.match.awayShort", {
              club: cell.match.short,
            })}
          </span>
          {result ? (
            <span
              className="tc-cal__score"
              aria-label={`${t(`calendar.outcome.${result.outcome}`)} ${result.goalsFor}:${result.goalsAgainst}`}
            >
              {result.goalsFor}:{result.goalsAgainst}
            </span>
          ) : null}
        </p>
      ) : null}
      {cell.milestones?.length ? (
        <ul className="tc-cal__notes" aria-label={t("calendar.milestoneListAria")}>
          {cell.milestones.map((entry) => {
            const done = entry.isPast || phase === "past";
            return (
              <li key={entry.id} className={`tc-cal__note${done ? " is-done" : ""}`} title={entry.title}>
                {done ? <Check className="tc-icon" aria-label={t("calendar.milestone.done")} /> : null}
                {entry.shortLabel}
              </li>
            );
          })}
          {cell.milestoneOverflow ? (
            <li className="tc-cal__note tc-cal__note--more">+{cell.milestoneOverflow}</li>
          ) : null}
        </ul>
      ) : null}
      {cell.transferLastDay ? (
        <p className="tc-cal__window-close">
          <ArrowLeftRight className="tc-icon" aria-hidden />
          <span>{t("calendar.transferClose")}</span>
        </p>
      ) : null}
    </div>
  );
}
