import type { KickoffEvent, MatchEvent, ShotOutcome } from "@fussballmanager/shared";
import { isCommentaryWorthy } from "./render.ts";

/** PRD 16 beat taxonomy — wrapper layer only. */
export type BroadcastBeatId =
  | "match_opening"
  | "second_half_open"
  | "half_time"
  | "full_time"
  | "restart_throw_in"
  | "restart_corner"
  | "restart_free_kick"
  | "restart_penalty"
  | "restart_goal_kick"
  | "restart_kickoff"
  | "pass_complete"
  | "pass_key"
  | "pass_incomplete"
  | "carry_progress"
  | "duel_won"
  | "turnover"
  | "shot_taken"
  | "shot_goal"
  | "shot_saved"
  | "shot_wide"
  | "shot_woodwork"
  | "shot_blocked"
  | "foul"
  | "card_yellow"
  | "card_red"
  | "offside"
  | "injury"
  | "substitution";

export const BEAT_PRIORITY: Record<BroadcastBeatId, 0 | 1 | 2 | 3> = {
  match_opening: 0,
  second_half_open: 0,
  half_time: 0,
  full_time: 0,
  shot_goal: 0,
  card_red: 0,
  restart_penalty: 0,
  restart_throw_in: 3,
  restart_corner: 3,
  restart_free_kick: 3,
  restart_goal_kick: 3,
  restart_kickoff: 3,
  shot_taken: 1,
  shot_saved: 1,
  shot_wide: 1,
  shot_woodwork: 1,
  shot_blocked: 1,
  card_yellow: 1,
  injury: 1,
  pass_key: 3,
  foul: 3,
  offside: 3,
  substitution: 1,
  turnover: 3,
  pass_complete: 3,
  pass_incomplete: 3,
  carry_progress: 3,
  duel_won: 3,
};

function openingKickoff(event: KickoffEvent): boolean {
  return (
    event.clock.period === "first_half" &&
    event.clock.minute === 0 &&
    event.clock.stoppageMinute === 0 &&
    event.clock.second <= 5
  );
}

function secondHalfKickoff(event: KickoffEvent): boolean {
  return (
    event.clock.period === "second_half" &&
    event.clock.minute === 45 &&
    event.clock.stoppageMinute === 0 &&
    event.clock.second <= 5
  );
}

function shotBeat(outcome: ShotOutcome): BroadcastBeatId {
  switch (outcome) {
    case "goal":
      return "shot_goal";
    case "save":
      return "shot_saved";
    case "wide":
      return "shot_wide";
    case "woodwork":
      return "shot_woodwork";
    case "block":
      return "shot_blocked";
    default:
      return "shot_taken";
  }
}

function foulBeat(card?: "yellow" | "second_yellow" | "red"): BroadcastBeatId {
  if (card === "red" || card === "second_yellow") {
    return "card_red";
  }
  if (card === "yellow") {
    return "card_yellow";
  }
  return "foul";
}

/** Classify one engine tick into a beat id (independent of text-feed filter). */
export function classifyBeat(event: MatchEvent): BroadcastBeatId {
  switch (event.type) {
    case "kickoff":
      if (openingKickoff(event)) {
        return "match_opening";
      }
      if (secondHalfKickoff(event)) {
        return "second_half_open";
      }
      return "restart_kickoff";
    case "pass":
      if (!event.complete) {
        return "pass_incomplete";
      }
      if (
        event.kind === "cross" ||
        event.kind === "through" ||
        event.kind === "switch"
      ) {
        return "pass_key";
      }
      return "pass_complete";
    case "carry":
      return "carry_progress";
    case "duel":
      return "duel_won";
    case "shot":
      return shotBeat(event.outcome);
    case "goal":
      return "shot_goal";
    case "save":
      return "shot_saved";
    case "turnover":
      return event.reason === "offside" ? "offside" : "turnover";
    case "foul":
      return foulBeat(event.card);
    case "card":
      return foulBeat(event.color);
    case "injury":
      return "injury";
    case "substitution":
      return "substitution";
    case "restart": {
      switch (event.phase) {
        case "throw_in":
          return "restart_throw_in";
        case "corner":
          return "restart_corner";
        case "free_kick":
          return "restart_free_kick";
        case "penalty":
          return "restart_penalty";
        case "goal_kick":
          return "restart_goal_kick";
        case "kickoff":
          return "restart_kickoff";
        default:
          return "restart_throw_in";
      }
    }
    case "period_end":
      return "half_time";
    case "match_end":
      return "full_time";
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

/** Beat for a line in the commentary feed, or null when the tick stays visual-only. */
export function beatForCommentary(
  event: MatchEvent,
  previous?: MatchEvent,
  options?: { homeTeamId?: import("@fussballmanager/shared").TeamId },
): BroadcastBeatId | null {
  if (!isCommentaryWorthy(event, previous, options)) {
    return null;
  }
  return classifyBeat(event);
}
