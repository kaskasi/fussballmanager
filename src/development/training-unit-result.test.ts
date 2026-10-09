import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { act1AssistantTrainingPlan } from "../narrative/career-presentation.ts";
import { applyTrainingUnit } from "./pipeline-week.ts";
import { planToSessions } from "./training-units.ts";
import { collectTrainingUnitGains, highlightTrainingUnitResult } from "./training-unit-result.ts";
import { trainingUnit } from "./training-units.ts";

describe("training unit results", () => {
  it("collects sorted gains for modal display", () => {
    const player = clonePlayer();
    const plan = act1AssistantTrainingPlan();
    const sessions = planToSessions(plan);
    const after = applyTrainingUnit(player, sessions, 0, { season: 1, week: 1, masterSeed: 1 });
    const unit = trainingUnit(plan[0]!.unitId);
    const gains = collectTrainingUnitGains([player], [after], unit);
    expect(gains.length).toBeGreaterThan(0);
    expect(highlightTrainingUnitResult([player], [after], unit)?.playerId).toBe(gains[0]?.playerId);
  });
});
