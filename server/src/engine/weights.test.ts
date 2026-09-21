import { describe, expect, it } from "vitest";
import { openPlayWeights } from "./weights.ts";

describe("openPlayWeights", () => {
  it("raises duel weight when the defender is close and pressing is high", () => {
    const loose = openPlayWeights({
      distanceToDefender: 22,
      pressing: 30,
      tempo: 50,
      mentality: 50,
      passing: 70,
      dribbling: 60,
      pace: 60,
      form: 60,
      fatigue: 10,
    });
    const pressed = openPlayWeights({
      distanceToDefender: 4,
      pressing: 85,
      tempo: 50,
      mentality: 50,
      passing: 70,
      dribbling: 60,
      pace: 60,
      form: 60,
      fatigue: 10,
    });
    expect(pressed.duel).toBeGreaterThan(loose.duel);
    expect(loose.duel).toBe(0);
  });

  it("favours carry when mentality, dribbling, and pace are high", () => {
    const cautious = openPlayWeights({
      distanceToDefender: 18,
      pressing: 40,
      tempo: 40,
      mentality: 30,
      passing: 80,
      dribbling: 40,
      pace: 40,
      form: 50,
      fatigue: 10,
    });
    const direct = openPlayWeights({
      distanceToDefender: 18,
      pressing: 40,
      tempo: 70,
      mentality: 80,
      passing: 50,
      dribbling: 80,
      pace: 85,
      form: 70,
      fatigue: 5,
    });
    expect(direct.carry / direct.pass).toBeGreaterThan(
      cautious.carry / cautious.pass,
    );
  });
});
