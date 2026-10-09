import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import { copyAttributes, stampWeekStartAttributesBatch } from "./growth-history.ts";
import {
  attributeHeatCellIntensity,
  formatAttributeHeatDelta,
  squadAttributeTrainingHeatmap,
} from "./attribute-training-heatmap.ts";
import { SLOT_COUNT } from "../development/weekly-plan.ts";

describe("attribute training heatmap", () => {
  it("sums pipeline gains per attribute this week", () => {
    const pro = clonePlayer();
    pro.squad_status = "pro";
    const u17 = clonePlayer();
    u17.id = "pl_u17";
    u17.squad_status = "u17";

    const baselinePro = copyAttributes(pro.attributes);
    const baselineU17 = copyAttributes(u17.attributes);
    pro.attributes.passing += 0.02;
    u17.attributes.passing += 0.01;
    pro.attributes.pace += 0.015;

    pro.state.week_start_attributes = baselinePro;
    pro.state.week_start_key = { season: 1, week: 3 };
    u17.state.week_start_attributes = baselineU17;
    u17.state.week_start_key = { season: 1, week: 3 };

    const cells = squadAttributeTrainingHeatmap([pro, u17], "cl_fc_nordstern", 1, 3);
    const passing = cells.find((cell) => cell.key === "passing");
    const pace = cells.find((cell) => cell.key === "pace");
    const shooting = cells.find((cell) => cell.key === "shooting");

    expect(passing?.gainSum).toBeCloseTo(0.03, 5);
    expect(pace?.gainSum).toBeCloseTo(0.015, 5);
    expect(shooting?.gainSum).toBe(0);
    expect(formatAttributeHeatDelta(passing!.gainSum)).toBe("+3");
  });

  it("ignores players without a matching week baseline", () => {
    const player = clonePlayer();
    player.attributes.passing += 1;
    const cells = squadAttributeTrainingHeatmap([player], "cl_fc_nordstern", 1, 2);
    expect(cells.every((cell) => cell.gainSum === 0)).toBe(true);
  });

  it("caps heat intensity early in the week vs late for the same gain", () => {
    const sum = 0.57;
    const early = attributeHeatCellIntensity(sum, 2, SLOT_COUNT);
    const late = attributeHeatCellIntensity(sum, SLOT_COUNT, SLOT_COUNT);
    expect(early).toBeLessThan(late);
    expect(early).toBeLessThan(0.55);
  });

  it("stamps baseline via batch helper for migration path", () => {
    const player = clonePlayer();
    const [stamped] = stampWeekStartAttributesBatch([player], 1, 5);
    stamped!.attributes.passing += 0.02;
    const cells = squadAttributeTrainingHeatmap([stamped!], "cl_fc_nordstern", 1, 5);
    expect(cells.find((c) => c.key === "passing")?.gainSum).toBeCloseTo(0.02, 5);
  });
});
