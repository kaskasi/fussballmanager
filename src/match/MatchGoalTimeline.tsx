/** Shared goal log — design.md §9.14 / §9.15 timeline notation (● home · ○ away). */
import type { MatchReport, TeamId } from "@fussballmanager/shared";

export function MatchGoalTimeline({
  goals,
  homeTeamId,
}: {
  goals: MatchReport["goals"];
  homeTeamId: TeamId;
}) {
  if (goals.length === 0) {
    return <p className="match-timeline-empty">Torloses Spiel.</p>;
  }

  return (
    <ul className="match-goal-timeline" aria-label="Tore">
      {goals.map((goal, index) => {
        const isHome = goal.teamId === homeTeamId;
        return (
          <li key={`${goal.minuteLabel}-${goal.scorerName}-${index}`}>
            <span className="match-goal-minute">{goal.minuteLabel}</span>
            <span className="match-goal-marker" aria-hidden="true">
              {isHome ? "●" : "○"}
            </span>
            <span className="match-goal-text">
              {goal.scorerName}
              {goal.assistName ? ` (A: ${goal.assistName})` : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
