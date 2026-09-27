import { NORDSTERN_ID, type TeamId } from "@fussballmanager/shared";

export type BoardObjectiveKind = "league_place_max" | "min_points" | "min_cash";

export interface BoardObjective {
  id: string;
  kind: BoardObjectiveKind;
  target: number;
  label: string;
  icon: string;
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
