/** Prop bag for GameScreenRouter — assembled in App.tsx. */

import type { Dispatch, SetStateAction } from "react";
import type { SaveGame } from "../../persistence/savegame-model.ts";
import type { GameSession } from "../../persistence/game-session.ts";
import type { Player } from "../../types/player.ts";
import type { LeagueState } from "../../persistence/league-state.ts";
import type { ClubFinances } from "../../economy/club-finances.ts";
import type { BoardState } from "../../board/board-state.ts";
import type { YouthInboxState } from "../../youth/decision-inbox.ts";
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import type { ClubEvent } from "../../inbox/club-events.ts";
import type { StoryState } from "../../narrative/story-state.ts";
import type { YouthCamp } from "../../youth/satellite-camps.ts";
import type { TransferState } from "../../transfers/negotiations.ts";
import type { SeasonAwardsSnapshot } from "../../sim/season-awards.ts";
import type { SimulateUntil } from "../../sim/fast-forward-to-month.ts";
import type { CoachingStaff } from "../../staff/coaching-staff.ts";
import type { AssistantDelegation } from "../../staff/assistant-delegation.ts";
import type { WorldDivisionId, WorldState } from "../../world/world-generator.ts";
import type { ScoutNetworkState } from "../../scouting/scout-network.ts";
import type { AcademyFacility } from "../../youth/intake-generator.ts";
import type { ClubStadium } from "../../stadium/club-stadium.ts";
import type { MedicalStaff } from "../../staff/medical-staff.ts";
import type { ClubMedicalState } from "../../medical/diagnosis-queue.ts";
import type { OrthopedistHireState } from "../../medical/orthopedist-hire.ts";
import type { FinancingCareerState } from "../../economy/financing.ts";
import type { TrainingSlot } from "../../development/training-units.ts";
import type { TrainingPlanPresetSlot } from "../../development/training-plan-presets.ts";
import type { IndividualProgram } from "../../development/individual-training.ts";
import type { TrainingSlotOutcome } from "../../development/training-unit-result.ts";
import type { MarketFilters, MarketSort } from "../../scouting/market-list.ts";
import type { AccessibilityPreferences } from "../accessibility.ts";
import type { TeamId } from "@fussballmanager/shared";
import type { ScoutingActionHandlers } from "../actions/useScoutingActions.ts";
import type { StadiumActionHandlers } from "../actions/useStadiumActions.ts";
import type { MerchActionHandlers } from "../actions/useMerchActions.ts";
import type { TrainingActionHandlers } from "../actions/useTrainingActions.ts";
import type { MedicalActionHandlers } from "../actions/useMedicalActions.ts";
import type { YouthCampActionHandlers } from "../actions/useYouthCampActions.ts";
import type { Screen } from "./types.ts";
import type { ScoutingInitialTab } from "../screens/ScoutingCenter.tsx";
import type { YouthCampusSortState } from "../screens/YouthCampus.tsx";
import type { PersistedSession } from "../session/usePersistedGameSession.ts";
import type { DecisionAction } from "../../youth/decision-inbox.ts";
import type { CareerOrigin } from "../../narrative/story-state.ts";
import type { CampLeaderCandidate } from "../../youth/camp-leader-hire.ts";
import type { OrthopedistCandidate } from "../../medical/orthopedist-hire.ts";
import type { Coach } from "../../staff/coaching-staff.ts";
import type { MedicalMember } from "../../staff/medical-staff.ts";
import type { AssistantDelegationTask } from "../../staff/assistant-delegation.ts";
import type { CalendarMilestone } from "../calendar/calendar-milestones.ts";
import type { JobOffer } from "../../board/job-offers.ts";

/** Session slices + setters passed into GameScreenRouter. */
export interface GameScreenRouterCoreProps {
  screen: Screen;
  save: SaveGame;
  players: Player[];
  season: number;
  week: number;
  weekday: number;
  trainingPlan: TrainingSlot[];
  trainingPlanPresets: TrainingPlanPresetSlot[];
  trainingIntensity: number;
  individualPrograms: IndividualProgram[];
  league: LeagueState;
  finances: ClubFinances;
  board: BoardState;
  youthInbox: YouthInboxState;
  scoutBoard: ScoutBoard;
  clubEvents: ClubEvent[];
  storyState: StoryState;
  youthCamps: YouthCamp[];
  transferState: TransferState;
  lastSeasonAwards: SeasonAwardsSnapshot | undefined;
  coachingStaff: CoachingStaff;
  assistantDelegation: AssistantDelegation;
  masterSeed: number;
  rivalPlayers: Player[];
  world: WorldState;
  scoutNetwork: ScoutNetworkState;
  academyFacility: AcademyFacility;
  stadium: ClubStadium;
  medicalStaff: MedicalStaff;
  medicalState: ClubMedicalState;
  orthopedistHire: OrthopedistHireState;
  injuryRiskFactor: number;
  trainingUnitsCompleted: number;
  trainingUnitOutcomes: (TrainingSlotOutcome | null)[];
  financing: FinancingCareerState;
  marketFilters: MarketFilters;
  marketSort: MarketSort;
  postfachItemId: string | null;
  trainingFocusPlayerId: string | null;
  trainingAutoNext: boolean;
  campLeaderDismissCampId: string | null;
  campusTab: "u17" | "u19" | "camps";
  campusYouthSort: YouthCampusSortState;
  campusInitialTab: "u17" | "u19" | "camps" | null;
  scoutingInitialTab: ScoutingInitialTab | null;
  clubProfileId: TeamId | null;
  calendarMilestones: CalendarMilestone[];
  stadiumIsHomeMatchWeek: boolean;
  stadiumOpponentFanbase: number;
  playerDivisionId: WorldDivisionId;
  scoutCapacity: number;
  simulating: boolean;
  jobOffers: JobOffer[];
  accessibility: AccessibilityPreferences;
  activeSlot: number;
  loadSaveSlot: (slot: number) => void;
  applyImportedSave: (save: SaveGame, slot: number) => void;
  newGameInSlot: (slot: number) => void;
  applyCloudSave: (save: SaveGame, slot: number) => void;
  openMarketNegotiation: (playerId: string) => void;
  setScreen: (screen: Screen) => void;
  setScoutingInitialTab: (tab: ScoutingInitialTab | null) => void;
  setCampusInitialTab: (tab: "u17" | "u19" | "camps" | null) => void;
  setCampusTab: (tab: "u17" | "u19" | "camps") => void;
  setCampusYouthSort: (sort: YouthCampusSortState) => void;
  setTrainingFocusPlayerId: (id: string | null) => void;
  setTrainingAutoNext: (value: boolean) => void;
  setCampLeaderDismissCampId: (id: string | null) => void;
  setClubProfileId: (id: TeamId | null) => void;
  setProfileId: (id: string | null) => void;
  setForeignPlayerId: (id: string | null) => void;
  setMarketFilters: (filters: MarketFilters) => void;
  setMarketSort: (sort: MarketSort) => void;
  setAccessibility: Dispatch<SetStateAction<AccessibilityPreferences>>;
  openPostfach: (itemId?: string) => void;
  handleInboxDecision: (itemId: string, action: DecisionAction) => void;
  handleOpeningComplete: (
    origin: CareerOrigin,
    captainPlayerId: string,
    managerName: string,
  ) => void;
  handleToggleShortlist: (playerId: string) => void;
  handleRecallLoan: (playerId: string) => void;
  handleFastForwardToMonth: (targetMonthIndex: number) => Promise<void>;
  /** Header "Simulate until": next week / next month. Absent while a career match runs. */
  onSimulateUntil?: (kind: SimulateUntil) => void;
  handleAcceptJobOffer: (clubId: TeamId) => void;
}

export type GameScreenRouterProps = GameScreenRouterCoreProps &
  ScoutingActionHandlers &
  StadiumActionHandlers &
  MerchActionHandlers &
  TrainingActionHandlers &
  MedicalActionHandlers &
  YouthCampActionHandlers;
