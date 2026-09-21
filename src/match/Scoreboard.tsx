import type { MatchClock, MatchView, MatchViewFrame } from "@fussballmanager/shared";

function clockLabel(clock: MatchClock): string {
  const sec = String(clock.second).padStart(2, "0");
  const firstStoppage =
    clock.period === "first_half" &&
    clock.minute === 45 &&
    (clock.stoppageMinute > 0 || clock.second > 0);
  const secondStoppage =
    (clock.period === "second_half" || clock.period === "full_time") &&
    clock.minute === 90 &&
    (clock.stoppageMinute > 0 || clock.second > 0);
  if (firstStoppage || secondStoppage) {
    return `${clock.minute}+${clock.stoppageMinute}'${sec}`;
  }
  if (clock.period === "full_time") {
    return "FT";
  }
  return `${clock.minute}'${sec}`;
}

type ScoreboardProps = {
  view: MatchView;
  frame: MatchViewFrame;
};

export function Scoreboard({ view, frame }: ScoreboardProps) {
  return (
    <header className="scoreboard">
      <p className="eyebrow">Matchday</p>
      <div className="score-row">
        <span className="side home">{view.home.name}</span>
        <span className="score">
          {frame.score.home}–{frame.score.away}
        </span>
        <span className="side away">{view.away.name}</span>
      </div>
      <p className="clock">
        {clockLabel(frame.clock)}
        <span className="formations">
          {view.home.formation} vs {view.away.formation}
        </span>
      </p>
    </header>
  );
}
