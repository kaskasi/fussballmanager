import type { ClubFinances } from "../../economy/club-finances.ts";
import type { LeagueState } from "../../persistence/league-state.ts";
import {
  boardObjectiveProgress,
  boardPressureTone,
  formatObjectiveProgress,
} from "../../board/season-objectives.ts";
import type { BoardState } from "../../board/board-state.ts";
import { clubShortName } from "../../sim/league-week.ts";

/**
 * WIREFRAME: PRD 09 — Vorstand-Saisonziele auf dem Pipeline-Hub
 */
export function BoardObjectivesPanel({
  board,
  league,
  finances,
}: {
  board: BoardState;
  league: LeagueState;
  finances: ClubFinances;
}) {
  if (board.objectives.length === 0) return null;
  const progress = boardObjectiveProgress(board, league, finances);
  const tone = boardPressureTone(board.pressure);
  const employer = clubShortName(board.employer_club_id);

  return (
    <section className={`board-panel is-${tone}`} aria-label="Vorstand-Saisonziele">
      <header className="board-panel-head">
        <span aria-hidden="true">🤵</span>
        <div>
          <strong>Vorstand · {employer}</strong>
          <p>
            {board.job_status === "dismissed"
              ? "Entlassen — neuer Verein wählen"
              : `Druck ${board.pressure}%`}
          </p>
        </div>
      </header>
      <ul className="board-objective-list">
        {board.objectives.map((objective) => {
          const entry = progress.find((item) => item.objectiveId === objective.id);
          const met = entry?.met ?? false;
          return (
            <li key={objective.id} className={met ? "board-objective is-met" : "board-objective"}>
              <span className="board-objective-icon" aria-hidden="true">{objective.icon}</span>
              <span className="board-objective-label">{objective.label}</span>
              <span className="board-objective-value">
                {entry ? formatObjectiveProgress(objective, entry) : "—"}
                <span aria-hidden="true">{met ? " ✓" : ""}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
