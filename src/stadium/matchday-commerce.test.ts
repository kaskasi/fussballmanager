import { describe, expect, it } from "vitest";
import { defaultClubStadium } from "./club-stadium.ts";
import { matchdayCashBreakdown, weekCommerceOccupancy } from "./matchday-commerce.ts";
import { precinctVisitFill } from "./precinct-effects.ts";

describe("matchday commerce occupancy", () => {
  it("uses match fill at home and a small visit fill away", () => {
    const stadium = defaultClubStadium();
    const home = weekCommerceOccupancy(true, stadium);
    const away = weekCommerceOccupancy(false, stadium);
    expect(home).toBeGreaterThan(0.4);
    expect(away).toBeGreaterThanOrEqual(0.04);
    expect(away).toBeLessThanOrEqual(0.12);
    expect(away).toBeLessThan(home);
  });

  it("keeps visit fill in the sightseeing band", () => {
    expect(precinctVisitFill(25, undefined)).toBeCloseTo(0.04);
    expect(precinctVisitFill(95, undefined)).toBeLessThanOrEqual(0.12);
  });

  it("puts tickets only on the home kasse board", () => {
    const stadium = defaultClubStadium();
    const home = matchdayCashBreakdown(stadium, true);
    const away = matchdayCashBreakdown(stadium, false);
    expect(home.home).toBe(true);
    expect(home.tickets).toBeGreaterThan(0);
    expect(away.tickets).toBe(0);
    expect(home.shop).toBe(0);
    expect(home.total).toBe(home.tickets + home.kiosk + home.beer);
  });
});
