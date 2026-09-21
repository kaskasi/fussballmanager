import type {
  MatchClock,
  MatchPeriod,
  MatchState,
  RngState,
} from "@fussballmanager/shared";
import { nextInt } from "@fussballmanager/shared";

export const REGULATION_SECONDS = 45 * 60;

export function clockFromElapsed(
  period: Exclude<MatchPeriod, "full_time">,
  elapsedSeconds: number,
): MatchClock {
  const elapsed = Math.max(0, elapsedSeconds);
  const baseMinute = period === "second_half" ? 45 : 0;
  if (elapsed < REGULATION_SECONDS) {
    return {
      period,
      minute: baseMinute + Math.floor(elapsed / 60),
      second: elapsed % 60,
      stoppageMinute: 0,
    };
  }
  const extra = elapsed - REGULATION_SECONDS;
  return {
    period,
    minute: baseMinute + 45,
    second: extra % 60,
    stoppageMinute: Math.floor(extra / 60),
  };
}

export function periodElapsedSeconds(clock: MatchClock): number {
  if (clock.period === "full_time") {
    return REGULATION_SECONDS;
  }
  const baseMinute = clock.period === "second_half" ? 45 : 0;
  if (clock.minute < baseMinute + 45) {
    return (clock.minute - baseMinute) * 60 + clock.second;
  }
  return REGULATION_SECONDS + clock.stoppageMinute * 60 + clock.second;
}

export function withTime(
  state: MatchState,
  seconds: number,
  rng: RngState,
): MatchState {
  const elapsed =
    state.periodElapsedSeconds + Math.max(0, Math.round(seconds));
  let allowance = state.stoppageAllowanceSeconds;
  let nextRng = rng;
  if (elapsed >= REGULATION_SECONDS && allowance === 0) {
    const rolled = nextInt(nextRng, 3);
    allowance = (rolled.i + 1) * 60;
    nextRng = rolled.rng;
  }
  const period =
    state.clock.period === "full_time" ? "second_half" : state.clock.period;
  return {
    ...state,
    rng: nextRng,
    periodElapsedSeconds: elapsed,
    stoppageAllowanceSeconds: allowance,
    clock: clockFromElapsed(period, elapsed),
  };
}

export function ensureStoppage(state: MatchState): MatchState {
  if (
    state.periodElapsedSeconds < REGULATION_SECONDS ||
    state.stoppageAllowanceSeconds > 0
  ) {
    return state;
  }
  return withTime(state, 0, state.rng);
}

export function periodTimeUp(state: MatchState): boolean {
  return (
    state.stoppageAllowanceSeconds > 0 &&
    state.periodElapsedSeconds >=
      REGULATION_SECONDS + state.stoppageAllowanceSeconds
  );
}
