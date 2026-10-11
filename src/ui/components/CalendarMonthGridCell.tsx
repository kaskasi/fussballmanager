/** Single day cell — shared by Calendar screen and Manager Desk training strip */
import { ArrowLeftRight, Dumbbell, Radar } from "lucide-react";
import { ClubCrest } from "./ClubCrest.tsx";
import { clubLogoUrlForId } from "../assets/club-logo.ts";
import type { CalendarMonthCell } from "../calendar/month-grid.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";

export function CalendarMonthGridCell({
  cell,
  scoutBusy = false,
  scoutTripCount = 0,
  className = "",
  hideMatchChip = false,
}: {
  cell: CalendarMonthCell;
  scoutBusy?: boolean;
  scoutTripCount?: number;
  className?: string;
  /** Manager Desk: match crest lives in training placeholder, not calendar tile. */
  hideMatchChip?: boolean;
}) {
  useT();
  const transferClass =
    cell.transferWindow === "summer"
      ? " is-transfer-summer"
      : cell.transferWindow === "winter"
        ? " is-transfer-winter"
        : "";

  return (
    <div
      className={`calendar-cell${cell.isToday ? " is-today" : ""}${cell.match ? " has-match" : ""}${scoutBusy ? " has-scout-trip" : ""}${transferClass}${cell.transferLastDay ? " is-transfer-last" : ""}${className ? ` ${className}` : ""}`}
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
            <li className="calendar-milestone-overflow">+{cell.milestoneOverflow}</li>
          ) : null}
        </ul>
      ) : null}
      {scoutBusy && !cell.match ? (
        <p className="calendar-scout-chip" title={t("calendar.scoutTrips", { count: scoutTripCount })}>
          <Radar size={12} strokeWidth={2.5} aria-hidden />
          <span className="calendar-scout-chip-label">{scoutTripCount}</span>
        </p>
      ) : null}
      {cell.match && !hideMatchChip ? (
        <p className="calendar-match-chip">
          <ClubCrest
            initials={cell.match.initials}
            logoSrc={clubLogoUrlForId(cell.match.clubId)}
            size={44}
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
}
