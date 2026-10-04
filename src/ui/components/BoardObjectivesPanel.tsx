import type { ClubFinances } from "../../economy/club-finances.ts";
import type { LeagueState } from "../../persistence/league-state.ts";
import {
  boardObjectiveProgress,
  boardPressureTone,
} from "../../board/season-objectives.ts";
import {
  formatObjectiveProgressDisplay,
  objectiveDisplayLabel,
} from "../../i18n/board-display.ts";
import type { BoardState } from "../../board/board-state.ts";
import { SURVIVAL_TARGET_PLACE } from "../../narrative/season-objectives.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import { clubShortName } from "../../sim/league-week.ts";

/**
 * WIREFRAME: PRD 09 — Vorstand-Saisonziele auf dem Pipeline-Hub
 */
export function BoardObjectivesPanel({
  board,
  league,
  finances,
  season,
}: {
  board: BoardState;
  league: LeagueState;
  finances: ClubFinances;
  season: number;
}) {
  useT();
  if (board.objectives.length === 0) return null;
  const progress = boardObjectiveProgress(board, league, finances);
  const tone = boardPressureTone(board.pressure);
  const employer = clubShortName(board.employer_club_id);

  return (
    <section className={`board-panel is-${tone}`} aria-label={t("hub.board.aria")}>
      <header className="board-panel-head">
        <span aria-hidden="true">🤵</span>
        <div>
          <strong>{t("hub.board.title", { employer })}</strong>
          <p>
            {board.job_status === "dismissed"
              ? t("hub.board.dismissed")
              : t("hub.board.pressure", { percent: board.pressure })}
          </p>
        </div>
        {board.job_status !== "dismissed" ? (
          <div
            className="board-pressure-meter"
            role="meter"
            aria-valuenow={board.pressure}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Vorstand-Druck ${board.pressure} Prozent`}
          >
            <span className="board-pressure-fill" style={{ width: `${board.pressure}%` }} />
          </div>
        ) : null}
      </header>
      <ul className="board-objective-list">
        {board.objectives.map((objective) => {
          const entry = progress.find((item) => item.objectiveId === objective.id);
          const met = entry?.met ?? false;
          const survival =
            objective.id === "league_place" && objective.target === SURVIVAL_TARGET_PLACE;
          return (
            <li
              key={objective.id}
              className={
                met
                  ? "board-objective is-met"
                  : survival
                    ? "board-objective is-survival"
                    : "board-objective"
              }
            >
              <span className="board-objective-icon" aria-hidden="true">{objective.icon}</span>
              <span className="board-objective-label">{objectiveDisplayLabel(objective, season)}</span>
              <span className="board-objective-value">
                {entry ? formatObjectiveProgressDisplay(objective, entry) : "—"}
                <span aria-hidden="true">{met ? " ✓" : ""}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
