import { describe, expect, it } from "vitest";
import { unknownPlayer } from "./estimate-model.ts";
import {
  applyObservationWithAccuracy,
  defaultScoutNetwork,
  availableScoutCandidates,
  hireScout,
  MAX_HIRED_SCOUTS,
  scoutCandidates,
  scoutNetworkAccuracyModifier,
  scoutNetworkCapacity,
} from "./scout-network.ts";

describe("scout network", () => {
  it("starts with one local scout and capacity 3", () => {
    const network = defaultScoutNetwork(1, 2026);
    expect(network.scouts).toHaveLength(1);
    expect(scoutNetworkCapacity(network)).toBe(3);
  });

  it("increases capacity and accuracy with elite hires", () => {
    const base = defaultScoutNetwork(1, 2026);
    const elite = scoutCandidates("elite", 1, 1, 2026)[0]!;
    const expanded = hireScout(base, elite);
    expect(scoutNetworkCapacity(expanded)).toBe(7);
    expect(scoutNetworkAccuracyModifier(expanded)).toBeGreaterThan(
      scoutNetworkAccuracyModifier(base),
    );
  });

  it("blocks hires beyond MAX_HIRED_SCOUTS", () => {
    let network = defaultScoutNetwork(1, 2026);
    const tiers = ["local", "international", "elite"] as const;
    let week = 1;
    while (network.scouts.length < MAX_HIRED_SCOUTS) {
      const tier = tiers[network.scouts.length % tiers.length]!;
      const candidate = scoutCandidates(tier, 1, week, 2026)[0]!;
      network = hireScout(network, { ...candidate, id: `${candidate.id}_fill_${network.scouts.length}` });
      week += 1;
    }
    expect(network.scouts).toHaveLength(MAX_HIRED_SCOUTS);
    const extra = scoutCandidates("elite", 1, 99, 2026)[0]!;
    const blocked = hireScout(network, extra);
    expect(blocked.scouts).toHaveLength(MAX_HIRED_SCOUTS);
  });

  it("drops hired candidates from the market list and blocks duplicate hires", () => {
    const base = defaultScoutNetwork(1, 2026);
    const local = scoutCandidates("local", 1, 4, 2026)[1]!;
    const once = hireScout(base, local);
    expect(once.scouts.some((scout) => scout.id === local.id)).toBe(true);
    const twice = hireScout(once, local);
    expect(twice.scouts).toHaveLength(once.scouts.length);
    const market = availableScoutCandidates("local", 1, 4, 2026, once);
    expect(market.some((candidate) => candidate.id === local.id)).toBe(false);
  });

  it("applies tier accuracy to observations", () => {
    const knowledge = unknownPlayer();
    const weak = applyObservationWithAccuracy(knowledge, "scout_visit_report", 0.8);
    const strong = applyObservationWithAccuracy(knowledge, "scout_visit_report", 1.3);
    if (weak.status !== "scouted" || strong.status !== "scouted") throw new Error("expected scouted");
    expect(strong.estimate.uncertaintyRange).toBeLessThan(weak.estimate.uncertaintyRange);
  });
});
