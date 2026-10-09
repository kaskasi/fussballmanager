/** WIREFRAME: docs/prd/design.md §9.15 — Live side panel: kickoff XI on pitch */
import type { MatchView, MatchViewFrame } from "@fussballmanager/shared";
import { Pitch } from "./Pitch.tsx";

export function MatchSideLineupPitch({
  view,
  kickoffFrame,
}: {
  view: MatchView;
  kickoffFrame: MatchViewFrame;
}) {
  return (
    <div className="matchday-side-lineup-pitch" aria-label="Aufstellungen auf dem Spielfeld">
      <Pitch
        from={kickoffFrame}
        to={kickoffFrame}
        playing={false}
        durationMs={0}
        homeId={view.home.id}
        home={view.home}
        away={view.away}
        roster={view.roster}
        cue={kickoffFrame.cue}
        cueDetail={kickoffFrame.cueDetail}
      />
    </div>
  );
}
