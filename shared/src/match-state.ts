import type { MatchId, PlayerId, TeamId } from "./ids.ts";
import type { MatchClock, MatchPhase } from "./match-event.ts";
import type { PitchPosition } from "./pitch.ts";
import type { PlayerAttributes, PlayerRole } from "./player.ts";
import type { RngState } from "./rng.ts";
import type { TeamTactics } from "./tactics.ts";

export type PlayerMatchStatus = {
  playerId: PlayerId;
  teamId: TeamId;
  role: PlayerRole;
  /** Current on-pitch position (updated every step). */
  position: PitchPosition;
  onPitch: boolean;
  attributes: PlayerAttributes;
  /** 0–100; explicit engine input, not a hidden constant. */
  fatigue: number;
  /** 0–100 match form. */
  form: number;
  yellowCards: number;
  sentOff: boolean;
};

export type Score = { home: number; away: number };

export type MatchState = {
  matchId: MatchId;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  clock: MatchClock;
  phase: MatchPhase;
  score: Score;
  ball: PitchPosition;
  ballCarrierId: PlayerId | null;
  possessionTeamId: TeamId | null;
  players: ReadonlyArray<PlayerMatchStatus>;
  homeTactics: TeamTactics;
  awayTactics: TeamTactics;
  rng: RngState;
  lastPasserId: PlayerId | null;
  pending: PendingFollowUp | null;
  /** Next event sequence number. */
  nextSeq: number;
};

export type PendingFollowUp =
  | {
      type: "save";
      keeperId: PlayerId;
      shooterId: PlayerId;
    }
  | {
      type: "goal";
      scorerId: PlayerId;
      assistId?: PlayerId;
    }
  | {
      type: "restart";
      phase: "goal_kick" | "corner" | "kickoff";
      takingTeamId: TeamId;
    };
