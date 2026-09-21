import type { MatchClock } from "@fussballmanager/shared";

export function advanceClock(clock: MatchClock, seconds: number): MatchClock {
  let minute = clock.minute;
  let second = clock.second + Math.max(0, Math.round(seconds));
  while (second >= 60) {
    second -= 60;
    minute += 1;
  }
  return { ...clock, minute, second };
}
