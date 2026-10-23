/** design.md §9.14 / §9.15 — score head: club names, score in display type, one meta line. */
import type { ReactNode } from "react";

export function MatchScoreHead({
  home,
  away,
  center,
  meta,
  kicker,
  size = "md",
  live = false,
}: {
  home: string;
  away: string;
  /** Score ("2 : 1") or, before kick-off, the date and time. */
  center: ReactNode;
  meta?: ReactNode;
  kicker?: ReactNode;
  size?: "md" | "lg";
  /** Announce score changes while the match runs. */
  live?: boolean;
}) {
  return (
    <header className={`tc-score tc-score--${size}`}>
      {kicker ? <p className="tc-label tc-score__kicker">{kicker}</p> : null}
      <div className="tc-score__row">
        <span className="tc-score__team">{home}</span>
        <strong className="tc-score__value" aria-live={live ? "polite" : undefined}>
          {center}
        </strong>
        <span className="tc-score__team tc-score__team--away">{away}</span>
      </div>
      {meta ? <p className="tc-score__meta">{meta}</p> : null}
    </header>
  );
}
