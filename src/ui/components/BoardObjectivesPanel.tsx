import type { ClubFinances } from "../../economy/club-finances.ts";
import type { LeagueState } from "../../persistence/league-state.ts";
import {
  boardObjectiveProgress,
  boardPressureTone,
  formatObjectiveProgress,
} from "../../board/season-objectives.ts";
import { weeklyWageBill } from "../../economy/club-finances.ts";
import type { Player } from "../../types/player.ts";
import type { YouthCamp } from "../../youth/satellite-camps.ts";
import type { ClubStadium } from "../../stadium/club-stadium.ts";
import { objectiveDisplayLabel } from "../../i18n/board-display.ts";
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
  players = [],
  clubId = "",
  stadium,
  youthCamps = [],
}: {
  board: BoardState;
  league: LeagueState;
  finances: ClubFinances;
  season: number;
  players?: readonly Player[];
  clubId?: string;
  stadium?: ClubStadium;
  youthCamps?: readonly YouthCamp[];
}) {
  useT();
  if (board.objectives.length === 0) return null;
  const progress = boardObjectiveProgress(board, league, finances, {
    players,
    clubId,
    stadium: stadium ?? { name: "", blocks: [] },
    youthCamps: [...youthCamps],
    weeklyWageBill: weeklyWageBill(players, clubId),
  });
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
            objective.kind === "league_place_max" &&
            objective.target === SURVIVAL_TARGET_PLACE &&
            objective.mandatory;
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
              <span className="board-objective-label">
                {objective.label || objectiveDisplayLabel(objective, season)}
              </span>
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
