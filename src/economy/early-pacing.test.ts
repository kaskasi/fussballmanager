import { describe, expect, it } from "vitest";
import {
  PRECINCT_BUILDINGS,
  PRECINCT_EXPANSION_COST,
  PRECINCT_PARCEL_COST,
  PRECINCT_STREET_COST,
} from "../stadium/precinct.ts";
import { stadiumUpgradeCatalog, stadiumUpgradeCost } from "../stadium/stadium-upgrades.ts";
import {
  buildWeeklyFinanceLines,
  STARTING_CLUB_CASH,
  type WeeklyFinanceContext,
} from "./club-finances.ts";
import {
  infrastructureCostForWeek,
  needsInfrastructureSpendConfirm,
} from "./early-pacing.ts";

function minimalFinanceContext(week: number): WeeklyFinanceContext {
  return {
    players: [],
    clubId: "cl_test",
    divisionId: "regionalliga-nord",
    isHomeMatchWeek: week % 2 === 1,
    season: 1,
    week,
  };
}

/** Cheapest “buy everything once” path: all unique buildings + one kiosk + expansions + cheapest tribune step. */
function cheapestInfraBingeBaseCost(): number {
  let sum = PRECINCT_PARCEL_COST + PRECINCT_EXPANSION_COST * 4 + PRECINCT_STREET_COST * 4;
  for (const def of PRECINCT_BUILDINGS) {
    if (def.cap === "unique") sum += def.cost;
    else if (def.id === "kiosk") sum += def.cost;
  }
  const heating = stadiumUpgradeCatalog().find((entry) => entry.id === "pitch_heating");
  if (heating) sum += stadiumUpgradeCost(heating, 1);
  return sum;
}

describe("infrastructureCostForWeek", () => {
  it("adds up to 20% surcharge in week 1 and none after week 6", () => {
    expect(infrastructureCostForWeek(100_000, 1)).toBe(120_000);
    expect(infrastructureCostForWeek(100_000, 7)).toBe(100_000);
    expect(infrastructureCostForWeek(100_000, 10)).toBe(100_000);
  });

  it("week 2 costs more than week 10 for the same base", () => {
    expect(infrastructureCostForWeek(85_000, 2)).toBeGreaterThan(infrastructureCostForWeek(85_000, 10));
  });
});

describe("needsInfrastructureSpendConfirm", () => {
  it("requires confirm for small early-season spends", () => {
    expect(needsInfrastructureSpendConfirm(15_000, 2, 50_000)).toBe(true);
  });

  it("allows tiny late-season spends without infrastructure rules", () => {
    expect(needsInfrastructureSpendConfirm(10_000, 12, 50_000)).toBe(false);
  });
});

describe("early economy diagnosis", () => {
  it("cheapest binge at week 1 exceeds half of starting cash before income", () => {
    const binge = infrastructureCostForWeek(cheapestInfraBingeBaseCost(), 1);
    expect(binge).toBeGreaterThan(STARTING_CLUB_CASH * 0.5);
  });

  it("weeks 1–4 net income is far below a full week-1 binge", () => {
    let net = 0;
    for (let week = 1; week <= 4; week += 1) {
      const lines = buildWeeklyFinanceLines(minimalFinanceContext(week));
      net += lines.reduce((sum, line) => sum + line.amount, 0);
    }
    const binge = infrastructureCostForWeek(cheapestInfraBingeBaseCost(), 1);
    expect(binge).toBeGreaterThan(net + STARTING_CLUB_CASH * 0.3);
  });
});
