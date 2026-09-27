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
    const passing = 0.06 * 1.5 * 1.1 * 1 * 1.5 * 0.7;
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

  it("uses reproducible weekly variance from player, week, and attribute", () => {
    const player = clonePlayer();
    const context = { season: 1, week: 8, masterSeed: 2026 };
    const first = applyTrainingWeek(player, HUB_PLAN, context);
    const replay = applyTrainingWeek(player, HUB_PLAN, context);
    const nextWeek = applyTrainingWeek(player, HUB_PLAN, { ...context, week: 9 });

    expect(first.attributes).toEqual(replay.attributes);
    expect(nextWeek.attributes).not.toEqual(first.attributes);
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

  it("keeps U17 CA gains below three points over thirty weeks", () => {
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
    expect(end - start).toBeGreaterThan(0.5);
    expect(end - start).toBeLessThan(3);
  });

  it("keeps a typical young pro inside the annual growth corridor", () => {
    let player = clonePlayer();
    player.age = 19;
    player.state.weekly_minutes = 90;
    const start = estimateCa(player.attributes, player.position);
    for (let week = 0; week < 52; week++) {
      player = applyTrainingWeek(player, HUB_PLAN);
    }
    const gained = estimateCa(player.attributes, player.position) - start;
    expect(gained).toBeGreaterThan(4);
    expect(gained).toBeLessThan(8);
  });

  it("makes veteran pace decline over a full season", () => {
    let player = clonePlayer();
    player.age = 33;
    player.state.weekly_minutes = 0;
    const start = player.attributes.pace;
    for (let week = 0; week < 52; week++) {
      player = applyTrainingWeek(player, HUB_PLAN);
    }
    expect(start - player.attributes.pace).toBeGreaterThan(0.5);
  });

  it("does not turn a normal academy player into a superstar in five seasons", () => {
    let player = clonePlayer();
    player.age = 15;
    player.squad_status = "u17";
    player.state.weekly_minutes = 70;
    const start = estimateCa(player.attributes, player.position);

    for (let season = 0; season < 5; season++) {
      for (let week = 0; week < 52; week++) {
        player = applyTrainingWeek(player, HUB_PLAN);
      }
      player = {
        ...player,
        age: player.age + 1,
        squad_status: season < 1 ? "u17" : season < 3 ? "u19" : "pro",
      };
    }

    const gained = estimateCa(player.attributes, player.position) - start;
    expect(gained).toBeGreaterThan(8);
    expect(gained).toBeLessThan(25);
  });
});
