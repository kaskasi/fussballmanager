import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import type { Player } from "../types/player.ts";
import {
  baseRetirementChance,
  peakCa,
  retirementChance,
  rollsRetirement,
  withPeakCa,
} from "./retirement.ts";

function veteran(age: number, patch: Partial<Player["state"]> = {}, position: Player["position"] = "CM"): Player {
  const player = clonePlayer();
  return {
    ...player,
    id: `pl_vet_${age}_${position}`,
    age,
    position,
    contract: player.contract ? { ...player.contract, until_season: 2 } : null,
    state: { ...player.state, season_apps: 15, ...patch },
  };
}

describe("retirement chance", () => {
  it("follows the outfield curve and the keeper shift", () => {
    expect(baseRetirementChance(30, false)).toBe(0);
    expect(baseRetirementChance(33, false)).toBeCloseTo(0.12);
    expect(baseRetirementChance(35, false)).toBeCloseTo(0.6);
    expect(baseRetirementChance(38, false)).toBeCloseTo(0.9);
    expect(baseRetirementChance(35, true)).toBeCloseTo(0.12);
    expect(baseRetirementChance(40, true)).toBe(1);
  });

  it("rolls on next season's age", () => {
    expect(retirementChance(veteran(29), { endingSeason: 1 })).toBe(0);
    expect(retirementChance(veteran(34), { endingSeason: 1 })).toBeCloseTo(0.6);
    expect(retirementChance(veteran(39), { endingSeason: 1 })).toBe(1);
  });

  it("rises with decline, few appearances and an ending contract", () => {
    const base = retirementChance(veteran(33), { endingSeason: 1 });
    const benched = retirementChance(veteran(33, { season_apps: 2 }), { endingSeason: 1 });
    const declined = retirementChance(veteran(33, { peak_ca: 500 }), { endingSeason: 1 });
    const expiring = retirementChance(veteran(33), { endingSeason: 2 });
    const longDeal = retirementChance(veteran(33), { endingSeason: 0 });
    expect(benched).toBeGreaterThan(base);
    expect(declined).toBeGreaterThan(base);
    expect(expiring).toBeGreaterThan(base);
    expect(longDeal).toBeLessThan(base);
  });

  it("is deterministic per seed, season and player", () => {
    // 33 now, 34 next season, contract ended: 0.35 × 1.4 = 0.49.
    const players = Array.from({ length: 200 }, (_, index) => ({ ...veteran(33), id: `pl_r${index}` }));
    const roll = (seed: number) =>
      players.filter((player) => rollsRetirement(player, { endingSeason: 3, masterSeed: seed })).map((p) => p.id);
    expect(roll(11)).toEqual(roll(11));
    expect(roll(11)).not.toEqual(roll(12));
    expect(roll(11).length).toBeGreaterThan(75);
    expect(roll(11).length).toBeLessThan(122);
  });
});

describe("peak CA", () => {
  it("never falls below the current CA and sticks once set", () => {
    const player = veteran(30);
    const stamped = withPeakCa(player);
    expect(stamped.state.peak_ca).toBeCloseTo(peakCa(player), 1);
    const weaker = { ...stamped, attributes: { ...stamped.attributes, passing: 20, vision: 20 } };
    expect(withPeakCa(weaker).state.peak_ca).toBe(stamped.state.peak_ca);
  });
});
