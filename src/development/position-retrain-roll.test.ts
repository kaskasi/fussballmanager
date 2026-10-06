import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  previewSuccessPercent,
  retrainDeterministicUnit,
  retrainLaneFactor,
  retrainSuccessProbability,
  rollRetrainSuccess,
} from "./position-retrain-roll.ts";

describe("position retrain roll", () => {
  it("raises success probability with longer plans until the duration cap", () => {
    const player = clonePlayer();
    player.position = "CB";
    const base = {
      from: player.position,
      to: "RB" as const,
      attrs: player.attributes,
      currentProficiency: 0,
    };
    const p4 = retrainSuccessProbability({ ...base, plannedWeeks: 4 });
    const p8 = retrainSuccessProbability({ ...base, plannedWeeks: 8 });
    const p12 = retrainSuccessProbability({ ...base, plannedWeeks: 12 });
    expect(p8).toBeGreaterThan(p4);
    expect(p12).toBeCloseTo(p8, 5);
  });

  it("favors same-lane targets over cross-lane targets", () => {
    const player = clonePlayer();
    player.position = "CB";
    const input = {
      plannedWeeks: 8,
      from: player.position,
      attrs: player.attributes,
      currentProficiency: 0,
    };
    const toFullback = retrainSuccessProbability({ ...input, to: "RB" });
    const toWinger = retrainSuccessProbability({ ...input, to: "RW" });
    expect(toFullback).toBeGreaterThan(toWinger);
    expect(retrainLaneFactor("CB", "RB")).toBeGreaterThan(retrainLaneFactor("CB", "RW"));
  });

  it("uses a stable deterministic unit for fixed seeds", () => {
    const a = retrainDeterministicUnit(42, "pl_1", "AM", 1, 8);
    const b = retrainDeterministicUnit(42, "pl_1", "AM", 1, 8);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
  });

  it("clamps preview percent for UI", () => {
    const player = clonePlayer();
    const percent = previewSuccessPercent({
      plannedWeeks: 12,
      from: "CM",
      to: "AM",
      attrs: player.attributes,
      currentProficiency: 0,
    });
    expect(percent).toBeGreaterThanOrEqual(5);
    expect(percent).toBeLessThanOrEqual(95);
  });

  it("rolls success when unit is below probability", () => {
    expect(rollRetrainSuccess(0.2, 0.5)).toBe(true);
    expect(rollRetrainSuccess(0.8, 0.5)).toBe(false);
  });
});
