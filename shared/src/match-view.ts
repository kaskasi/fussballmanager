import type { MatchClock } from "./match-event.ts";
import type { PitchPosition } from "./pitch.ts";
import type { PlayerRole } from "./player.ts";
import type { Score } from "./match-state.ts";
import type { SandboxPlan } from "./squad.ts";
import type { MatchPairStats } from "./match-stats.ts";

/** On-pitch dots for one engine tick. Same seq as the match event. */
export type MatchViewDot = {
  playerId: string;
  teamId: string;
  x: number;
  y: number;
};

export type MatchViewFrame = {
  seq: number;
  ball: PitchPosition;
  score: Score;
  possessionTeamId: string | null;
  ballCarrierId: string | null;
  clock: MatchClock;
  dots: MatchViewDot[];
  /** Same engine flag as the event tick — pitch may draw a 2D height cue. */
  ballInAir: boolean;
  /** Broadcast overlay; null on ordinary open-play ticks. */
  cue: "offside" | "throw_in" | null;
  /** Running totals up to this tick, same event stream as commentary. */
  stats: MatchPairStats;
};

export type MatchViewLine = {
  seq: number;
  text: string;
};

export type MatchViewRosterPlayer = {
  id: string;
  teamId: string;
  name: string;
  role: PlayerRole;
  shirt: number;
  starter: boolean;
};

export type MatchViewSide = {
  id: string;
  name: string;
  shortName: string;
  formation: string;
};

/** Two projections of one simulated event stream: text lines and pitch frames. */
export type MatchView = {
  seed: number;
  home: MatchViewSide;
  away: MatchViewSide;
  homePlan: SandboxPlan;
  awayPlan: SandboxPlan;
  roster: MatchViewRosterPlayer[];
  kickoff: MatchViewFrame;
  frames: MatchViewFrame[];
  lines: MatchViewLine[];
  finalScore: Score;
  eventCount: number;
};
