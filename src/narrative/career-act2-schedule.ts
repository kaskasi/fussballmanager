/** Story Mode Act 2 unlock beats (PRD 19 unlock order, 19_story_choice_seeds) — data only. */

import type { CurtainUnlockId } from "./career-presentation.ts";
import type { StoryBeatSource } from "./story-state.ts";

export interface Act2ChoiceSpec {
  id: string;
  icon: string;
  /** Unlocks granted when this choice resolves. */
  unlocks: readonly CurtainUnlockId[];
  /** Unlock that arrives later instead (scheduled payoff). */
  delayed?: { unlock: CurtainUnlockId; weeks: number };
}

export interface Act2UnlockBeat {
  beatId: string;
  /** 1 = the week Act 2 started. */
  actWeek: number;
  source: StoryBeatSource;
  choices: readonly Act2ChoiceSpec[];
}

export const ACT2_UNLOCK_BEATS: readonly Act2UnlockBeat[] = [
  {
    beatId: "act2_chair_infra_vote",
    actWeek: 3,
    source: "board",
    choices: [
      { id: "roof", icon: "🏟️", unlocks: ["stadium", "finances_deep"] },
      { id: "hall", icon: "🏋️", unlocks: ["stadium", "finances_deep"] },
    ],
  },
  {
    beatId: "act2_scout_region_expand",
    actWeek: 7,
    source: "assistant",
    choices: [
      { id: "foerdekueste", icon: "🌊", unlocks: ["scouting_regions"] },
      { id: "hansestadt", icon: "⚓", unlocks: ["scouting_regions"] },
    ],
  },
  {
    beatId: "act2_asst_training_keys",
    actWeek: 11,
    source: "assistant",
    choices: [
      { id: "assistant", icon: "🤝", unlocks: [], delayed: { unlock: "manual_training", weeks: 2 } },
      { id: "manual", icon: "📋", unlocks: ["manual_training"] },
    ],
  },
  {
    beatId: "act2_salesman_analysis",
    actWeek: 15,
    source: "board",
    choices: [
      { id: "buy", icon: "💶", unlocks: ["opponent_scout"] },
      { id: "defer", icon: "⏳", unlocks: [], delayed: { unlock: "opponent_scout", weeks: 8 } },
    ],
  },
  {
    beatId: "act2_transfers_window",
    actWeek: 19,
    source: "board",
    choices: [{ id: "ok", icon: "✍️", unlocks: ["transfers"] }],
  },
];

/** One-off price of the video analysis module (salesman beat, choice "buy"). */
export const ACT2_ANALYSIS_MODULE_COST = 40_000;
