import type { MatchClock, MatchView, MatchViewFrame } from "@fussballmanager/shared";
import { formatLeagueMatchKickoffLabel } from "./match-kickoff-format.ts";
import { MatchStats } from "./MatchStats";

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
  compact?: boolean;
  /** Pre-match Vorschau: volle Vereinsnamen statt Kürzel. */
  fullClubNames?: boolean;
  /** Vorschau: Datum und Anstoß statt 0–0. */
  previewKickoff?: { season: number; week: number; weekday: number };
};

export function Scoreboard({
  view,
  frame,
  compact = false,
  fullClubNames = false,
  previewKickoff,
}: ScoreboardProps) {
  const homeLabel = fullClubNames ? view.home.name : view.home.shortName;
  const awayLabel = fullClubNames ? view.away.name : view.away.shortName;
  const kickoffScheduleLabel =
    previewKickoff &&
    formatLeagueMatchKickoffLabel(
      previewKickoff.season,
      previewKickoff.week,
      previewKickoff.weekday,
    );

  if (compact) {
    return (
      <header className="scoreboard scoreboard--compact">
        <div className="scoreboard-compact-main">
          <span className="side home">{homeLabel}</span>
          <div className="scoreboard-compact-center">
            <span className={`score${kickoffScheduleLabel ? " score--schedule" : ""}`}>
              {kickoffScheduleLabel ?? `${frame.score.home}–${frame.score.away}`}
            </span>
            <span className="clock">
              {kickoffScheduleLabel
                ? `${view.home.formation} vs ${view.away.formation}`
                : `${clockLabel(frame.clock)} · ${view.home.formation} vs ${view.away.formation}`}
            </span>
          </div>
          <span className="side away">{awayLabel}</span>
        </div>
        <details className="match-stats-drawer">
          <summary>
            Statistik · Tore {frame.stats.home.goals}–{frame.stats.away.goals} · Schüsse{" "}
            {frame.stats.home.shots}–{frame.stats.away.shots}
          </summary>
          <MatchStats view={view} stats={frame.stats} compact />
        </details>
      </header>
    );
  }

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
      <MatchStats view={view} stats={frame.stats} />
    </header>
  );
}
