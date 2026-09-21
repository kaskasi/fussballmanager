import type { MatchEvent, MatchState } from "@fussballmanager/shared";
import { isOnPitch } from "@fussballmanager/shared";
import { usesAutoSubs } from "./discipline.ts";
import { onPitchFor } from "./helpers.ts";

const MAX_SUBS = 3;
const MIN_LIVE = 7;
const MAX_LIVE = 11;

export function invariantErrors(
  state: MatchState,
  event: MatchEvent,
): string[] {
  const errors: string[] = [];
  if (!isOnPitch(event.ball)) {
    errors.push(`event ${event.seq} ball off pitch`);
  }
  if (!isOnPitch(state.ball)) {
    errors.push(`state after ${event.seq} ball off pitch`);
  }
  if (event.seq !== state.nextSeq - 1) {
    errors.push(
      `seq ${event.seq} does not match nextSeq ${state.nextSeq}`,
    );
  }
  if (event.matchId !== state.matchId) {
    errors.push(`event ${event.seq} matchId mismatch`);
  }
  for (const player of event.involved) {
    if (!isOnPitch(player.position)) {
      errors.push(`event ${event.seq} involved ${player.playerId} off pitch`);
    }
  }
  if (
    state.substitutionsUsed.home > MAX_SUBS ||
    state.substitutionsUsed.away > MAX_SUBS
  ) {
    errors.push(`too many substitutions ${JSON.stringify(state.substitutionsUsed)}`);
  }

  for (const teamId of [state.homeTeamId, state.awayTeamId]) {
    const live = onPitchFor(state.players, teamId);
    if (live.length > MAX_LIVE) {
      errors.push(`team ${teamId} has ${live.length} on pitch`);
    }
    const teamKey = teamId === state.homeTeamId ? "home" : "away";
    const sentOffCount = state.players.filter(
      (player) => player.teamId === teamId && player.sentOff,
    ).length;
    const waitingOnSub =
      state.pending?.type === "substitution" && state.pending.teamId === teamId;
    const canReplace =
      usesAutoSubs(state, teamId) &&
      state.substitutionsUsed[teamKey] < MAX_SUBS &&
      state.players.some(
        (player) =>
          player.teamId === teamId && !player.onPitch && !player.sentOff,
      );
    const expectedLive = 11 - sentOffCount;
    if (
      canReplace &&
      !waitingOnSub &&
      live.length < Math.min(MIN_LIVE, expectedLive)
    ) {
      errors.push(`team ${teamId} has ${live.length} on pitch`);
    }
    if (!live.some((player) => player.role === "GK")) {
      const teamKey = teamId === state.homeTeamId ? "home" : "away";
      const benchGk = state.players.some(
        (player) =>
          player.teamId === teamId &&
          player.role === "GK" &&
          !player.onPitch &&
          !player.sentOff,
      );
      const pending = state.pending;
      const replacingGk =
        pending?.type === "substitution" &&
        state.players.some(
          (player) =>
            player.playerId === pending.playerOffId && player.role === "GK",
        );
      if (
        benchGk &&
        state.substitutionsUsed[teamKey] < MAX_SUBS &&
        !replacingGk
      ) {
        errors.push(
          `team ${teamId} has no goalkeeper on pitch after ${event.type}`,
        );
      }
    }
    const sentOffLive = state.players.filter(
      (player) =>
        player.teamId === teamId && player.sentOff && player.onPitch,
    );
    for (const player of sentOffLive) {
      const waitingForSub =
        state.pending?.type === "substitution" &&
        state.pending.playerOffId === player.playerId &&
        player.role === "GK";
      if (!waitingForSub) {
        errors.push(`team ${teamId} has a sent-off player still on pitch`);
      }
    }
  }

  const ids = state.players.map((player) => player.playerId);
  if (new Set(ids).size !== ids.length) {
    errors.push("duplicate player ids on match state");
  }
  return errors;
}
