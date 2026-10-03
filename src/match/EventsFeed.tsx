import { useEffect, useRef } from "react";
import type { MatchViewLine, Score } from "@fussballmanager/shared";
import { eventLineTone } from "./match-presentation-mode.ts";
import { PreMatchBlock } from "./PreMatchBlock.tsx";
import type { PreMatchBrief } from "./pre-match-brief.ts";

type EventsFeedProps = {
  lines: MatchViewLine[];
  score: Score;
  homeShort: string;
  awayShort: string;
  preMatch?: PreMatchBrief | null;
};

/** Scrollable commentary log for the events-first matchday view. */
export function EventsFeed({ lines, score, homeShort, awayShort, preMatch }: EventsFeedProps) {
  const endRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [lines.length, lines.at(-1)?.seq]);

  return (
    <section className="events-feed" aria-label="Spielereignisse">
      <header className="events-feed-header">
        <span className="events-feed-team">{homeShort}</span>
        <span className="events-feed-score" aria-live="polite">
          {score.home} – {score.away}
        </span>
        <span className="events-feed-team">{awayShort}</span>
      </header>
      {preMatch ? <PreMatchBlock brief={preMatch} /> : null}
      <ol className="events-feed-list">
        {lines.length === 0 ? (
          <li className="events-feed-line is-placeholder">Anpfiff…</li>
        ) : (
          lines.map((line, index) => {
            const tone = eventLineTone(line.text);
            const isLatest = index === lines.length - 1;
            return (
              <li
                key={line.seq}
                ref={isLatest ? endRef : undefined}
                className={[
                  "events-feed-line",
                  isLatest ? "is-latest" : "",
                  tone === "goal" ? "is-goal" : "",
                  tone === "danger" ? "is-danger" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {line.text}
              </li>
            );
          })
        )}
      </ol>
    </section>
  );
}
