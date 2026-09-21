import { describe, expect, it } from "vitest";
import {
  clockFromElapsed,
  periodElapsedSeconds,
  REGULATION_SECONDS,
} from "./clock.ts";

describe("match clock", () => {
  it("maps first-half elapsed time onto display minutes", () => {
    const clock = clockFromElapsed("first_half", 12 * 60 + 18);
    expect(clock).toEqual({
      period: "first_half",
      minute: 12,
      second: 18,
      stoppageMinute: 0,
    });
    expect(periodElapsedSeconds(clock)).toBe(12 * 60 + 18);
  });

  it("holds 45 and counts stoppage separately", () => {
    const clock = clockFromElapsed("first_half", REGULATION_SECONDS + 75);
    expect(clock.minute).toBe(45);
    expect(clock.stoppageMinute).toBe(1);
    expect(clock.second).toBe(15);
    expect(periodElapsedSeconds(clock)).toBe(REGULATION_SECONDS + 75);
  });

  it("starts the second half at 45:00", () => {
    const clock = clockFromElapsed("second_half", 0);
    expect(clock.minute).toBe(45);
    expect(clock.second).toBe(0);
    const later = clockFromElapsed("second_half", REGULATION_SECONDS + 10);
    expect(later.minute).toBe(90);
    expect(later.stoppageMinute).toBe(0);
    expect(later.second).toBe(10);
  });
});
