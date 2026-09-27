import type { TrainingSlot } from "../../development/training-units.ts";
import type { BoardState } from "../../board/board-state.ts";
import type { LeagueState } from "../../persistence/league-state.ts";
import { buildSummerChecklist, showSummerChecklist } from "../../sim/summer-checklist.ts";

/** WIREFRAME: PRD 09.2 — F11.1 Sommerpause-Checklist */
export function SummerChecklistPanel({
  week,
  season,
  league,
  board,
  trainingPlan,
}: {
  week: number;
  season: number;
  league: LeagueState;
  board: BoardState;
  trainingPlan: TrainingSlot[];
}) {
  if (!showSummerChecklist(week, league)) return null;

  const items = buildSummerChecklist({ week, season, league, board, trainingPlan });
  const doneCount = items.filter((item) => item.done).length;

  return (
    <section className="summer-checklist" aria-label="Sommerpause">
      <header className="summer-checklist-head">
        <h3>Sommerpause</h3>
        <span className="summer-checklist-progress">{doneCount}/{items.length}</span>
      </header>
      <ol className="summer-checklist-list">
        {items.map((item) => (
          <li key={item.id} className={item.done ? "is-done" : "is-pending"}>
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
            <span className="summer-checklist-state" aria-label={item.done ? "Erledigt" : "Offen"}>
              {item.done ? "✓" : "○"}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
