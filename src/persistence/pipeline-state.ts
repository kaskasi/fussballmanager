import { createInitialTrainingPlan, type TrainingSlot } from "../development/training-units.ts";
import { createScoutBoard, type ScoutBoard } from "../scouting/scout-board.ts";
import { emptyTransferState, type TransferState } from "../transfers/negotiations.ts";
import { emptyInbox, type YouthInboxState } from "../youth/decision-inbox.ts";

/** Dynamic hub state stored in `state.json` (PRD 08). */
export interface PipelineState {
  training_plan: TrainingSlot[];
  scout_board: ScoutBoard;
  youth_inbox: YouthInboxState;
  transfer_state?: TransferState;
}

export function defaultPipelineState(week = 1): PipelineState {
  return {
    training_plan: createInitialTrainingPlan(),
    scout_board: createScoutBoard(),
    youth_inbox: emptyInbox(week),
    transfer_state: emptyTransferState(),
  };
}
