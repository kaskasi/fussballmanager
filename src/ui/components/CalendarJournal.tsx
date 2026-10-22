/** Chronicle column on the Calendar screen (design.md §9.5): what is ahead, then the month week by week. */
import { ArrowLeftRight, BookMarked, CircleCheck, Flag, Newspaper } from "lucide-react";
import { ClubCrest } from "./ClubCrest.tsx";
import { clubLogoUrlForId } from "../assets/club-logo.ts";
import type { JournalEntry, MonthJournal } from "../calendar/month-journal.ts";
import { formatClubCash } from "../../economy/club-finances.ts";
import { formatCalendarWeekDisplay, weekdayShortDisplay } from "../../i18n/calendar-display.ts";
import { useT } from "../../i18n/react.ts";
import { formatTreterTickerLine } from "../../i18n/treter-display.ts";
import { clubDisplayName } from "../../sim/league-divisions.ts";
import { clubShortName } from "../../sim/league-week.ts";
import { transferKindLabel } from "../../transfers/transfer-history.ts";

function JournalItem({ entry, upcoming }: { entry: JournalEntry; upcoming: boolean }) {
  const t = useT();
  const date = (weekday: number, day: number) => t("calendar.journal.date", { weekday: weekdayShortDisplay(weekday), day });

  switch (entry.kind) {
    case "match": {
      const { match } = entry;
      const result = match.result;
      return (
        <li className="tc-list__item">
          <ClubCrest
            initials={clubShortName(match.opponentId).slice(0, 2).toUpperCase()}
            logoSrc={clubLogoUrlForId(match.opponentId)}
            size={24}
          />
          <span className="tc-list__main">
            <span className="tc-list__name">
              {t(match.home ? "calendar.match.home" : "calendar.match.away", {
                club: clubDisplayName(match.opponentId),
              })}
            </span>
            <span className="tc-list__meta">
              {date(entry.weekday, entry.day)} · {t("calendar.journal.matchday", { matchday: match.matchday })}
            </span>
          </span>
          {result ? (
            <span className={`tc-cal__result is-${result.outcome}`}>
              <span className="tc-cal__badge" title={t(`calendar.outcome.${result.outcome}`)}>
                {t(`calendar.outcome.${result.outcome}Short`)}
              </span>
              {result.goalsFor}:{result.goalsAgainst}
            </span>
          ) : null}
        </li>
      );
    }
    case "milestone": {
      const Icon = upcoming ? Flag : CircleCheck;
      return (
        <li className="tc-list__item">
          <Icon className="tc-icon" aria-hidden />
          <span className="tc-list__main">
            <span className="tc-list__name" title={entry.label}>
              {entry.label}
            </span>
            <span className="tc-list__meta">{date(entry.weekday, entry.day)}</span>
          </span>
        </li>
      );
    }
    case "transfer": {
      const { record } = entry;
      return (
        <li className="tc-list__item">
          <ArrowLeftRight className="tc-icon" aria-hidden />
          <span className="tc-list__main">
            <span className="tc-list__name">{record.player_name}</span>
            <span className="tc-list__meta">
              {transferKindLabel(record.kind)} · {record.other_club_name}
            </span>
          </span>
          {record.fee != null ? <span className="tc-cal__fee">{formatClubCash(record.fee)}</span> : null}
        </li>
      );
    }
    case "news": {
      const headline = formatTreterTickerLine(entry.article);
      return (
        <li className="tc-list__item">
          <Newspaper className="tc-icon" aria-hidden />
          <span className="tc-list__main">
            <span className="tc-list__name" title={headline}>
              {headline}
            </span>
            <span className="tc-list__meta">{entry.masthead}</span>
          </span>
        </li>
      );
    }
    case "chronicle":
      return (
        <li className="tc-list__item">
          <BookMarked className="tc-icon" aria-hidden />
          <span className="tc-list__main">
            <span className="tc-list__name">{entry.entry.title}</span>
            <span className="tc-list__meta" title={entry.entry.body}>
              {entry.entry.body}
            </span>
          </span>
        </li>
      );
  }
}

export function CalendarJournal({
  journal,
  monthLabel,
  futureMonth,
  revealNote,
}: {
  journal: MonthJournal;
  monthLabel: string;
  futureMonth: boolean;
  /** Later weeks' dates are hidden until Monday reveals them. */
  revealNote: boolean;
}) {
  const t = useT();
  const empty = journal.upcoming.length === 0 && journal.past.length === 0;

  return (
    <aside className="tc-panel tc-cal__journal" aria-labelledby="calendar-journal-title">
      <div className="tc-panel__head">
        <h2 id="calendar-journal-title" className="tc-panel__title">
          {t("calendar.journal.title")}
        </h2>
        <span className="tc-caption">{monthLabel}</span>
      </div>
      {journal.upcoming.length ? (
        <section className="tc-section tc-cal__upcoming">
          <h3 className="tc-label tc-section__title">{t("calendar.journal.upcoming")}</h3>
          <ul className="tc-list">
            {journal.upcoming.map((entry) => (
              <JournalItem key={entry.id} entry={entry} upcoming />
            ))}
          </ul>
          {revealNote ? <p className="tc-caption tc-cal__reveal">{t("calendar.mondayRevealKicker")}</p> : null}
        </section>
      ) : null}
      {journal.past.length ? (
        <section className="tc-section">
          <h3 className="tc-label tc-section__title">{t("calendar.journal.past")}</h3>
          {journal.past.map((week) => (
            <div key={week.week} className="tc-cal__jweek">
              <h4 className="tc-cal__jweek-title">{formatCalendarWeekDisplay(week.week)}</h4>
              <ul className="tc-list">
                {week.entries.map((entry) => (
                  <JournalItem key={entry.id} entry={entry} upcoming={false} />
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
      {empty ? (
        <p className="tc-empty">{t(futureMonth ? "calendar.journal.emptyFuture" : "calendar.journal.empty")}</p>
      ) : null}
    </aside>
  );
}
