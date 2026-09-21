import type { MatchId, PlayerId, TeamId } from "./ids.ts";
import type { CardColor, MatchClock, MatchPhase } from "./match-event.ts";
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
  /** Seconds elapsed in the current period (including stoppage). */
  periodElapsedSeconds: number;
  /** Stoppage awarded for this period; 0 until regulation is reached. */
  stoppageAllowanceSeconds: number;
  firstKickoffTeamId: TeamId;
  substitutionsUsed: { home: number; away: number };
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
      phase: "goal_kick" | "corner" | "kickoff" | "free_kick";
      takingTeamId: TeamId;
    }
  | {
      type: "card";
      playerId: PlayerId;
      color: CardColor;
      thenRestart?: {
        phase: "free_kick";
        takingTeamId: TeamId;
      };
    }
  | {
      type: "injury";
      playerId: PlayerId;
      severity: "knock" | "off" | "stretcher";
    }
  | {
      type: "substitution";
      teamId: TeamId;
      playerOffId: PlayerId;
    };
