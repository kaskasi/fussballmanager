import { describe, expect, it } from "vitest";
import {
  attributesIn,
  focusSlotsFor,
  passingGrowthForPlan,
  sessionGroup,
  SLOT_COUNT,
  validateWeeklyPlan,
  weeklyFocusMultiplier,
  type TrainingSession,
} from "./weekly-plan.ts";

const filler: TrainingSession = { group: "mental", focus: false };

function padWeek(sessions: TrainingSession[]): TrainingSession[] {
  const out = [...sessions];
  while (out.length < SLOT_COUNT) out.push(filler);
  return out;
}

const full = padWeek([
  { group: "technical", focus: true },
  { group: "technical", focus: true },
  { group: "physical", focus: true },
  { group: "mental", focus: false },
  { group: "physical", focus: false },
]);

describe("validateWeeklyPlan", () => {
  it("accepts a full week with three focus slots and two on one group", () => {
    expect(validateWeeklyPlan(full)).toEqual({ valid: true, errors: [] });
  });

  it("rejects a week that is not the full slot count", () => {
    const check = validateWeeklyPlan(full.slice(0, SLOT_COUNT - 1));
    expect(check.valid).toBe(false);
    expect(check.errors[0]).toMatch(new RegExp(`${SLOT_COUNT} sessions`));
  });

  it("rejects a fourth focus session", () => {
    const sessions = full.map((session, index) =>
      index === 3 ? { ...session, focus: true } : session,
    );
    const check = validateWeeklyPlan(sessions);
    expect(check.valid).toBe(false);
    expect(check.errors.join(" ")).toMatch(/3 focus/);
  });

  it("rejects a third focus session on the same group", () => {
    const sessions = padWeek([
      { group: "technical", focus: true },
      { group: "technical", focus: true },
      { group: "technical", focus: true },
      { group: "physical", focus: false },
      { group: "mental", focus: false },
    ]);
    const check = validateWeeklyPlan(sessions);
    expect(check.valid).toBe(false);
    expect(check.errors.join(" ")).toMatch(/technical/);
  });
});

describe("focus multipliers", () => {
  it("maps attributes onto the three session groups", () => {
    expect(sessionGroup("passing")).toBe("technical");
    expect(sessionGroup("weak_foot")).toBe("technical");
    expect(sessionGroup("pace")).toBe("physical");
    expect(sessionGroup("gk_handling")).toBe("physical");
    expect(sessionGroup("leadership")).toBe("mental");
    expect(attributesIn("technical")).toContain("technique");
  });

  it("counts focus sessions only, so extra normal sessions do not stack", () => {
    const sessions = padWeek([
      { group: "technical", focus: true },
      { group: "technical", focus: false },
      { group: "technical", focus: false },
      { group: "technical", focus: false },
      { group: "technical", focus: false },
    ]);
    expect(focusSlotsFor(sessions, "shooting")).toBe(1);
    expect(weeklyFocusMultiplier(sessions, "shooting", false)).toBe(1.25);
    expect(weeklyFocusMultiplier(sessions, "pace", false)).toBe(1);
  });

  it("uses 1.5 when two focus sessions sit on the group", () => {
    expect(focusSlotsFor(full, "passing")).toBe(2);
    expect(focusSlotsFor(full, "pace")).toBe(1);
    expect(focusSlotsFor(full, "vision")).toBe(0);
    expect(weeklyFocusMultiplier(full, "passing", false)).toBe(1.5);
    expect(weeklyFocusMultiplier(full, "passing", true)).toBe(0);
  });

  it("scales the published age-19 passing week by the focus multiplier", () => {
    const quiet = padWeek([
      { group: "physical", focus: false },
      { group: "physical", focus: false },
      { group: "mental", focus: false },
      { group: "mental", focus: false },
      { group: "technical", focus: false },
    ]);
    const one = padWeek([
      { group: "technical", focus: true },
      { group: "physical", focus: false },
      { group: "physical", focus: false },
      { group: "mental", focus: false },
      { group: "mental", focus: false },
    ]);
    expect(passingGrowthForPlan(quiet)).toBeCloseTo(0.17388, 5);
    expect(passingGrowthForPlan(one)).toBeCloseTo(0.17388 * 1.25, 5);
    expect(passingGrowthForPlan(full)).toBeCloseTo(0.17388 * 1.5, 5);
  });

  it("refuses to read focus off an illegal plan", () => {
    expect(() => focusSlotsFor(full.slice(0, 3), "passing")).toThrow(new RegExp(`${SLOT_COUNT} sessions`));
  });
});
