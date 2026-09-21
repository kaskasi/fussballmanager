import type { MatchState, TeamId } from "@fussballmanager/shared";

/** Highest chance to score after a turnover lives in this window. */
export const TRANSITION_SECONDS = 10;

export function settleTransition(state: MatchState): MatchState {
  if (
    state.transitionUntilElapsed === null ||
    state.periodElapsedSeconds < state.transitionUntilElapsed
  ) {
    return state;
  }
  return {
    ...state,
    transitionGainedTeamId: null,
    transitionUntilElapsed: null,
  };
}

export function beginTransition(
  state: MatchState,
  gainedTeamId: TeamId,
): MatchState {
  return {
    ...state,
    transitionGainedTeamId: gainedTeamId,
    transitionUntilElapsed: state.periodElapsedSeconds + TRANSITION_SECONDS,
  };
}

export function clearTransition(state: MatchState): MatchState {
  return {
    ...state,
    transitionGainedTeamId: null,
    transitionUntilElapsed: null,
  };
}

/** Team in possession is in Van Gaal "gained ball" (transition attack). */
export function inGainedBall(state: MatchState): boolean {
  return (
    state.transitionGainedTeamId !== null &&
    state.possessionTeamId === state.transitionGainedTeamId &&
    state.transitionUntilElapsed !== null &&
    state.periodElapsedSeconds < state.transitionUntilElapsed
  );
}

/** This team just lost the ball and has not recovered its shape. */
export function inLostBall(state: MatchState, teamId: TeamId): boolean {
  return (
    inGainedBall(state) &&
    state.possessionTeamId !== teamId &&
    state.transitionGainedTeamId !== teamId
  );
}
