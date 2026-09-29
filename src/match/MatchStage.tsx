import type { MatchView, MatchViewFrame, MatchViewLine } from "@fussballmanager/shared";
import { CommentaryFeed } from "./CommentaryFeed.tsx";
import { EventsFeed } from "./EventsFeed.tsx";
import type { MatchPresentationMode } from "./match-presentation-mode.ts";
import { Pitch } from "./Pitch.tsx";

type MatchStageProps = {
  mode: MatchPresentationMode;
  view: MatchView;
  frame: MatchViewFrame;
  previous: MatchViewFrame | null;
  playing: boolean;
  frameDurationMs: number;
  visibleLines: MatchViewLine[];
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
      <CommentaryFeed lines={visibleLines} />
    </div>
  );
}
