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
}: MatchStageProps) {
  const stageClass = ["match-stage", className, `match-stage--${mode}`]
    .filter(Boolean)
    .join(" ");

  if (mode === "events") {
    return (
      <div className={stageClass}>
        <EventsFeed
          lines={visibleLines}
          score={frame.score}
          homeShort={view.home.shortName}
          awayShort={view.away.shortName}
          preMatch={preMatch}
        />
      </div>
    );
  }

  return (
    <div className={stageClass}>
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
    </div>
  );
}
