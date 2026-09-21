import type { MatchId, PlayerId, TeamId } from "./ids.ts";
import type { PitchPosition } from "./pitch.ts";

export type MatchPeriod = "first_half" | "second_half" | "full_time";

export type MatchClock = {
  period: MatchPeriod;
  /** Integer display minute, e.g. 47 in the 2nd half. */
  minute: number;
  /** Seconds within the current minute (ordering / later viz interpolation). */
  second: number;
  stoppageMinute: number;
};

export type MatchPhase =
  | "pre_match"
  | "kickoff"
  | "open_play"
  | "throw_in"
  | "goal_kick"
  | "corner"
  | "free_kick"
  | "penalty"
  | "set_piece_taken"
  | "goal_restart"
  | "half_time"
  | "full_time";

export type CardColor = "yellow" | "second_yellow" | "red";

export type DuelKind = "tackle" | "aerial" | "dribble";

export type ShotOutcome = "goal" | "save" | "block" | "wide" | "woodwork";

export type InvolvedPlayer = {
  playerId: PlayerId;
  teamId: TeamId;
  /** Position at the moment of this event — required for pitch viz. */
  position: PitchPosition;
};

type EventBase = {
  seq: number;
  matchId: MatchId;
  clock: MatchClock;
  /** Ball location after the event resolves. */
  ball: PitchPosition;
  /** Everyone named in the event, with positions. */
  involved: InvolvedPlayer[];
  possessionTeamId: TeamId | null;
};

export type KickoffEvent = EventBase & {
  type: "kickoff";
  kickingTeamId: TeamId;
};

export type PassKind = "short" | "switch" | "cross" | "through" | "restart";

export type PassEvent = EventBase & {
  type: "pass";
  from: InvolvedPlayer;
  to: InvolvedPlayer;
  complete: boolean;
  /** How the pass was meant; omitted on older fixtures. */
  kind?: PassKind;
};

export type CarryEvent = EventBase & {
  type: "carry";
  player: InvolvedPlayer;
  from: PitchPosition;
  to: PitchPosition;
};

export type DuelEvent = EventBase & {
  type: "duel";
  kind: DuelKind;
  attacker: InvolvedPlayer;
  defender: InvolvedPlayer;
  winnerId: PlayerId;
};

export type ShotEvent = EventBase & {
  type: "shot";
  shooter: InvolvedPlayer;
  assist?: InvolvedPlayer;
  target: PitchPosition;
  outcome: ShotOutcome;
};

export type GoalEvent = EventBase & {
  type: "goal";
  scorer: InvolvedPlayer;
  assist?: InvolvedPlayer;
};

export type SaveEvent = EventBase & {
  type: "save";
  keeper: InvolvedPlayer;
  shooter: InvolvedPlayer;
};

export type TurnoverEvent = EventBase & {
  type: "turnover";
  fromTeamId: TeamId;
  toTeamId: TeamId;
  reason: "interception" | "tackle" | "loose_ball" | "error" | "offside";
};

export type FoulEvent = EventBase & {
  type: "foul";
  fouler: InvolvedPlayer;
  fouled: InvolvedPlayer;
  card?: CardColor;
};

export type CardEvent = EventBase & {
  type: "card";
  player: InvolvedPlayer;
  color: CardColor;
};

export type InjuryEvent = EventBase & {
  type: "injury";
  player: InvolvedPlayer;
  severity: "knock" | "off" | "stretcher";
};

export type SubstitutionEvent = EventBase & {
  type: "substitution";
  teamId: TeamId;
  playerOff: InvolvedPlayer;
  playerOn: InvolvedPlayer;
};

export type RestartPhase = Extract<
  MatchPhase,
  "throw_in" | "goal_kick" | "corner" | "free_kick" | "penalty" | "kickoff"
>;

export type RestartEvent = EventBase & {
  type: "restart";
  phase: RestartPhase;
  takingTeamId: TeamId;
};

export type PeriodEndEvent = EventBase & {
  type: "period_end";
  period: "first_half" | "second_half";
};

export type MatchEndEvent = EventBase & {
  type: "match_end";
  homeGoals: number;
  awayGoals: number;
};

export type MatchEvent =
  | KickoffEvent
  | PassEvent
  | CarryEvent
  | DuelEvent
  | ShotEvent
  | GoalEvent
  | SaveEvent
  | TurnoverEvent
  | FoulEvent
  | CardEvent
  | InjuryEvent
  | SubstitutionEvent
  | RestartEvent
  | PeriodEndEvent
  | MatchEndEvent;
