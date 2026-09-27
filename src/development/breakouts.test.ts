import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  applyBreakoutEffect,
  BREAKOUT_SIGNAL,
  clampDrive,
  expireBreakoutModifiers,
  processTransferBreakout,
  processWeeklyBreakoutChecks,
} from "./breakouts.ts";

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
    const result = fireEvent(player, "late_bloomer_kick");
    expect(result.player.hidden.breakout_flags).toContain("late_bloomer_kick");
  });

  it("supports the hidden success-inflation slump", () => {
    const player = withSignal(clonePlayer(), BREAKOUT_SIGNAL.contractTripled);
    player.age = 25;
    player.hidden.drive = 0.8;
    const result = fireEvent(player, "success_inflation");
    expect(result.player.hidden.drive).toBeCloseTo(0.55);
    expect(result.narratives).toHaveLength(0);
  });

  it("applies prodigy pressure with a visible owned-player narrative", () => {
    let player = clonePlayer();
    player.hidden.breakout_flags = ["prodigy_foundation"];
    player = withSignal(player, BREAKOUT_SIGNAL.mediaHypeHigh);
    player = withSignal(player, BREAKOUT_SIGNAL.topClubPressure);
    const result = fireEvent(player, "prodigy_pressure");
    expect(result.player.hidden.drive).toBeCloseTo(0.7);
    expect(result.player.state.morale).toBe(50);
    expect(result.player.attributes.composure).toBe(55);
    expect(result.narratives[0]?.narrative).toContain(player.name.first ?? "Spieler");
  });

  it("expires and reverses the temporary underdog composure bonus", () => {
    const player = withSignal(clonePlayer(), BREAKOUT_SIGNAL.mediaSnubEightWeeks);
    const result = fireEvent(player, "underdog_resolve", 10);
    expect(result.player.attributes.composure).toBe(65);
    expect(result.player.state.modifiers.some((mod) => mod.source_event_id === "underdog_resolve")).toBe(true);
    const expired = expireBreakoutModifiers([result.player], 22)[0]!;
    expect(expired.attributes.composure).toBe(60);
    expect(expired.state.modifiers.some((mod) => mod.source_event_id === "underdog_resolve")).toBe(false);
  });

  it("can turn a transfer into a visible positive environment shift", () => {
    const player = clonePlayer();
    player.age = 22;
    player.state.morale = 30;
    let shifted: ReturnType<typeof processTransferBreakout> | null = null;
    for (let event = 1; event <= 100 && !shifted; event++) {
      const result = processTransferBreakout(player, {
        masterSeed: 2026,
        worldEventId: `transfer_${event}`,
        week: 8,
        previousMorale: 30,
        matchFitPoor: false,
      });
      if (result.player.hidden.breakout_flags.includes("environment_shift_positive")) {
        shifted = result;
      }
    }
    expect(shifted?.player.state.morale).toBe(75);
    expect(shifted?.narratives).toHaveLength(1);
  });
});

function withSignal(player: ReturnType<typeof clonePlayer>, signal: string) {
  return {
    ...player,
    state: {
      ...player.state,
      modifiers: [...player.state.modifiers, { source_event_id: signal }],
    },
  };
}

function fireEvent(
  player: ReturnType<typeof clonePlayer>,
  eventId: string,
  week = 20,
) {
  for (let seed = 1; seed <= 10_000; seed++) {
    const result = processWeeklyBreakoutChecks([player], week, seed);
    const updated = result.players[0]!;
    if (updated.hidden.breakout_flags.includes(eventId)) {
      return { player: updated, narratives: result.narratives };
    }
  }
  throw new Error(`Event ${eventId} did not fire`);
}
