import { describe, expect, it } from "vitest";
import { emptyPrecinct, pathBuildingToCity, placePrecinctBuilding, placeStreetRun } from "./precinct.ts";
import {
  hotelOccupancyPct,
  restaurantOccupancyPct,
  weeklyHotelIncome,
  weeklyRestaurantIncome,
} from "./hospitality.ts";

function docked(kind: "hotel" | "restaurant") {
  const placed = placePrecinctBuilding(emptyPrecinct(), 2, 1, kind);
  const path = pathBuildingToCity(placed, kind);
  if (!path || path.length === 0) return placed;
  return placeStreetRun(placed, path, 1_000_000).state;
}

describe("hospitality occupancy", () => {
  it("raises hotel occupancy when a bigger guest visits at home", () => {
    const off = hotelOccupancyPct(50, false, 80);
    const home = hotelOccupancyPct(50, true, 80);
    expect(home).toBeGreaterThan(off);
  });

  it("pins restaurant occupancy at 100 while viral", () => {
    expect(restaurantOccupancyPct(40, true)).toBe(100);
    expect(restaurantOccupancyPct(40, false)).toBeLessThan(100);
  });

  it("pays cash only when hotel or restaurant docks", () => {
    expect(weeklyHotelIncome(emptyPrecinct(), 80)).toBe(0);
    expect(weeklyHotelIncome(docked("hotel"), 50)).toBeGreaterThan(0);
    expect(weeklyRestaurantIncome(docked("restaurant"), 100)).toBeGreaterThan(0);
  });
});
