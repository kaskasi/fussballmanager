/** design.md §9.14 / §9.15 — event log in timeline notation: 18' ● Peters (A: Aydin). ● home · ○ away. */
import { useT } from "../i18n/react.ts";
import type { LiveMatchLogEntry } from "./live-match-log.ts";

export function MatchEventLog({
  entries,
  homeShort,
  awayShort,
  emptyLabel,
  ariaLabel,
}: {
  entries: readonly LiveMatchLogEntry[];
  homeShort: string;
  awayShort: string;
  emptyLabel: string;
  ariaLabel: string;
}) {
  const t = useT();
  if (entries.length === 0) {
    return <p className="tc-empty">{emptyLabel}</p>;
  }
  return (
    <ol className="tc-eventlog" aria-label={ariaLabel}>
      {entries.map((entry, index) => (
        <li key={`${entry.minuteLabel}-${entry.name}-${entry.kind}-${index}`} className="tc-eventlog__row">
          <span className="tc-eventlog__minute">{entry.minuteLabel}</span>
          <span className="tc-eventlog__side" title={entry.side === "home" ? homeShort : awayShort}>
            <span aria-hidden="true">{entry.side === "home" ? "●" : "○"}</span>
            <span className="tc-sr">{entry.side === "home" ? homeShort : awayShort}</span>
          </span>
          <span className="tc-eventlog__text">
            {entry.name}
            {entry.assistName ? (
              <span className="tc-eventlog__assist"> {t("match.log.assist", { name: entry.assistName })}</span>
            ) : null}
          </span>
          {entry.kind === "goal" ? (
            <span className="tc-sr">{t("match.log.goal")}</span>
          ) : (
            <span
              className={`tc-eventlog__card tc-eventlog__card--${entry.kind}`}
              role="img"
              aria-label={entry.kind === "red" ? t("match.log.red") : t("match.log.yellow")}
            />
          )}
        </li>
      ))}
    </ol>
  );
}
