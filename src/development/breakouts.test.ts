import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { applyBreakoutEffect, clampDrive, processWeeklyBreakoutChecks } from "./breakouts.ts";

describe("breakouts", () => {
  it("clamps mentor_ignition drive delta to 1.6", () => {
    const player = clonePlayer();
    player.hidden.drive = 1.5;
    const updated = applyBreakoutEffect(
      player,
      { drive_delta: 0.25, permanent: true },
      10,
      "mentor_ignition",
    );
    expect(updated.hidden.drive).toBe(1.6);
    expect(updated.hidden.breakout_flags).toContain("mentor_ignition");
  });

  it("never exceeds drive hard cap", () => {
    expect(clampDrive(2)).toBe(1.6);
    expect(clampDrive(0.1)).toBe(0.4);
  });

  it("applies injury_desperation effects", () => {
    const player = clonePlayer();
    player.state.injury = {
      type_id: "acl",
      weeks_remaining: 12,
      severity: "severe",
      sustained_week: 1,
    };
    const updated = applyBreakoutEffect(
      player,
      { drive_delta: -0.15, permanent: false },
      20,
      "injury_desperation",
    );
    expect(updated.hidden.breakout_flags).toContain("injury_desperation");
    expect(updated.hidden.drive).toBeLessThan(player.hidden.drive);
  });

  it("may fire at least one weekly event over many seeds", () => {
    const player = clonePlayer();
    player.age = 24;
    player.hidden.drive = 1.1;
    player.state.recent_growth_26w = 12;
    let fired = false;
    for (let seed = 1; seed < 500; seed++) {
      const { players } = processWeeklyBreakoutChecks([player], 20, seed);
      if (players[0]?.hidden.breakout_flags.includes("late_bloomer_kick")) {
        fired = true;
        break;
      }
    }
    expect(fired).toBe(true);
  });
});
