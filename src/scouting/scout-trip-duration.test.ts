import { describe, expect, it } from "vitest";
import { scoutTripDuration, scoutTripDurationFromClubStops } from "./scout-trip-duration.ts";

describe("scoutTripDuration", () => {
  it("uses one working day per club at any zone speed", () => {
    const sh = scoutTripDurationFromClubStops(4, "sh");
    expect(sh.totalWorkingDays).toBe(4);
    expect(sh.clubStops).toBe(4);

    const pattaya = scoutTripDurationFromClubStops(4, "pattaya");
    expect(pattaya.totalWorkingDays).toBe(4);
    expect(pattaya.speedPct).toBeLessThan(1);
  });

  it("path stop count proxy matches club stops for planning UI", () => {
    const trip = scoutTripDuration("sh", 3);
    expect(trip.totalWorkingDays).toBe(3);
  });
});
