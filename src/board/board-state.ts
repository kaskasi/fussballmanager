import { NORDSTERN_ID, type TeamId } from "@fussballmanager/shared";

export type BoardObjectiveKind =
  | "league_place_max"
  | "min_points"
  | "min_cash"
  | "min_runway_weeks"
  | "avg_ca_min"
  | "goal_difference_min"
  | "project";

export type BoardProjectId =
  | "youth_camps"
  | "stadium_expand"
  | "medical_center"
  | "merch_revenue";

export interface BoardSeasonBaselines {
  avg_ca: number;
  merch_weekly_net?: number;
}

export interface BoardObjective {
  id: string;
  kind: BoardObjectiveKind;
  target: number;
  label: string;
  icon: string;
  mandatory?: boolean;
  projectId?: BoardProjectId;
}

export interface ObjectiveProgress {
  objectiveId: string;
  current: number;
  met: boolean;
}

export type BoardJobStatus = "employed" | "dismissed";

export interface SeasonObjectiveEvaluation {
  season: number;
  metIds: string[];
  failedIds: string[];
  bonusPaid: number;
  dismissed: boolean;
  summary: string;
}

export interface BoardState {
  employer_club_id: TeamId;
  objectives: BoardObjective[];
  pressure: number;
  job_status: BoardJobStatus;
  promotions_this_season: number;
  last_evaluation?: SeasonObjectiveEvaluation;
  season_baselines?: BoardSeasonBaselines;
  /** Season in which the board sent its in-season warning letter (PRD 23, mid-season sacking). */
  in_season_warning_season?: number;
}

export function defaultBoardState(employerClubId: TeamId = NORDSTERN_ID): BoardState {
  return {
    employer_club_id: employerClubId,
    objectives: [],
    pressure: 0,
    job_status: "employed",
    promotions_this_season: 0,
  };
}

export function normalizeBoardState(
  board?: BoardState,
  employerClubId: TeamId = NORDSTERN_ID,
): BoardState {
  if (!board) {
    return defaultBoardState(employerClubId);
  }
  return {
    ...defaultBoardState(employerClubId),
    ...board,
    employer_club_id: board.employer_club_id ?? employerClubId,
    objectives: board.objectives ?? [],
    pressure: Math.min(100, Math.max(0, board.pressure ?? 0)),
    job_status: board.job_status ?? "employed",
    promotions_this_season: board.promotions_this_season ?? 0,
  };
}
