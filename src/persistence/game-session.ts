import type { TrainingSlotOutcome } from "../development/training-unit-result.ts";
import type { TrainingSlot } from "../development/training-units.ts";
import {
  createScoutBoard,
  reconcileScoutBoard,
  type ScoutBoard,
} from "../scouting/scout-board.ts";
import { worldCareerClubId } from "../world/world-generator.ts";
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
import { defaultBoardState, normalizeBoardState, type BoardState } from "../board/board-state.ts";
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
    negotiations: base.negotiations ?? [],
    ai_budgets: base.ai_budgets ?? {},
    pending_transfers: base.pending_transfers ?? [],
    pending_purchases: base.pending_purchases ?? [],
    inbound_offers: base.inbound_offers ?? [],
  };
}
import { MONDAY } from "../sim/day-calendar.ts";
import { CAREER_START_WEEK } from "../sim/game-calendar.ts";
import { defaultLeagueState, normalizeLeagueState, type LeagueState } from "./league-state.ts";
import { defaultPipelineState, type PipelineState } from "./pipeline-state.ts";
import type { IndividualProgram } from "../development/individual-training.ts";
import { normalizeTrainingIntensity } from "../development/training-load.ts";
import {
  normalizeTrainingPlanPresets,
  type TrainingPlanPresetSlot,
} from "../development/training-plan-presets.ts";
import { createInitialTrainingPlan, migrateLegacyTrainingPlan } from "../development/training-units.ts";
import { createSave, type SaveGame } from "./savegame-model.ts";
import {
  defaultCoachingStaff,
  normalizeCoachingStaff,
  type CoachingStaff,
} from "../staff/coaching-staff.ts";
import {
  defaultMedicalStaff,
  normalizeMedicalStaff,
  type MedicalStaff,
} from "../staff/medical-staff.ts";
import {
  defaultClubMedicalState,
  normalizeClubMedicalState,
  type ClubMedicalState,
} from "../medical/diagnosis-queue.ts";
import {
  defaultOrthopedistHireState,
  type OrthopedistHireState,
} from "../medical/orthopedist-hire.ts";
import { normalizeRivalPlayers } from "../sim/rival-growth.ts";
import { switchManagerClub } from "../board/manager-club-switch.ts";
import type { SeasonAwardsSnapshot } from "../sim/season-awards.ts";
import {
  generateWorld,
  legacyWorldState,
  NORDSTERN_CLUB_ID,
  persistedWorldState,
  type WorldState,
} from "../world/world-generator.ts";
import {
  act1AssistantTrainingPlan,
  resolveFeatureCurtain,
} from "../narrative/career-presentation.ts";
import { isTrainingPlanNeglected } from "../development/training-neglect.ts";
import { normalizeStoryState, type StoryState } from "../narrative/story-state.ts";
import { boardWithSurvivalArc, initializeStoryForNewGame } from "../narrative/opening.ts";
import {
  normalizeAssistantDelegation,
  type AssistantDelegation,
} from "../staff/assistant-delegation.ts";
import {
  normalizeScoutNetwork,
  type ScoutNetworkState,
} from "../scouting/scout-network.ts";
import type { AcademyFacility } from "../youth/intake-generator.ts";
import { normalizeYouthCamps, type YouthCamp } from "../youth/satellite-camps.ts";
import {
  defaultFinancingState,
  normalizeFinancingState,
  type FinancingCareerState,
} from "../economy/financing.ts";

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
  trainingPlanPresets: TrainingPlanPresetSlot[];
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
  coachingStaff: CoachingStaff;
  clubId: string;
  managerName: string;
  masterSeed: number;
  world: WorldState;
  lastSeasonAwards?: SeasonAwardsSnapshot;
  storyState: StoryState;
  assistantDelegation: AssistantDelegation;
  scoutNetwork: ScoutNetworkState;
  academyFacility: AcademyFacility;
  youthCamps: YouthCamp[];
  /** Set when training reminder Postfach item was shown/dismissed this game week. */
  trainingReminderWeek?: { season: number; week: number };
  kickerConsumedWeek?: { season: number; week: number };
  kickerEdition?: import("../media/kicker-digest.ts").KickerEdition | null;
  kickerEditionArchive: import("../media/kicker-digest.ts").KickerEdition[];
  /** Mo–Fr units completed via header NEXT this game week (0–15). */
  trainingUnitsCompleted: number;
  /** Manual training: false at week start until one calendar NEXT (opponent scout). */
  trainingCalendarGateDone: boolean;
  /** Highlights per completed training slot this game week. */
  trainingUnitOutcomes: (TrainingSlotOutcome | null)[];
  /** F6.6 — bank loan + story financing state. */
  financing: FinancingCareerState;
  medicalStaff: MedicalStaff;
  medicalState: ClubMedicalState;
  orthopedistHire: OrthopedistHireState;
}

export function newGameSession(now = new Date()): GameSession {
  const world = generateWorld(DEFAULT_MASTER_SEED);
  const academy = loadDemoRoster().filter((player) => player.squad_status !== "pro");
  const save = createSave({
    nowIso: now.toISOString(),
    playerClubId: DEFAULT_CLUB_ID,
    managerName: DEFAULT_MANAGER,
    season: 1,
    week: CAREER_START_WEEK,
    masterSeed: DEFAULT_MASTER_SEED,
    players: [
      ...world.players.filter((player) => player.club_id === NORDSTERN_CLUB_ID),
      ...academy,
    ],
  });
  save.state.world = persistedWorldState(world);
  const rivalPlayers = world.players.filter(
    (player) => player.club_id !== NORDSTERN_CLUB_ID,
  );
  if (save.state.pipeline) {
    save.state.pipeline.rival_players = rivalPlayers;
    const playerClub =
      world.clubs.find((club) => worldCareerClubId(club.id) === NORDSTERN_CLUB_ID) ??
      world.clubs.find((club) => club.id === NORDSTERN_CLUB_ID) ??
      null;
    save.state.pipeline.scout_board = createScoutBoard(rivalPlayers, playerClub);
    save.state.pipeline.story_state = initializeStoryForNewGame(
      DEFAULT_MASTER_SEED,
      DEFAULT_MANAGER,
      1,
    );
    save.state.pipeline.board = boardWithSurvivalArc(
      save.state.pipeline.board ?? startBoardSeason(defaultBoardState(defaultEmployerClubId()), defaultEmployerClubId(), 1),
      1,
    );
  }
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

function syncManagerClubWithBoard(session: GameSession): GameSession {
  if (
    session.board.job_status === "employed" &&
    session.board.employer_club_id !== session.league.player_club_id
  ) {
    return switchManagerClub(session, session.board.employer_club_id);
  }
  return session;
}

function isAssistantDefaultTrainingPlan(plan: readonly TrainingSlot[]): boolean {
  const assistant = act1AssistantTrainingPlan();
  if (plan.length !== assistant.length) return false;
  return plan.every(
    (slot, index) =>
      slot.unitId === assistant[index]?.unitId && slot.focus === false,
  );
}

function resolveTrainingCalendarGateDone(
  pipeline: PipelineState,
  storyState: StoryState,
): boolean {
  const autoTraining = resolveFeatureCurtain(storyState).auto_training;
  if (pipeline.training_calendar_gate_done !== undefined) {
    return pipeline.training_calendar_gate_done;
  }
  return autoTraining;
}

export function sessionFromSave(save: SaveGame): GameSession {
  const pipeline = save.state.pipeline ?? defaultPipelineState(save.state.week);
  const rivalPlayers = normalizeRivalPlayers(
    pipeline.rival_players,
    save.rng_state.master_seed,
  );
  const session: GameSession = {
    season: save.state.season,
    week: save.state.week,
    weekday: save.state.weekday ?? MONDAY,
    matchPlayedThisWeek: save.state.match_played_this_week ?? false,
    players: save.players,
    trainingPlan: (() => {
      const storyState = normalizeStoryState(pipeline.story_state, save.state.week);
      const manual = !resolveFeatureCurtain(storyState).auto_training;
      let plan = migrateLegacyTrainingPlan(pipeline.training_plan);
      if (manual && isAssistantDefaultTrainingPlan(plan)) {
        plan = createInitialTrainingPlan();
      } else if (
        !manual &&
        isTrainingPlanNeglected(plan)
      ) {
        return act1AssistantTrainingPlan();
      }
      return plan;
    })(),
    trainingPlanPresets: normalizeTrainingPlanPresets(pipeline.training_plan_presets),
    trainingIntensity: normalizeTrainingIntensity(pipeline.training_intensity),
    individualPrograms: pipeline.individual_programs ?? [],
    scoutBoard: reconcileScoutBoard(pipeline.scout_board, rivalPlayers),
    youthInbox: pruneYouthInbox(
      normalizeYouthInbox(pipeline.youth_inbox ?? emptyInbox(save.state.week)),
      save.players,
    ),
    league: normalizeLeagueState(
      save.state.league ?? defaultLeagueState(),
      save.rng_state.master_seed,
    ),
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
    rivalPlayers,
    coachingStaff: normalizeCoachingStaff(pipeline.coaching_staff, save.state.season),
    clubId: save.manifest.player_club_id,
    managerName: save.manifest.manager_name,
    masterSeed: save.rng_state.master_seed,
    world: save.state.world ?? legacyWorldState(save.rng_state.master_seed),
    lastSeasonAwards: pipeline.last_season_awards,
    storyState: normalizeStoryState(pipeline.story_state, save.state.week),
    assistantDelegation: normalizeAssistantDelegation(pipeline.assistant_delegation),
    scoutNetwork: normalizeScoutNetwork(
      pipeline.scout_network,
      save.state.season,
      save.rng_state.master_seed,
    ),
    academyFacility: pipeline.academy_facility ?? "academy_basic",
    youthCamps: normalizeYouthCamps(pipeline.youth_camps),
    trainingReminderWeek: pipeline.training_reminder_week,
    kickerConsumedWeek: pipeline.kicker_consumed_week,
    kickerEdition: pipeline.kicker_edition ?? null,
    kickerEditionArchive: pipeline.kicker_edition_archive ?? [],
    trainingUnitsCompleted: pipeline.training_units_completed ?? 0,
    trainingCalendarGateDone: resolveTrainingCalendarGateDone(
      pipeline,
      normalizeStoryState(pipeline.story_state, save.state.week),
    ),
    trainingUnitOutcomes: pipeline.training_unit_outcomes ?? [],
    financing: normalizeFinancingState(pipeline.financing ?? defaultFinancingState()),
    medicalStaff: normalizeMedicalStaff(pipeline.medical_staff),
    medicalState: normalizeClubMedicalState(pipeline.medical_state),
    orthopedistHire: pipeline.orthopedist_hire ?? defaultOrthopedistHireState(),
  };
  return syncManagerClubWithBoard(session);
}

export function saveFromSession(session: GameSession, base?: SaveGame, now = new Date()): SaveGame {
  const pipeline: PipelineState = {
    training_plan: session.trainingPlan,
    training_plan_presets: session.trainingPlanPresets,
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
    coaching_staff: session.coachingStaff,
    last_season_awards: session.lastSeasonAwards,
    story_state: session.storyState,
    assistant_delegation: session.assistantDelegation,
    scout_network: session.scoutNetwork,
    academy_facility: session.academyFacility,
    youth_camps: session.youthCamps,
    training_reminder_week: session.trainingReminderWeek,
    kicker_consumed_week: session.kickerConsumedWeek,
    kicker_edition: session.kickerEdition ?? null,
    kicker_edition_archive: session.kickerEditionArchive,
    training_units_completed: session.trainingUnitsCompleted,
    training_calendar_gate_done: session.trainingCalendarGateDone,
    training_unit_outcomes: session.trainingUnitOutcomes,
    financing: session.financing,
    medical_staff: session.medicalStaff,
    medical_state: session.medicalState,
    orthopedist_hire: session.orthopedistHire,
  };
  const iso = now.toISOString();

  if (base) {
    return {
      ...base,
      manifest: {
        ...base.manifest,
        player_club_id: session.clubId,
        manager_name: session.managerName,
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
        world: session.world,
      },
      players: session.players,
      chronicle: session.storyState.chronicle_entries,
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
      world: session.world,
    },
  };
}
