import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ACADEMY_FACILITIES,
  coachIconLabel,
  PERFORMANCE_STADIUM_CAPACITY,
  facilityGate,
  groupCampusBadges,
  academyStage,
  sortCampusBadges,
  type CampusBadge,
} from "./academy.ts";

describe("coach icons", () => {
  it("explains each coach comment icon for tooltips", () => {
    expect(coachIconLabel("🚀")).toMatch(/Top-Form/);
    expect(coachIconLabel("⚠️")).toMatch(/Spielzeit/);
  });
});

describe("academy facilities", () => {
  it("numbers campus stages from the owned building", () => {
    expect(academyStage("academy_basic")).toBe(1);
    expect(academyStage("academy_performance")).toBe(2);
    expect(academyStage("academy_elite")).toBe(3);
  });

  it("matches the published campus catalogue", () => {
    const file = JSON.parse(
      readFileSync(new URL("../../data/infrastructure/stadium_upgrades.json", import.meta.url), "utf8"),
    ) as { academy_facilities: typeof ACADEMY_FACILITIES };
    expect(file.academy_facilities).toEqual(ACADEMY_FACILITIES);
  });

  it("keeps the Leistungszentrum shut until the stadium holds 20,000", () => {
    expect(facilityGate("academy_basic", "academy_performance", 19_999)).toEqual({
      status: "needs_stadium",
      capacity: PERFORMANCE_STADIUM_CAPACITY,
    });
    expect(facilityGate("academy_basic", "academy_performance", 20_000)).toEqual({ status: "open" });
  });

  it("keeps the elite academy behind the performance building", () => {
    expect(facilityGate("academy_basic", "academy_elite", 40_000)).toEqual({
      status: "needs_performance",
    });
    expect(facilityGate("academy_performance", "academy_elite", 0)).toEqual({ status: "open" });
    expect(facilityGate("academy_elite", "academy_elite", 0)).toEqual({ status: "current" });
  });
});

describe("campus badges", () => {
  const badges: CampusBadge[] = [
    { playerId: "pl_00003", position: "CB", coachIcon: "😞", departureRisk: false },
    { playerId: "pl_00002", position: "GK", coachIcon: "🚀", departureRisk: true },
    { playerId: "pl_00004", position: "CM", coachIcon: "➡️", departureRisk: false },
    { playerId: "pl_00001", position: "LB", coachIcon: "🚀", departureRisk: false },
    { playerId: "pl_00005", position: "CF", coachIcon: "⚠️", departureRisk: true },
  ];

  it("sorts by coach icon, then id, and ignores the departure flag", () => {
    expect(sortCampusBadges(badges).map((badge) => badge.playerId)).toEqual([
      "pl_00001",
      "pl_00002",
      "pl_00004",
      "pl_00005",
      "pl_00003",
    ]);
  });

  it("groups badges under the four coach icons that are present", () => {
    expect(groupCampusBadges(badges).map((group) => [group.icon, group.badges.length])).toEqual([
      ["🚀", 2],
      ["➡️", 1],
      ["⚠️", 1],
      ["😞", 1],
    ]);
  });
});
