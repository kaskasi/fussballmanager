import { describe, expect, it } from "vitest";
import { DIVISION_ECONOMY } from "../economy/division-economy.ts";
import {
  bottomDivisionId,
  careerStartDivisionIds,
  DEFAULT_DIVISION_ID,
  divisionAbove,
  divisionBelow,
  divisionOfClub,
  divisionZones,
  emptyDivisionPools,
  PYRAMID,
  pyramidDivisionIds,
  tableZone,
  tierOf,
} from "./league-pyramid.ts";

describe("league pyramid registry (PRD 32 §4)", () => {
  it("orders divisions top tier first with consecutive tiers", () => {
    const tiers = PYRAMID.map((division) => division.tier);
    expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
    tiers.slice(1).forEach((tier, index) => expect(tier).toBe(tiers[index]! + 1));
    expect(tierOf(bottomDivisionId())).toBe(tiers.at(-1));
  });

  it("gives every division an economy entry and every boundary but the last a rule", () => {
    for (const division of PYRAMID) {
      expect(DIVISION_ECONOMY[division.id]).toBeDefined();
      expect(division.boundaryBelow === undefined).toBe(division.id === bottomDivisionId());
    }
    expect(careerStartDivisionIds()).toContain(DEFAULT_DIVISION_ID);
  });

  it("walks up and down the pyramid", () => {
    const ids = pyramidDivisionIds();
    expect(divisionAbove(ids[0]!)).toBeUndefined();
    expect(divisionBelow(bottomDivisionId())).toBeUndefined();
    expect(divisionAbove(bottomDivisionId())).toBe(ids.at(-2));
    expect(divisionBelow(ids[0]!)).toBe(ids[1]);
  });

  it("finds a club's division from pools", () => {
    const pools = emptyDivisionPools<string>();
    pools[bottomDivisionId()].push("club-a");
    expect(divisionOfClub(pools, "club-a")).toBe(bottomDivisionId());
    expect(divisionOfClub(pools, "club-b")).toBeUndefined();
  });

  it("marks table zones from the boundaries above and below", () => {
    // Meisterliga: nothing above; two down plus a playoff.
    expect(tableZone("meisterliga", 0, 18)).toBe("safe");
    expect(tableZone("meisterliga", 15, 18)).toBe("playoff");
    expect(tableZone("meisterliga", 16, 18)).toBe("relegated");
    // Regionalliga Nord: two up plus a playoff to the Nationalliga, one down plus a playoff.
    expect(tableZone("regionalliga-nord", 0, 18)).toBe("promoted");
    expect(tableZone("regionalliga-nord", 1, 18)).toBe("promoted");
    expect(tableZone("regionalliga-nord", 2, 18)).toBe("playoff");
    expect(tableZone("regionalliga-nord", 16, 18)).toBe("playoff");
    expect(tableZone("regionalliga-nord", 17, 18)).toBe("relegated");
    expect(tableZone("oberliga-nord", 0, 18)).toBe("promoted");
    expect(tableZone("oberliga-nord", 1, 18)).toBe("playoff");
    expect(tableZone("oberliga-nord", 17, 18)).toBe("safe");
  });

  it("lists only the zones a division has", () => {
    expect(divisionZones("meisterliga")).toEqual(["playoff", "relegated"]);
    expect(divisionZones("nationalliga")).toEqual(["promoted", "playoff", "relegated"]);
    expect(divisionZones("oberliga-nord")).toEqual(["promoted", "playoff"]);
  });
});
