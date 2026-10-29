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
    listings: base.listings ?? [],
    scheduled_transfers: base.scheduled_transfers ?? [],
  };
}
import { MONDAY } from "../sim/day-calendar.ts";
import { CAREER_START_WEEK } from "../sim/game-calendar.ts";
import { applyOpeningTransferMarket } from "../transfers/opening-transfer-market.ts";
import { refreshAiListings } from "../transfers/transfer-listings.ts";
import { defaultLeagueState, normalizeLeagueState, type LeagueState } from "./league-state.ts";
import { defaultPipelineState, type PipelineState } from "./pipeline-state.ts";
import type {
  IndividualProgram,
  IndividualProgramResult,
} from "../development/individual-training.ts";
import { normalizeTrainingIntensity } from "../development/training-load.ts";
import {
  normalizeTrainingPlanPresets,
  type TrainingPlanPresetSlot,
} from "../development/training-plan-presets.ts";
import { migrateLegacyTrainingPlan } from "../development/training-units.ts";
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
  NORDSTERN_TEAM_ID,
  persistedWorldState,
  WORLD_CLUB_SEED,
  type WorldState,
} from "../world/world-generator.ts";
import { seedYouthSquad } from "../board/club-pipeline-reset.ts";
import {
  act1AssistantTrainingPlan,
  resolveFeatureCurtain,
} from "../narrative/career-presentation.ts";
import { isTrainingPlanNeglected } from "../development/training-neglect.ts";
import { normalizeStoryState, type StoryState } from "../narrative/story-state.ts";
import type { ProductGameMode } from "../narrative/game-mode.ts";
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
import { refreshAllMarketValues } from "../transfers/refresh-market-values.ts";

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
  individualHistory: IndividualProgramResult[];
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
  /** PRD 06 — Liga-Spieler Breakout-Texte der laufenden Woche (Treter/Scout). */
  rivalBreakoutNarratives: import("../development/breakouts.ts").BreakoutNarrative[];
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
  academyProject?: import("../sim/advance-construction.ts").AcademyProject | null;
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

export interface NewGameOptions {
  /** PRD 24 — default Regionalliga Manager. */
  mode?: ProductGameMode;
  /** False shows the new-game mode card before the opening (UI default). */
  modeConfirmed?: boolean;
  /** Roster seed — squads, talents, youth, story cast. Default {@link DEFAULT_MASTER_SEED}. */
  seed?: number;
}

/** A fresh roster seed for a new UI career (the club layer stays fixed). */
export function randomCareerSeed(random: () => number = Math.random): number {
  return 1 + Math.floor(random() * 2_000_000_000);
}

/** A new player career from the UI — every one gets its own roster seed. */
export function newCareerSession(now = new Date()): GameSession {
  return newGameSession(now, { seed: randomCareerSeed() });
}

export function newGameSession(now = new Date(), options: NewGameOptions = {}): GameSession {
  const mode = options.mode ?? "regionalliga_manager";
  const seed = options.seed ?? DEFAULT_MASTER_SEED;
  const world = generateWorld(seed, WORLD_CLUB_SEED);
  const pros = world.players.filter((player) => player.club_id === NORDSTERN_CLUB_ID);
  // The default seed keeps the curated demo academy (tests, calibration, scripts).
  const academy =
    seed === DEFAULT_MASTER_SEED
      ? loadDemoRoster().filter((player) => player.squad_status !== "pro")
      : seedYouthSquad(NORDSTERN_TEAM_ID, { season: 1, masterSeed: seed, players: pros });
  const save = createSave({
    nowIso: now.toISOString(),
    playerClubId: DEFAULT_CLUB_ID,
    managerName: DEFAULT_MANAGER,
    season: 1,
    week: CAREER_START_WEEK,
    masterSeed: seed,
    players: [...pros, ...academy],
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
    save.state.pipeline.story_state = {
      ...initializeStoryForNewGame(seed, DEFAULT_MANAGER, 1, mode),
      game_mode_confirmed: options.modeConfirmed ?? options.mode !== undefined,
    };
    save.state.pipeline.board = boardWithSurvivalArc(
      save.state.pipeline.board ??
        startBoardSeason(
          defaultBoardState(defaultEmployerClubId()),
          defaultEmployerClubId(),
          1,
          defaultLeagueState(),
        ),
      1,
    );
  }
  const session = applyOpeningTransferMarket(withFreshInbox(sessionFromSave(save)));
  // Fill the rest of the rival board now, not only after the first week tick.
  return {
    ...session,
    transferState: refreshAiListings({
      state: session.transferState,
      players: [...session.players, ...session.rivalPlayers],
      userClubId: session.clubId,
      season: session.season,
      week: session.week,
      masterSeed: session.masterSeed,
      leagueClubIds: session.league.club_ids,
    }),
  };
}

function ensureBoardObjectives(session: GameSession): BoardState {
  const board = session.board;
  if (board.objectives.length > 0 || board.job_status === "dismissed") return board;
  return startBoardSeason(
    board,
    board.employer_club_id,
    session.season,
    session.league,
    session,
  );
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
    return switchManagerClub(session, session.board.employer_club_id, { resetPipeline: false });
  }
  return session;
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

export interface SessionFromSaveOptions {
  /** Default true. Set false inside patchSession to avoid rewrite loops. */
  refreshMarketValues?: boolean;
}

export function sessionFromSave(save: SaveGame, options?: SessionFromSaveOptions): GameSession {
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
    players:
      options?.refreshMarketValues === false
        ? save.players
        : refreshAllMarketValues(save.players, save.state.season),
    trainingPlan: (() => {
      const storyState = normalizeStoryState(pipeline.story_state, save.state.week);
      const manual = !resolveFeatureCurtain(storyState).auto_training;
      const plan = migrateLegacyTrainingPlan(pipeline.training_plan);
      // Assistant-run weeks (Story Mode Act 1/2) never start from an empty plan. After the
      // manual-training unlock the assistant's plan stays as an editable starting point.
      if (!manual && isTrainingPlanNeglected(plan)) return act1AssistantTrainingPlan();
      return plan;
    })(),
    trainingPlanPresets: normalizeTrainingPlanPresets(pipeline.training_plan_presets),
    trainingIntensity: normalizeTrainingIntensity(pipeline.training_intensity),
    individualPrograms: pipeline.individual_programs ?? [],
    individualHistory: pipeline.individual_history ?? [],
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
    board: normalizeBoardState(pipeline.board, defaultEmployerClubId()),
    clubEvents: pipeline.club_events ?? emptyClubEvents(),
    rivalPlayers,
    rivalBreakoutNarratives: pipeline.rival_breakout_narratives ?? [],
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
    academyProject: pipeline.academy_project ?? null,
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
  const withBoard = { ...session, board: ensureBoardObjectives(session) };
  return syncManagerClubWithBoard(withBoard);
}

export function saveFromSession(session: GameSession, base?: SaveGame, now = new Date()): SaveGame {
  const pipeline: PipelineState = {
    training_plan: session.trainingPlan,
    training_plan_presets: session.trainingPlanPresets,
    training_intensity: session.trainingIntensity,
    individual_programs: session.individualPrograms,
    individual_history: session.individualHistory,
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
    rival_breakout_narratives: session.rivalBreakoutNarratives,
    coaching_staff: session.coachingStaff,
    last_season_awards: session.lastSeasonAwards,
    story_state: session.storyState,
    assistant_delegation: session.assistantDelegation,
    scout_network: session.scoutNetwork,
    academy_facility: session.academyFacility,
    academy_project: session.academyProject ?? null,
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
