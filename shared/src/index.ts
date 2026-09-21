export { asMatchId, asPlayerId, asTeamId } from "./ids.ts";
export type { MatchId, PlayerId, TeamId } from "./ids.ts";

export { isOnPitch, PITCH_MAX, PITCH_MIN } from "./pitch.ts";
export type { PitchPosition } from "./pitch.ts";

export type { Player, PlayerAttributes, PlayerRole, Team } from "./player.ts";

export type {
  FormationId,
  FormationSlot,
  FormationSlotId,
} from "./formations.ts";
export { awayKickoffPosition, getFormation, getFormationSlot } from "./formations.ts";

export type { KickoffPlace, Squad, StartingPlace } from "./squad.ts";
export { assertValidSquad, kickoffLineup, squadIssues } from "./squad.ts";

export {
  NORDSTERN_ID,
  RHEINWACHT_ID,
  SEED_MATCHUP,
  nordsternSquad,
  nordsternTeam,
  rheinwachtSquad,
  rheinwachtTeam,
} from "./seed-clubs.ts";

export type { TeamTactics } from "./tactics.ts";

export type {
  CardColor,
  CardEvent,
  CarryEvent,
  DuelEvent,
  DuelKind,
  FoulEvent,
  GoalEvent,
  InjuryEvent,
  InvolvedPlayer,
  KickoffEvent,
  MatchClock,
  MatchEndEvent,
  MatchEvent,
  MatchPeriod,
  MatchPhase,
  PassEvent,
  PeriodEndEvent,
  RestartEvent,
  SaveEvent,
  ShotEvent,
  ShotOutcome,
  SubstitutionEvent,
  TurnoverEvent,
} from "./match-event.ts";

export type { MatchState, PlayerMatchStatus, Score } from "./match-state.ts";

export { createRng, nextInt, nextRange, nextUnit, pickWeighted } from "./rng.ts";
export type { RngState } from "./rng.ts";

export type { SimulateResult, StepInput, StepResult } from "./engine.ts";
