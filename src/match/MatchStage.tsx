import type { CSSProperties, ReactNode } from "react";
import type { MatchView, MatchViewFrame, MatchViewLine } from "@fussballmanager/shared";
import { CommentaryFeed } from "./CommentaryFeed.tsx";
import { EventsFeed } from "./EventsFeed.tsx";
import type { MatchPresentationMode } from "./match-presentation-mode.ts";
import type { PreMatchBrief } from "./pre-match-brief.ts";
import { PreMatchBlock } from "./PreMatchBlock.tsx";
import { Pitch } from "./Pitch.tsx";

type MatchStageProps = {
  mode: MatchPresentationMode;
  view: MatchView;
  frame: MatchViewFrame;
  previous: MatchViewFrame | null;
  playing: boolean;
  frameDurationMs: number;
  visibleLines: MatchViewLine[];
  preMatch?: PreMatchBrief | null;
  className?: string;
  /** Low-opacity stadium mood behind pitch + log (PRD 14.10). */
  backdropPhotoUrl?: string;
};

export function MatchStage({
  mode,
  view,
  frame,
  previous,
  playing,
  frameDurationMs,
  visibleLines,
  preMatch,
  className,
  backdropPhotoUrl,
}: MatchStageProps) {
  const stageClass = ["match-stage", className, `match-stage--${mode}`]
    .filter(Boolean)
    .join(" ");

  const wrap = (body: ReactNode) => (
    <div
      className={stageClass}
      style={
        backdropPhotoUrl
          ? ({ ["--match-backdrop" as string]: `url(${backdropPhotoUrl})` } as CSSProperties)
          : undefined
      }
    >
      {backdropPhotoUrl ? <div className="match-stage__backdrop" aria-hidden="true" /> : null}
      <div className="match-stage__foreground">{body}</div>
    </div>
  );

  /** Full-page log — dev sandbox (`Matchday`) only; career match keeps pitch hero (design §9.15). */
  if (mode === "events") {
    return wrap(
        <EventsFeed
          lines={visibleLines}
          score={frame.score}
          homeShort={view.home.shortName}
          awayShort={view.away.shortName}
          frame={frame}
          homeTeamId={view.home.id}
          preMatch={preMatch}
        />
    );
  }

  return wrap(
      <>
      <Pitch
        from={previous ?? frame}
        to={frame}
        playing={playing}
        durationMs={frameDurationMs}
        homeId={view.home.id}
        home={view.home}
        away={view.away}
        roster={view.roster}
        cue={frame.cue}
        cueDetail={frame.cueDetail}
      />
      {preMatch ? <PreMatchBlock brief={preMatch} /> : null}
      <CommentaryFeed lines={visibleLines} />
      </>
  );
}
