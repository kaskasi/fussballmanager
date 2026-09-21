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
export { awayKickoffPosition, FORMATION_IDS, getFormation, getFormationSlot } from "./formations.ts";

export type { KickoffPlace, Squad, StartingPlace } from "./squad.ts";
export { assertValidSquad, isFormationId, kickoffLineup, selectFormation, squadIssues } from "./squad.ts";

export {
  NORDSTERN_ID,
  RHEINWACHT_ID,
  SEED_MATCHUP,
  fillSquad,
  scatterAttributes,
  nordsternPyramidSquad,
  nordsternSquad,
  nordsternTeam,
  rheinwachtSquad,
  rheinwachtTeam,
} from "./seed-clubs.ts";

export {
  SEED_DIVISION,
  elbstrandSquad,
  holzwegSquad,
  kuestenholzSquad,
  moorsielSquad,
} from "./seed-division.ts";

export type { FixtureResult, ScheduledFixture, TableRow } from "./league.ts";
export { matchdayFixtures, standings } from "./league.ts";

export type {
  CentreMidDuty,
  FormationPreset,
  FullbackDuty,
  HoldingDuty,
  KeeperDuty,
  LineDuties,
  MarkingStyle,
  StrikerDuty,
  TeamTactics,
  WideDuty,
} from "./tactics.ts";
export {
  DEFAULT_LINE_CONTROL,
  DIRECT_LINE_DUTIES,
  FORMATION_PRESETS,
  POSSESSION_LINE_DUTIES,
  PYRAMID_LINE_DUTIES,
} from "./tactics.ts";

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
  RestartPhase,
  SaveEvent,
  ShotEvent,
  ShotOutcome,
  SubstitutionEvent,
  TurnoverEvent,
} from "./match-event.ts";

export type { MatchState, PendingFollowUp, PlayerMatchStatus, Score } from "./match-state.ts";

export { createRng, nextInt, nextRange, nextUnit, pickWeighted } from "./rng.ts";
export type { RngState } from "./rng.ts";

export type { SimulateResult, StepInput, StepResult } from "./engine.ts";
