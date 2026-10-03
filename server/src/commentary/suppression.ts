import { BEAT_PRIORITY, type BroadcastBeatId } from "./beats.ts";

/**
 * PRD 16 P3 (pass_complete, carry, duel, …): no play-by-play — engine/HUD only.
 * P0–P2 always speak; color macros attach to those lines in the director.
 */
export function shouldEmitPlayByPlay(beat: BroadcastBeatId): boolean {
  return BEAT_PRIORITY[beat] <= 2;
}
