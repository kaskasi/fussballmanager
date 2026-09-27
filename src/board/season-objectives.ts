import { NORDSTERN_ID, type TeamId } from "@fussballmanager/shared";
import { leagueTablePlace, type ClubFinances } from "../economy/club-finances.ts";
import type { LeagueState } from "../persistence/league-state.ts";
import { playerTableRow } from "../sim/league-week.ts";
import type {
  BoardObjective,
  BoardState,
  ObjectiveProgress,
  SeasonObjectiveEvaluation,
} from "./board-state.ts";

const SUCCESS_BONUS = 200_000;
const FAILURE_PENALTY = 75_000;

interface ObjectiveTargets {
  place: number;
  points: number;
  cash: number;
}

function targetsForEmployer(clubId: TeamId): ObjectiveTargets {
  if (clubId === NORDSTERN_ID) {
    return { place: 3, points: 40, cash: 3_500_000 };
  }
  return { place: 4, points: 34, cash: 2_800_000 };
}

export function generateSeasonObjectives(
  employerClubId: TeamId,
  season: number,
): BoardObjective[] {
  const targets = targetsForEmployer(employerClubId);
  const suffix = season > 1 ? ` (S${season})` : "";
  return [
    {
      id: "league_place",
      kind: "league_place_max",
      target: targets.place,
      label: `Platz ${targets.place} oder besser${suffix}`,
      icon: "🏆",
    },
    {
      id: "league_points",
      kind: "min_points",
      target: targets.points,
      label: `Mindestens ${targets.points} Punkte${suffix}`,
      icon: "📊",
    },
    {
      id: "club_cash",
      kind: "min_cash",
      target: targets.cash,
      label: `Cash ≥ € ${Math.round(targets.cash / 100_000) / 10} Mio.${suffix}`,
      icon: "💰",
    },
  ];
}

export function startBoardSeason(
  board: BoardState,
  employerClubId: TeamId,
  season: number,
): BoardState {
  return {
    ...board,
    employer_club_id: employerClubId,
    objectives: generateSeasonObjectives(employerClubId, season),
    pressure: 0,
    job_status: "employed",
    promotions_this_season: 0,
    last_evaluation: undefined,
  };
}

export function objectiveProgress(
  objective: BoardObjective,
  league: LeagueState,
  finances: ClubFinances,
): ObjectiveProgress {
  const row = playerTableRow(league);
  switch (objective.kind) {
    case "league_place_max": {
      const place = leagueTablePlace(league);
      return { objectiveId: objective.id, current: place, met: place <= objective.target };
    }
    case "min_points": {
      const points = row?.points ?? 0;
      return { objectiveId: objective.id, current: points, met: points >= objective.target };
    }
    case "min_cash": {
      const cash = finances.cash;
      return { objectiveId: objective.id, current: cash, met: cash >= objective.target };
    }
  }
}

export function boardObjectiveProgress(
  board: BoardState,
  league: LeagueState,
  finances: ClubFinances,
): ObjectiveProgress[] {
  return board.objectives.map((objective) => objectiveProgress(objective, league, finances));
}

export function boardPressureTone(pressure: number): "good" | "warn" | "bad" {
  if (pressure >= 60) return "bad";
  if (pressure >= 30) return "warn";
  return "good";
}

export function evaluateSeasonObjectives(
  board: BoardState,
  league: LeagueState,
  finances: ClubFinances,
  season: number,
): { board: BoardState; finances: ClubFinances; evaluation: SeasonObjectiveEvaluation } {
  const progress = boardObjectiveProgress(board, league, finances);
  const metIds = progress.filter((entry) => entry.met).map((entry) => entry.objectiveId);
  const failedIds = progress.filter((entry) => !entry.met).map((entry) => entry.objectiveId);
  const metCount = metIds.length;
  const dismissed = metCount < 2;
  let bonusPaid = 0;
  let nextFinances = finances;
  let pressure = board.pressure;

  if (metCount === board.objectives.length) {
    bonusPaid = SUCCESS_BONUS;
    nextFinances = { ...finances, cash: finances.cash + SUCCESS_BONUS };
    pressure = 0;
  } else if (metCount === 1) {
    pressure = Math.min(100, pressure + 45);
    nextFinances = { ...finances, cash: Math.max(0, finances.cash - FAILURE_PENALTY) };
  } else if (metCount === 2) {
    pressure = Math.min(100, pressure + 15);
  } else {
    pressure = 100;
  }

  const evaluation: SeasonObjectiveEvaluation = {
    season,
    metIds,
    failedIds,
    bonusPaid,
    dismissed,
    summary: dismissed
      ? "Vorstand entlässt dich — mindestens zwei Ziele verfehlt."
      : metCount === board.objectives.length
        ? "Alle Saisonziele erreicht — Vorstand zahlt Bonus."
        : `${metCount}/${board.objectives.length} Ziele erreicht — Verwarnung.`,
  };

  return {
    board: {
      ...board,
      pressure,
      job_status: dismissed ? "dismissed" : "employed",
      last_evaluation: evaluation,
    },
    finances: nextFinances,
    evaluation,
  };
}

export function formatObjectiveProgress(
  objective: BoardObjective,
  progress: ObjectiveProgress,
): string {
  switch (objective.kind) {
    case "league_place_max":
      return `#${progress.current}`;
    case "min_points":
      return `${progress.current} Pkt`;
    case "min_cash": {
      const millions = progress.current / 1_000_000;
      return `€ ${millions.toFixed(1)}M`;
    }
  }
}
