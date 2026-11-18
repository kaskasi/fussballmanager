import { planToSessions } from "../development/training-units.ts";
import type { TrainingSlot } from "../development/training-units.ts";
import { validateWeeklyPlan } from "../development/weekly-plan.ts";
import type { BoardState } from "../board/board-state.ts";
import type { LeagueState } from "../persistence/league-state.ts";
import { isSummerTransferWindow } from "./game-calendar.ts";
import { leagueFirstWeek, leagueLastWeek, slotKind } from "./season-schedule.ts";

export interface SummerChecklistItem {
  id: string;
  icon: string;
  label: string;
  done: boolean;
}

/** After the last matchday, and (PRD 35) through the summer break and pre-season of every later season. */
export function showSummerChecklist(week: number, league: LeagueState, season = 2): boolean {
  if (week > leagueLastWeek() || league.season_complete === true) return true;
  const kind = slotKind(week);
  return season > 1 && (kind === "summer_break" || kind === "preseason");
}

export function buildSummerChecklist({
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
}): SummerChecklistItem[] {
  const sessions = planToSessions(trainingPlan);
  const planOk = validateWeeklyPlan(sessions).valid;
  const boardDone =
    board.last_evaluation != null &&
    (board.last_evaluation.season === season ||
      (!league.season_complete && board.last_evaluation.season === season - 1));

  return [
    {
      id: "season_done",
      icon: "🏁",
      label: "Liga-Saison abgeschlossen",
      done:
        league.season_complete || week > leagueLastWeek() || (season > 1 && week < leagueFirstWeek()),
    },
    {
      id: "board_review",
      icon: "📋",
      label: "Vorstand hat Saisonziele bewertet",
      done: boardDone,
    },
    {
      id: "intake",
      icon: "🏫",
      label: "Jugend-Intake verarbeitet",
      done: boardDone,
    },
    {
      id: "transfer_window",
      icon: "🔁",
      label: "Sommerfenster offen",
      done: isSummerTransferWindow(week),
    },
    {
      id: "training_plan",
      icon: "🏋️",
      label: "Trainingsplan gültig",
      done: planOk,
    },
  ];
}
