import { useEffect, useRef } from "react";
import type { MatchViewFrame, MatchViewLine, Score } from "@fussballmanager/shared";
import { useT } from "../i18n/react.ts";
import { localizeMatchLine } from "./localize-match-line.ts";
import { eventLineTone } from "./match-presentation-mode.ts";
import { EventsHud } from "./EventsHud.tsx";
import { PreMatchBlock } from "./PreMatchBlock.tsx";
import type { PreMatchBrief } from "./pre-match-brief.ts";

type EventsFeedProps = {
  lines: MatchViewLine[];
  score: Score;
  homeShort: string;
  awayShort: string;
  frame: MatchViewFrame;
  homeTeamId: string;
  preMatch?: PreMatchBrief | null;
};

/** Scrollable commentary log for the events-first matchday view. */
export function EventsFeed({
  lines,
  score,
  homeShort,
  awayShort,
  frame,
  homeTeamId,
  preMatch,
}: EventsFeedProps) {
  const t = useT();
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [lines.length, lines.at(-1)?.seq, lines.at(-1)?.voice]);

  return (
    <section className="events-feed" aria-label={t("match.events.label")}>
      <div className="events-feed-fixed">
        <header className="events-feed-header">
          <span className="events-feed-team">{homeShort}</span>
          <span className="events-feed-score" aria-live="polite">
            {score.home} – {score.away}
          </span>
          <span className="events-feed-team">{awayShort}</span>
        </header>
        {preMatch ? <PreMatchBlock brief={preMatch} /> : null}
        <EventsHud frame={frame} homeTeamId={homeTeamId} />
      </div>
      <ol ref={listRef} className="events-feed-list">
        {lines.length === 0 ? (
          <li className="events-feed-line is-placeholder">{t("match.commentary.kickoff")}</li>
        ) : (
          lines.map((line, index) => {
            const displayText = localizeMatchLine(line);
            const tone = eventLineTone(displayText);
            return (
              <li
                key={`${line.seq}-${line.voice ?? "pbp"}-${index}`}
                className={[
                  "events-feed-line",
                  line.voice === "color" ? "is-color" : "",
                  index === lines.length - 1 ? "is-latest" : "",
                  tone === "goal" ? "is-goal" : "",
                  tone === "shot" ? "is-shot" : "",
                  tone === "danger" ? "is-danger" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {line.voice === "color" ? (
                  <span className="events-feed-color-label">{t("match.commentary.expert")}</span>
                ) : null}
                {tone === "shot" && line.voice !== "color" ? (
                  <span className="events-feed-shot-icon" aria-hidden="true">◎</span>
                ) : null}
                {displayText}
              </li>
            );
          })
        )}
      </ol>
    </section>
  );
}
