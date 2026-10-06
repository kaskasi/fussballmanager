import { describe, expect, it } from "vitest";
import { scoutTripDuration } from "./scout-trip-duration.ts";

describe("scoutTripDuration", () => {
  it("matches SH example: 4 stops ≈ 4 working days at 100% speed", () => {
    const trip = scoutTripDuration("sh", 4);
    expect(trip.setupWorkingDays).toBe(1);
    expect(trip.teardownWorkingDays).toBe(1);
    expect(trip.scoutingWorkingDays).toBe(2);
    expect(trip.totalWorkingDays).toBe(4);
  });

  it("matches Pattaya-style 25%: 4 stops ≈ 18 working days", () => {
    const trip = scoutTripDuration("pattaya", 4);
    expect(trip.setupWorkingDays).toBe(5);
    expect(trip.teardownWorkingDays).toBe(5);
    expect(trip.scoutingWorkingDays).toBe(8);
    expect(trip.totalWorkingDays).toBe(18);
  });
});
