import type { TrainingSlot } from "../development/training-units.ts";
import type { ScoutBoard } from "../scouting/scout-board.ts";
import type { Player } from "../types/player.ts";
import { loadDemoRoster } from "../ui/demo-roster.ts";
import {
  emptyInbox,
  generateWeeklyInbox,
  normalizeYouthInbox,
  pruneYouthInbox,
  type YouthInboxState,
} from "../youth/decision-inbox.ts";
import { emptyClubEvents, type ClubEvent } from "../inbox/club-events.ts";
import { defaultClubFinances, type ClubFinances } from "../economy/club-finances.ts";
import { normalizeBoardState, type BoardState } from "../board/board-state.ts";
import { startBoardSeason } from "../board/season-objectives.ts";
import { defaultEmployerClubId } from "../board/job-offers.ts";
import type { MatchLineupState } from "../match/lineup-board.ts";
import { normalizeTacticsPresets, type TacticsPresetSlot } from "../match/tactics-presets.ts";
import { defaultClubStadium, normalizeClubStadium, type ClubStadium } from "../stadium/club-stadium.ts";
import { emptyTransferState, type TransferState } from "../transfers/negotiations.ts";

function normalizeTransferState(state?: TransferState): TransferState {
  const base = state ?? emptyTransferState();
  return {
    shortlist: base.shortlist ?? [],
    offers: base.offers ?? [],
    history: base.history ?? [],
    ai_budgets: base.ai_budgets ?? {},
  };
}
import { MONDAY } from "../sim/day-calendar.ts";
import { defaultLeagueState, normalizeLeagueState, type LeagueState } from "./league-state.ts";
import { defaultPipelineState, type PipelineState } from "./pipeline-state.ts";
import type { IndividualProgram } from "../development/individual-training.ts";
import { normalizeTrainingIntensity } from "../development/training-load.ts";
import { migrateLegacyTrainingPlan } from "../development/training-units.ts";
import { createSave, type SaveGame } from "./savegame-model.ts";
import { normalizeRivalPlayers } from "../sim/rival-growth.ts";

export const DEFAULT_SLOT = 1;
export const DEFAULT_CLUB_ID = "cl_fc_nordstern";
export const DEFAULT_MANAGER = "Jan";
export const DEFAULT_MASTER_SEED = 2026;

export interface GameSession {
  season: number;
  week: number;
  weekday: number;
  matchPlayedThisWeek: boolean;
  players: Player[];
  trainingPlan: TrainingSlot[];
  trainingIntensity: number;
  individualPrograms: IndividualProgram[];
  scoutBoard: ScoutBoard;
  youthInbox: YouthInboxState;
  league: LeagueState;
  transferState: TransferState;
  finances: ClubFinances;
  stadium: ClubStadium;
  tacticsPresets: TacticsPresetSlot[];
  matchLineup?: MatchLineupState;
  board: BoardState;
  clubEvents: ClubEvent[];
  rivalPlayers: Player[];
  clubId: string;
  managerName: string;
  masterSeed: number;
}

export function newGameSession(now = new Date()): GameSession {
  const save = createSave({
    nowIso: now.toISOString(),
    playerClubId: DEFAULT_CLUB_ID,
    managerName: DEFAULT_MANAGER,
    season: 1,
    week: 1,
    masterSeed: DEFAULT_MASTER_SEED,
    players: loadDemoRoster(),
  });
  return withFreshInbox(sessionFromSave(save));
}

function ensureBoardObjectives(board: BoardState, season: number): BoardState {
  if (board.objectives.length > 0 || board.job_status === "dismissed") return board;
  return startBoardSeason(board, board.employer_club_id, season);
}

export function withFreshInbox(session: GameSession): GameSession {
  if (session.youthInbox.items.length > 0) return session;
  return {
    ...session,
    youthInbox: generateWeeklyInbox(
      session.players,
      session.week,
      session.masterSeed,
      null,
      session.clubId,
    ),
  };
}

export function sessionFromSave(save: SaveGame): GameSession {
  const pipeline = save.state.pipeline ?? defaultPipelineState(save.state.week);
  return {
    season: save.state.season,
    week: save.state.week,
    weekday: save.state.weekday ?? MONDAY,
    matchPlayedThisWeek: save.state.match_played_this_week ?? false,
    players: save.players,
    trainingPlan: migrateLegacyTrainingPlan(pipeline.training_plan),
    trainingIntensity: normalizeTrainingIntensity(pipeline.training_intensity),
    individualPrograms: pipeline.individual_programs ?? [],
    scoutBoard: pipeline.scout_board,
    youthInbox: pruneYouthInbox(
      normalizeYouthInbox(pipeline.youth_inbox ?? emptyInbox(save.state.week)),
      save.players,
    ),
    league: normalizeLeagueState(save.state.league ?? defaultLeagueState()),
    transferState: normalizeTransferState(pipeline.transfer_state),
    finances: pipeline.club_finances ?? defaultClubFinances(),
    stadium: normalizeClubStadium(pipeline.club_stadium ?? defaultClubStadium()),
    tacticsPresets: normalizeTacticsPresets(pipeline.tactics_presets),
    matchLineup: pipeline.match_lineup,
    board: ensureBoardObjectives(
      normalizeBoardState(pipeline.board, defaultEmployerClubId()),
      save.state.season,
    ),
    clubEvents: pipeline.club_events ?? emptyClubEvents(),
    rivalPlayers: normalizeRivalPlayers(pipeline.rival_players, save.rng_state.master_seed),
    clubId: save.manifest.player_club_id,
    managerName: save.manifest.manager_name,
    masterSeed: save.rng_state.master_seed,
  };
}

export function saveFromSession(session: GameSession, base?: SaveGame, now = new Date()): SaveGame {
  const pipeline: PipelineState = {
    training_plan: session.trainingPlan,
    training_intensity: session.trainingIntensity,
    individual_programs: session.individualPrograms,
    scout_board: session.scoutBoard,
    youth_inbox: session.youthInbox,
    transfer_state: session.transferState,
    club_finances: session.finances,
    club_stadium: session.stadium,
    tactics_presets: session.tacticsPresets,
    match_lineup: session.matchLineup,
    board: session.board,
    club_events: session.clubEvents,
    rival_players: session.rivalPlayers,
  };
  const iso = now.toISOString();

  if (base) {
    return {
      ...base,
      manifest: {
        ...base.manifest,
        last_played: iso,
        current_week: { season: session.season, week: session.week },
      },
      state: {
        season: session.season,
        week: session.week,
        weekday: session.weekday,
        match_played_this_week: session.matchPlayedThisWeek,
        pipeline,
        league: session.league,
      },
      players: session.players,
      rng_state: {
        ...base.rng_state,
        master_seed: session.masterSeed,
      },
    };
  }

  const save = createSave({
    nowIso: iso,
    playerClubId: session.clubId,
    managerName: session.managerName,
    season: session.season,
    week: session.week,
    masterSeed: session.masterSeed,
    players: session.players,
  });
  return {
    ...save,
    manifest: {
      ...save.manifest,
      last_played: iso,
    },
    state: {
      season: session.season,
      week: session.week,
      weekday: session.weekday,
      match_played_this_week: session.matchPlayedThisWeek,
      pipeline,
      league: session.league,
    },
  };
}
