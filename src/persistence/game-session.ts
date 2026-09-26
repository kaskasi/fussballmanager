import type { TrainingSlot } from "../development/training-units.ts";
import type { ScoutBoard } from "../scouting/scout-board.ts";
import type { Player } from "../types/player.ts";
import { loadDemoRoster } from "../ui/demo-roster.ts";
import { emptyInbox, generateWeeklyInbox, type YouthInboxState } from "../youth/decision-inbox.ts";
import { defaultClubFinances, type ClubFinances } from "../economy/club-finances.ts";
import { emptyTransferState, type TransferState } from "../transfers/negotiations.ts";
import { defaultLeagueState, type LeagueState } from "./league-state.ts";
import { defaultPipelineState, type PipelineState } from "./pipeline-state.ts";
import { createSave, type SaveGame } from "./savegame-model.ts";

export const DEFAULT_SLOT = 1;
export const DEFAULT_CLUB_ID = "cl_fc_nordstern";
export const DEFAULT_MANAGER = "Jan";
export const DEFAULT_MASTER_SEED = 2026;

export interface GameSession {
  season: number;
  week: number;
  players: Player[];
  trainingPlan: TrainingSlot[];
  scoutBoard: ScoutBoard;
  youthInbox: YouthInboxState;
  league: LeagueState;
  transferState: TransferState;
  finances: ClubFinances;
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

export function withFreshInbox(session: GameSession): GameSession {
  if (session.youthInbox.items.length > 0) return session;
  return {
    ...session,
    youthInbox: generateWeeklyInbox(session.players, session.week, session.masterSeed),
  };
}

export function sessionFromSave(save: SaveGame): GameSession {
  const pipeline = save.state.pipeline ?? defaultPipelineState(save.state.week);
  return {
    season: save.state.season,
    week: save.state.week,
    players: save.players,
    trainingPlan: pipeline.training_plan,
    scoutBoard: pipeline.scout_board,
    youthInbox: pipeline.youth_inbox ?? emptyInbox(save.state.week),
    league: save.state.league ?? defaultLeagueState(),
    transferState: pipeline.transfer_state ?? emptyTransferState(),
    finances: pipeline.club_finances ?? defaultClubFinances(),
    clubId: save.manifest.player_club_id,
    managerName: save.manifest.manager_name,
    masterSeed: save.rng_state.master_seed,
  };
}

export function saveFromSession(session: GameSession, base?: SaveGame, now = new Date()): SaveGame {
  const pipeline: PipelineState = {
    training_plan: session.trainingPlan,
    scout_board: session.scoutBoard,
    youth_inbox: session.youthInbox,
    transfer_state: session.transferState,
    club_finances: session.finances,
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
      pipeline,
      league: session.league,
    },
  };
}
