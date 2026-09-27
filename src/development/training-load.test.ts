import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  clampTrainingIntensity,
  DEFAULT_TRAINING_INTENSITY,
  squadTrainingLoad,
  trainingIntensityMultiplier,
} from "./training-load.ts";

describe("training load", () => {
  it("clamps intensity to the tactics band", () => {
    expect(clampTrainingIntensity(50)).toBe(80);
    expect(clampTrainingIntensity(150)).toBe(130);
    expect(trainingIntensityMultiplier(100)).toBe(1);
    expect(trainingIntensityMultiplier(DEFAULT_TRAINING_INTENSITY)).toBe(1);
  });

  it("flags risk when many pros are tired at high intensity", () => {
    const clubId = "cl_fc_nordstern";
    const players = Array.from({ length: 4 }, () => {
      const player = clonePlayer();
      player.club_id = clubId;
      player.squad_status = "pro";
      player.state.fitness = 58;
      player.state.weekly_minutes = 85;
      return player;
    });
    const load = squadTrainingLoad(players, clubId, 125, 3);
    expect(load.ampel).toBe("risk");
    expect(load.icon).toBe("◆");
  });

  it("stays green for a fresh squad at moderate intensity", () => {
    const clubId = "cl_fc_nordstern";
    const player = clonePlayer();
    player.club_id = clubId;
    player.squad_status = "pro";
    player.state.fitness = 92;
    player.state.weekly_minutes = 45;
    const load = squadTrainingLoad([player], clubId, 95, 1);
    expect(load.ampel).toBe("good");
    expect(load.icon).toBe("●");
  });
});
