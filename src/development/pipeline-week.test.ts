import { describe, expect, it } from "vitest";
import { estimateCa } from "../transfers/market-value.ts";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { startProTrial } from "../youth/pro-trial.ts";
import {
  applyTrainingWeek,
  developmentScale,
  effectiveDevelopmentScale,
  HUB_PLAN,
  projectWeek,
} from "./pipeline-week.ts";

describe("pipeline week", () => {
  it("projects the age-19 passing gain from two technical focus sessions", () => {
    const player = clonePlayer();
    const passing = 1.5 * 1.1 * 1 * 1.5 * 0.7;
    const next = applyTrainingWeek(player, HUB_PLAN);
    expect(next.attributes.passing - player.attributes.passing).toBeCloseTo(passing, 5);
    expect(projectWeek(player, HUB_PLAN)).toBeGreaterThan(passing);
    expect(projectWeek(next, HUB_PLAN)).toBeCloseTo(projectWeek(player, HUB_PLAN), 5);
  });

  it("uses pro development scale during a pro trial week", () => {
    const youth = clonePlayer();
    youth.squad_status = "u19";
    const onTrial = startProTrial(youth, 1, 8);
    expect(effectiveDevelopmentScale(onTrial, { season: 1, week: 8 })).toBe(1);
    expect(effectiveDevelopmentScale(youth, { season: 1, week: 8 })).toBe(0.55);
  });

  it("dampens U17 development versus the pro squad", () => {
    const pro = clonePlayer();
    const youth = clonePlayer();
    youth.squad_status = "u17";
    youth.state.weekly_minutes = 70;
    pro.state.weekly_minutes = 70;
    expect(developmentScale("u17")).toBe(0.3);
    expect(projectWeek(youth, HUB_PLAN)).toBeLessThan(projectWeek(pro, HUB_PLAN) * 0.5);
  });

  it("keeps U17 CA gains below roughly one point per week over thirty weeks", () => {
    let player = clonePlayer();
    player.squad_status = "u17";
    player.age = 15;
    player.hidden.drive = 1.2;
    for (const key of Object.keys(player.hidden.anlage) as (keyof typeof player.hidden.anlage)[]) {
      player.hidden.anlage[key] = 1.2;
    }
    player.state.weekly_minutes = 70;
    const start = estimateCa(player.attributes, player.position);
    for (let week = 0; week < 30; week++) {
      player = applyTrainingWeek(player, HUB_PLAN);
    }
    const end = estimateCa(player.attributes, player.position);
    expect(end - start).toBeLessThan(35);
  });
});
