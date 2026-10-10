import { describe, expect, it } from "vitest";
import { emptyPrecinct, pathBuildingToCity, placePrecinctBuilding, placeStreetRun } from "./precinct.ts";
import {
  computeHospitalityPreview,
  hotelOccupancyPct,
  hospitalityOvertimeCost,
  restaurantOccupancyPct,
  weeklyHotelIncome,
  weeklyMuseumIncome,
  weeklyRestaurantIncome,
} from "./hospitality.ts";

function docked(kind: "hotel" | "restaurant" | "museum") {
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
    expect(weeklyMuseumIncome(docked("museum"), 60)).toBeGreaterThan(0);
    expect(weeklyMuseumIncome(emptyPrecinct(), 60)).toBe(0);
  });
});

describe("computeHospitalityPreview", () => {
  it("matches home vs away hotel occupancy in preview income", () => {
    const precinct = docked("hotel");
    const away = computeHospitalityPreview({
      precinct,
      ownFanbase: 50,
      isHomeMatchWeek: false,
      opponentFanbase: 80,
      season: 1,
      week: 10,
    });
    const home = computeHospitalityPreview({
      precinct,
      ownFanbase: 50,
      isHomeMatchWeek: true,
      opponentFanbase: 80,
      season: 1,
      week: 10,
    });
    expect(home.hotel?.weeklyIncome ?? 0).toBeGreaterThan(away.hotel?.weeklyIncome ?? 0);
  });

  it("flags viral restaurant and overtime cost week", () => {
    const precinct = docked("restaurant");
    const viral = computeHospitalityPreview({
      precinct,
      ownFanbase: 40,
      isHomeMatchWeek: false,
      opponentFanbase: 50,
      season: 1,
      week: 8,
      restaurantViralUntilWeek: 20,
    });
    expect(viral.restaurant?.viral).toBe(true);
    expect(viral.restaurant?.occupancyPct).toBe(100);

    const overtime = computeHospitalityPreview({
      precinct,
      ownFanbase: 40,
      isHomeMatchWeek: false,
      opponentFanbase: 50,
      season: 1,
      week: 12,
      restaurantOvertimeWeek: 12,
    });
    expect(overtime.overtimeCostThisWeek).toBe(hospitalityOvertimeCost(12, 1, 12));
  });

  it("adds museum income into hospitality concessions total", () => {
    const precinct = docked("museum");
    const preview = computeHospitalityPreview({
      precinct,
      ownFanbase: 70,
      isHomeMatchWeek: false,
      opponentFanbase: 50,
      season: 2,
      week: 4,
    });
    expect(preview.totalWeeklyIncome).toBe(weeklyMuseumIncome(precinct, 70));
  });
});
