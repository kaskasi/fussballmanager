import type { MatchId, PlayerId, TeamId } from "./ids.ts";
import type { MatchClock, MatchPhase } from "./match-event.ts";
import type { PitchPosition } from "./pitch.ts";
import type { PlayerRole } from "./player.ts";
import type { TeamTactics } from "./tactics.ts";

export type PlayerMatchStatus = {
  playerId: PlayerId;
  teamId: TeamId;
  role: PlayerRole;
  /** Current on-pitch position (updated every step). */
  position: PitchPosition;
  onPitch: boolean;
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
  possessionTeamId: TeamId | null;
  players: ReadonlyArray<PlayerMatchStatus>;
  homeTactics: TeamTactics;
  awayTactics: TeamTactics;
  /** Next event sequence number. */
  nextSeq: number;
};
