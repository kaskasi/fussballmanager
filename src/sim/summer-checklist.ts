import { planToSessions } from "../development/training-units.ts";
import type { TrainingSlot } from "../development/training-units.ts";
import { validateWeeklyPlan } from "../development/weekly-plan.ts";
import type { BoardState } from "../board/board-state.ts";
import type { LeagueState } from "../persistence/league-state.ts";
import { isSummerTransferWindow, LEAGUE_LAST_WEEK } from "./game-calendar.ts";

export interface SummerChecklistItem {
  id: string;
  icon: string;
  label: string;
  done: boolean;
}

export function showSummerChecklist(week: number, league: LeagueState): boolean {
  return week > LEAGUE_LAST_WEEK || league.season_complete === true;
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
      done: league.season_complete || week > LEAGUE_LAST_WEEK,
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
