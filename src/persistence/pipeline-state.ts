import { defaultBoardState, type BoardState } from "../board/board-state.ts";
import { startBoardSeason } from "../board/season-objectives.ts";
import { defaultEmployerClubId } from "../board/job-offers.ts";
import type { IndividualProgram } from "../development/individual-training.ts";
import type { TrainingSlotOutcome } from "../development/training-unit-result.ts";
import {
  defaultTrainingPlanPresets,
  type TrainingPlanPresetSlot,
} from "../development/training-plan-presets.ts";
import { createInitialTrainingPlan, type TrainingSlot } from "../development/training-units.ts";
import type { MatchLineupState } from "../match/lineup-board.ts";
import { defaultTacticsPresets, type TacticsPresetSlot } from "../match/tactics-presets.ts";
import { defaultClubFinances, type ClubFinances } from "../economy/club-finances.ts";
import { createScoutBoard, type ScoutBoard } from "../scouting/scout-board.ts";
import { defaultClubStadium, type ClubStadium } from "../stadium/club-stadium.ts";
import { emptyTransferState, type TransferState } from "../transfers/negotiations.ts";
import { emptyClubEvents, type ClubEvent } from "../inbox/club-events.ts";
import { emptyInbox, type YouthInboxState } from "../youth/decision-inbox.ts";
import type { CoachingStaff } from "../staff/coaching-staff.ts";
import type { AcademyFacility } from "../youth/intake-generator.ts";
import type { YouthCamp } from "../youth/satellite-camps.ts";
import type { Player } from "../types/player.ts";
import type { SeasonAwardsSnapshot } from "../sim/season-awards.ts";
import { defaultStoryState, type StoryState } from "../narrative/story-state.ts";
import {
  DEFAULT_ASSISTANT_DELEGATION,
  type AssistantDelegation,
} from "../staff/assistant-delegation.ts";
import type { ScoutNetworkState } from "../scouting/scout-network.ts";
import type { MedicalStaff } from "../staff/medical-staff.ts";
import type { ClubMedicalState } from "../medical/diagnosis-queue.ts";
import type { OrthopedistHireState } from "../medical/orthopedist-hire.ts";
import {
  defaultFinancingState,
  normalizeFinancingState,
  type FinancingCareerState,
} from "../economy/financing.ts";

/** Dynamic hub state stored in `state.json` (PRD 08). */
export interface PipelineState {
  training_plan: TrainingSlot[];
  /** F2.1 — three named weekly plan templates. */
  training_plan_presets?: TrainingPlanPresetSlot[];
  /** F2.1 — weekly intensity (80–130, default 100). */
  training_intensity?: number;
  /** F2.3 — individual extra programs per player. */
  individual_programs?: IndividualProgram[];
  scout_board: ScoutBoard;
  youth_inbox: YouthInboxState;
  transfer_state?: TransferState;
  club_finances?: ClubFinances;
  club_stadium?: ClubStadium;
  club_events?: ClubEvent[];
  /** F1.2 — three saved match tactic presets. */
  tactics_presets?: TacticsPresetSlot[];
  /** F1.1 — last matchday lineup (formation, slots, tactics plan). */
  match_lineup?: MatchLineupState;
  /** F9.1 / F9.2 — board objectives and job status. */
  board?: BoardState;
  /** F10.4 — rival clubs using the career growth engine. */
  rival_players?: Player[];
  /** F8.1 — attack/defense/fitness coaches. */
  coaching_staff?: CoachingStaff;
  /** F3.7 — HQ academy stage. */
  academy_facility?: AcademyFacility;
  /** F3.9 — owned satellite camps. */
  youth_camps?: YouthCamp[];
  /** F11.2 — last completed season award gallery. */
  last_season_awards?: SeasonAwardsSnapshot;
  /** PRD 13 — relegation narrative slice state. */
  story_state?: StoryState;
  /** F8.5 — per-task assistant auto-delegation. */
  assistant_delegation?: AssistantDelegation;
  /** Assistenten-Training-Erinnerung — höchstens ein Blocker pro Spielwoche. */
  training_reminder_week?: { season: number; week: number };
  /** Dienstags-Kicker gelesen / dismissed diese Spielwoche. */
  kicker_consumed_week?: { season: number; week: number };
  /** Snapshot für Postfach-Kicker (Liga-Ticker der Woche). */
  kicker_edition?: import("../media/kicker-digest.ts").KickerEdition | null;
  /** Gelesene «Der Treter»-Ausgaben (Snapshot, wieder öffnen im Archiv). */
  kicker_edition_archive?: import("../media/kicker-digest.ts").KickerEdition[];
  /** F2.1 — training units completed via NEXT this week (PRD 09.3 training nexus). */
  training_units_completed?: number;
  /** Per-slot unit results for the current game week (manual training NEXT). */
  training_unit_outcomes?: (TrainingSlotOutcome | null)[];
  /** Manual week: false until player acknowledges calendar / opponent scout once. */
  training_calendar_gate_done?: boolean;
  /** F4.3 — hired scout tiers and capacity. */
  scout_network?: ScoutNetworkState;
  /** F6.6 — bank + story financing caps (PRD 11.12). */
  financing?: FinancingCareerState;
  /** F8.2 — medical staff. */
  medical_staff?: MedicalStaff;
  /** F8.2 — diagnosis queue + rehab minigame tracking. */
  medical_state?: ClubMedicalState;
  /** F8.2 — orthopedist story hire. */
  orthopedist_hire?: OrthopedistHireState;
}

export function defaultPipelineState(week = 1): PipelineState {
  return {
    training_plan: createInitialTrainingPlan(),
    training_plan_presets: defaultTrainingPlanPresets(),
    scout_board: createScoutBoard(),
    youth_inbox: emptyInbox(week),
    transfer_state: emptyTransferState(),
    club_finances: defaultClubFinances(),
    club_stadium: defaultClubStadium(),
    club_events: emptyClubEvents(),
    tactics_presets: defaultTacticsPresets(),
    board: startBoardSeason(defaultBoardState(defaultEmployerClubId()), defaultEmployerClubId(), 1),
    story_state: defaultStoryState(week),
    financing: defaultFinancingState(),
  };
}
