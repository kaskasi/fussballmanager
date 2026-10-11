import type { BoardObjective, ObjectiveProgress } from "../board/board-state.ts";
import { SURVIVAL_TARGET_PLACE } from "../narrative/season-objectives.ts";
import { t } from "./index.ts";

function seasonSuffix(season: number): string {
  return season > 1 ? t("board.objective.seasonSuffix", { season }) : "";
}

export function objectiveDisplayLabel(objective: BoardObjective, season: number): string {
  const suffix = seasonSuffix(season);
  if (objective.id === "league_place" && objective.target === SURVIVAL_TARGET_PLACE) {
    return t("board.objective.survival", { target: objective.target, suffix });
  }
  switch (objective.kind) {
    case "league_place_max":
      return t("board.objective.place", { target: objective.target, suffix });
    case "min_points":
      return t("board.objective.points", { target: objective.target, suffix });
    case "min_cash": {
      const millions = Math.round(objective.target / 100_000) / 10;
      return t("board.objective.cash", { millions, suffix });
    }
    case "min_runway_weeks":
      return t("board.objective.runway", { weeks: objective.target, suffix });
    case "avg_ca_min":
      return t("board.objective.avgCa", { target: objective.target, suffix });
    case "goal_difference_min":
      return t("board.objective.goalDiff", { suffix });
    case "project":
      return objective.label;
  }
  return objective.label;
}

export function formatObjectiveProgressDisplay(
  objective: BoardObjective,
  progress: ObjectiveProgress,
): string {
  switch (objective.kind) {
    case "league_place_max":
      return `#${progress.current}`;
    case "min_points":
      return t("board.progress.points", { value: progress.current });
    case "min_cash": {
      const millions = progress.current / 1_000_000;
      return `€ ${millions.toFixed(1)}M`;
    }
    case "min_runway_weeks":
      return t("board.progress.weeks", { value: progress.current });
    case "avg_ca_min":
      return t("board.progress.avgCa", { value: progress.current });
    case "goal_difference_min":
      return progress.current > 0
        ? t("board.progress.goalDiffPlus", { value: progress.current })
        : String(progress.current);
    case "project":
      return objective.projectId === "merch_revenue"
        ? t("board.progress.percent", { value: progress.current })
        : String(progress.current);
  }
  return String(progress.current);
}
