import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { UNKNOWN_PRIOR } from "../scouting/estimate-model.ts";
import {
  appendSeasonSnapshot,
  attributeBars,
  dossierTrainingTarget,
  formMark,
  fullSkillSheet,
  growthPolyline,
  growthSeries,
  hexValuePoints,
  layoutGrowthChart,
  profileAttributeKeys,
  profileExperienceBar,
  staerkeAlsLanes,
  stateMark,
  visibleBreakoutFlags,
} from "./player-profile.ts";

describe("player profile helpers", () => {
  it("picks six position-weighted attributes for a midfielder", () => {
    expect(profileAttributeKeys("CM")).toEqual([
      "passing",
      "vision",
      "composure",
      "stamina",
      "technique",
      "teamwork",
    ]);
  });

  it("shows exact values for own players and a CI band for scouts", () => {
    const player = clonePlayer();
    const own = attributeBars(player, true);
    const foreign = attributeBars(player, false, UNKNOWN_PRIOR);
    expect(own[0]?.value).toBe(player.attributes.passing);
    expect(own[0]?.showValue).toBe(true);
    expect(own[0]?.low).toBeUndefined();
    expect(foreign).toHaveLength(2);
    expect(foreign[0]?.showValue).toBe(false);
    expect(foreign[0]?.low).toBeUndefined();

    const clearer = attributeBars(player, false, { estimatedAbilityMean: 72, uncertaintyRange: 24, sampleSize: 1 });
    expect(clearer).toHaveLength(4);
    expect(clearer[0]?.showCi).toBe(true);

    const known = attributeBars(player, false, { estimatedAbilityMean: 72, uncertaintyRange: 8, sampleSize: 3 });
    expect(known[0]?.showValue).toBe(true);
    expect(known[0]?.value).toBe(player.attributes.passing);
  });

  it("uses shape plus tone for fitness and form", () => {
    expect(stateMark(90)).toEqual({ mark: "●", tone: "good" });
    expect(stateMark(55)).toEqual({ mark: "▲", tone: "mid" });
    expect(formMark(-3)).toEqual({ mark: "◆", tone: "low" });
  });

  it("draws a growth line and hides generational flags", () => {
    const player = clonePlayer();
    expect(growthSeries(player, 1)).toHaveLength(1);
    expect(growthPolyline(growthSeries(player, 1))).toMatch(/^\d/);
    expect(
      visibleBreakoutFlags([
        "prodigy_foundation",
        "injury_desperation",
        "success_inflation",
        "mentor_ignition",
      ]),
    ).toEqual(["mentor_ignition"]);
    const withHistory = appendSeasonSnapshot(player, 1);
    expect(withHistory.history.growth).toHaveLength(1);
  });

  it("appends current CA after season snapshots for a visible trend line", () => {
    const player = clonePlayer();
    const snap = appendSeasonSnapshot(player, 1);
    const series = growthSeries(snap, 2);
    expect(series).toHaveLength(2);
    expect(series[0]!.season).toBe(1);
    expect(series[1]!.season).toBe(2);
    const layout = layoutGrowthChart(
      [{ season: 1, ca: 120 }, { season: 2, ca: 190 }],
      320,
      120,
    );
    expect(layout[0]!.y).toBeGreaterThan(layout[1]!.y);
  });

  it("centers a flat single-point chart", () => {
    const layout = layoutGrowthChart([{ season: 1, ca: 100 }], 320, 120);
    expect(layout[0]!.y).toBeGreaterThan(40);
    expect(layout[0]!.y).toBeLessThan(80);
  });

  it("maps primary position and flexibility into four Stärke-als lanes", () => {
    const player = clonePlayer();
    const lanes = staerkeAlsLanes(player);
    expect(lanes.map((lane) => lane.lane)).toEqual(["TW", "IV", "MF", "ST"]);
    expect(lanes.find((lane) => lane.lane === "MF")?.value).toBe(1);
    expect(lanes.find((lane) => lane.lane === "ST")?.value).toBe(0);
    const asWing = clonePlayer();
    asWing.position = "CB";
    asWing.flexibility = [{ trained_as: "AM", proficiency: 0.4, weeks_trained: 6 }];
    const defender = staerkeAlsLanes(asWing);
    expect(defender.find((lane) => lane.lane === "IV")?.value).toBe(1);
    expect(defender.find((lane) => lane.lane === "MF")?.value).toBe(0.4);
  });

  it("prefers an individual program over team focus for the dossier target", () => {
    const player = clonePlayer();
    const teamOnly = dossierTrainingTarget(player, [], [{ unitId: "phys_speed", focus: true }], 4);
    expect(teamOnly.title).toBe("Schnelligkeit");
    expect(teamOnly.progress).toBeNull();
    const withProgram = dossierTrainingTarget(
      player,
      [
        {
          playerId: player.id,
          kind: "weak_foot",
          weeksRemaining: 6,
          startedWeek: 1,
          season: 1,
        },
      ],
      [{ unitId: "phys_speed", focus: true }],
      4,
    );
    expect(withProgram.title).toBe("Schwaches Bein");
    expect(withProgram.progress).toBeCloseTo(3 / 9);
    const stampProgram = dossierTrainingTarget(
      player,
      [
        {
          playerId: player.id,
          kind: "stamp",
          stampId: "geolter_blitz",
          weeksRemaining: 4,
          startedWeek: 1,
          season: 1,
        },
      ],
      [{ unitId: "phys_speed", focus: true }],
      4,
    );
    expect(stampProgram.accent).toBe("stamp");
  });

  it("draws six hex vertices and groups the full skill sheet with gate keys", () => {
    const player = clonePlayer();
    const points = hexValuePoints([199, 199, 199, 199, 199, 199], 100, 100, 80);
    expect(points.split(" ")).toHaveLength(6);
    const sheet = fullSkillSheet(player, true);
    expect(sheet.map((group) => group.id)).toEqual(["technik", "physis", "mental", "extra"]);
    const physis = sheet.find((group) => group.id === "physis");
    expect(physis?.bars.some((bar) => bar.key === "strength")).toBe(true);
    const xp = profileExperienceBar(player);
    expect(xp.label).toBe("Erfahrung");
    expect(xp.fill).toBeGreaterThanOrEqual(0);
  });
});
