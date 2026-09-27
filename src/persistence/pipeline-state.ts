import { defaultBoardState, type BoardState } from "../board/board-state.ts";
import { startBoardSeason } from "../board/season-objectives.ts";
import { defaultEmployerClubId } from "../board/job-offers.ts";
import { createInitialTrainingPlan, type TrainingSlot } from "../development/training-units.ts";
import { defaultTacticsPresets, type TacticsPresetSlot } from "../match/tactics-presets.ts";
import { defaultClubFinances, type ClubFinances } from "../economy/club-finances.ts";
import { createScoutBoard, type ScoutBoard } from "../scouting/scout-board.ts";
import { defaultClubStadium, type ClubStadium } from "../stadium/club-stadium.ts";
import { emptyTransferState, type TransferState } from "../transfers/negotiations.ts";
import { emptyClubEvents, type ClubEvent } from "../inbox/club-events.ts";
import { emptyInbox, type YouthInboxState } from "../youth/decision-inbox.ts";

/** Dynamic hub state stored in `state.json` (PRD 08). */
export interface PipelineState {
  training_plan: TrainingSlot[];
  scout_board: ScoutBoard;
  youth_inbox: YouthInboxState;
  transfer_state?: TransferState;
  club_finances?: ClubFinances;
  club_stadium?: ClubStadium;
  club_events?: ClubEvent[];
  /** F1.2 — three saved match tactic presets. */
  tactics_presets?: TacticsPresetSlot[];
  /** F9.1 / F9.2 — board objectives and job status. */
  board?: BoardState;
}

export function defaultPipelineState(week = 1): PipelineState {
  return {
    training_plan: createInitialTrainingPlan(),
    scout_board: createScoutBoard(),
    youth_inbox: emptyInbox(week),
    transfer_state: emptyTransferState(),
    club_finances: defaultClubFinances(),
    club_stadium: defaultClubStadium(),
    club_events: emptyClubEvents(),
    tactics_presets: defaultTacticsPresets(),
    board: startBoardSeason(defaultBoardState(defaultEmployerClubId()), defaultEmployerClubId(), 1),
  };
}
