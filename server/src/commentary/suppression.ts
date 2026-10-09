import { BEAT_PRIORITY, type BroadcastBeatId } from "./beats.ts";
import { isMomentBeat } from "./moment-copy.ts";

/** P0 + shots + cards + match structure + penalty restart. */
const PBP_BEATS: ReadonlySet<BroadcastBeatId> = new Set([
  "match_opening",
  "second_half_open",
  "half_time",
  "full_time",
  "shot_taken",
  "shot_goal",
  "shot_saved",
  "shot_wide",
  "shot_woodwork",
  "shot_blocked",
  "card_red",
  "card_yellow",
  "restart_penalty",
  "injury",
  "substitution",
]);

/**
 * PRD 16 B3c — sparse PBP; routine open play stays on the pitch only.
 */
export function shouldEmitPlayByPlay(beat: BroadcastBeatId): boolean {
  return PBP_BEATS.has(beat);
}

export function shouldEmitMoment(beat: BroadcastBeatId): boolean {
  return isMomentBeat(beat);
}
