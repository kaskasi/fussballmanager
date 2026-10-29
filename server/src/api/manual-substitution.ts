import type { MatchPhase, MatchState, StepResult, TeamId } from "@fussballmanager/shared";
import { stepSubstitution } from "../engine/discipline.ts";

const MAX_SUBS = 3;

/** PRD 27 — a change the manager asked for while the match was paused. */
export type MatchSubstitutionRequest = {
  /** Seq of the tick the manager paused on; the change comes after it. */
  afterSeq: number;
  playerOffId: string;
  /** Omitted: the assistant picks, like the AI would. */
  playerOnId?: string;
};

/** The ball is out: a restart is due or about to be taken, or the teams are in the tunnel. */
const DEAD_BALL_PHASES: ReadonlySet<MatchPhase> = new Set<MatchPhase>([
  "half_time",
  "kickoff",
  "throw_in",
  "corner",
  "goal_kick",
  "free_kick",
  "goal_restart",
]);

/** Who has played and who has been replaced so far; the engine state does not remember. */
export type SubstitutionLedger = {
  appeared: Set<string>;
  replaced: Set<string>;
};

export function substitutionLedger(state: MatchState): SubstitutionLedger {
  return {
    appeared: new Set(state.players.filter((player) => player.onPitch).map((player) => player.playerId)),
    replaced: new Set(),
  };
}

export function recordSubstitution(ledger: SubstitutionLedger, offId: string, onId: string): void {
  ledger.replaced.add(offId);
  ledger.appeared.add(onId);
}

/**
 * The request can be served now: an injured man who already left is replaced at once,
 * anyone else waits for the ball to go dead (no change mid-move, never during a penalty).
 */
export function substitutionDue(state: MatchState, request: MatchSubstitutionRequest): boolean {
  if (state.phase === "full_time" || state.phase === "pre_match") return false;
  if (state.nextSeq - 1 < request.afterSeq) return false;
  const pending = state.pending;
  if (pending && pending.type !== "restart") return false;
  const off = state.players.find((player) => player.playerId === request.playerOffId);
  if (off && !off.onPitch) return true;
  return pending?.type === "restart" || DEAD_BALL_PHASES.has(state.phase);
}

/**
 * Bring the requested player on for `teamId`. The newcomer takes over the slot and role of the
 * man he replaces, and the match resumes exactly where it stood (restart, half-time).
 * Null when the request is no longer valid (sub limit, sent off, already used).
 */
export function applySubstitutionRequest(
  state: MatchState,
  teamId: TeamId,
  request: MatchSubstitutionRequest,
  ledger: SubstitutionLedger,
): StepResult | null {
  const teamKey = teamId === state.homeTeamId ? "home" : "away";
  if (state.substitutionsUsed[teamKey] >= MAX_SUBS) return null;
  const off = state.players.find(
    (player) => player.playerId === request.playerOffId && player.teamId === teamId,
  );
  if (!off || off.sentOff || ledger.replaced.has(off.playerId) || !ledger.appeared.has(off.playerId)) {
    return null;
  }
  const bench = state.players.filter(
    (player) =>
      player.teamId === teamId &&
      !player.onPitch &&
      !player.sentOff &&
      !ledger.appeared.has(player.playerId),
  );
  // No pick: the assistant brings on the same role first, an outfielder next (like the AI).
  const on = request.playerOnId
    ? bench.find((player) => player.playerId === request.playerOnId)
    : (bench.find((player) => player.role === off.role) ??
      bench.find((player) => player.role !== "GK") ??
      bench[0]);
  if (!on) return null;
  const result = stepSubstitution(state, teamId, off.playerId, on.playerId);
  if (result.event.type !== "substitution") return null;
  const onId = result.event.playerOn.playerId;
  const players = result.state.players.map((player) =>
    player.playerId === onId ? { ...player, slot: off.slot, role: off.role } : player,
  );
  recordSubstitution(ledger, off.playerId, onId);
  return {
    event: result.event,
    state: {
      ...result.state,
      players,
      phase: state.phase,
      pending: state.pending,
      ballCarrierId: state.ballCarrierId === off.playerId ? onId : state.ballCarrierId,
    },
  };
}
