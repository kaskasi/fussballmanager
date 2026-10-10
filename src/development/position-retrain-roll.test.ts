import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  previewSuccessPercent,
  retrainDeterministicUnit,
  retrainLaneFactor,
  retrainLaneSkillForTarget,
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

  it("treats full lane mastery as a strong success driver (AM → CM)", () => {
    const player = clonePlayer();
    player.position = "AM";
    player.flexibility = [];
    expect(retrainLaneSkillForTarget("AM", [], "CM")).toBe(1);
    const eliteMental = {
      ...player.attributes,
      composure: 199,
      concentration: 199,
      teamwork: 199,
    };
    const p = retrainSuccessProbability({
      plannedWeeks: 8,
      from: "AM",
      to: "CM",
      attrs: eliteMental,
      currentProficiency: 0,
      flexibility: [],
    });
    expect(p).toBeCloseTo(0.83, 2);
    expect(previewSuccessPercent({
      plannedWeeks: 8,
      from: "AM",
      to: "CM",
      attrs: eliteMental,
      currentProficiency: 0,
      flexibility: [],
    })).toBe(83);
  });

  it("keeps cross-lane retrain riskier when lane skill is low", () => {
    const player = clonePlayer();
    player.position = "CB";
    player.flexibility = [];
    const sameLane = retrainSuccessProbability({
      plannedWeeks: 8,
      from: "CB",
      to: "RB",
      attrs: player.attributes,
      currentProficiency: 0,
      flexibility: [],
    });
    const crossLane = retrainSuccessProbability({
      plannedWeeks: 8,
      from: "CB",
      to: "RW",
      attrs: player.attributes,
      currentProficiency: 0,
      flexibility: [],
    });
    expect(sameLane).toBeGreaterThan(crossLane);
  });
});
