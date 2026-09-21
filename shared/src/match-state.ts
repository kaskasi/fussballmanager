import type { FormationSlotId } from "./formations.ts";
import type { MatchId, PlayerId, TeamId } from "./ids.ts";
import type { CardColor, MatchClock, MatchPhase, RestartPhase } from "./match-event.ts";
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
  /** Formation slot when this player started; used for zonal shape. */
  slot?: FormationSlotId;
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
  /**
   * Player-managed club. Auto-subs apply only to the other side (AI).
   * Null means both teams are AI (rest-of-league fixtures).
   */
  humanTeamId: TeamId | null;
  /**
   * Team that just won the ball. Until `transitionUntilElapsed`, they are in
   * gained-ball / the other side in lost-ball (Van Gaal moments).
   */
  transitionGainedTeamId: TeamId | null;
  /** Period elapsed time when the 10s transition window ends. */
  transitionUntilElapsed: number | null;
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
      phase: RestartPhase;
      takingTeamId: TeamId;
    }
  | {
      type: "card";
      playerId: PlayerId;
      color: CardColor;
      thenRestart?: {
        phase: RestartPhase;
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
