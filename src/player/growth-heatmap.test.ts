import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  heatCellInitials,
  heatIntensity,
  heatTone,
  heatmapCellsForStage,
  heatmapPeak,
  pipelineStageFill,
  squadGrowthHeatmap,
  weeklyTrainingExtremes,
} from "./growth-heatmap.ts";

describe("growth heatmap (F2.7)", () => {
  it("counts pipeline fill by U17 / U19 / Pro and skips loans", () => {
    const u17 = clonePlayer();
    u17.id = "pl_u17";
    u17.squad_status = "u17";
    const u19 = clonePlayer();
    u19.id = "pl_u19";
    u19.squad_status = "u19";
    const pro = clonePlayer();
    const loaned = clonePlayer();
    loaned.id = "pl_loan";
    loaned.squad_status = "loaned_out";
    const otherClub = clonePlayer();
    otherClub.id = "pl_away";
    otherClub.club_id = "cl_other";

    const fill = pipelineStageFill([u17, u19, pro, loaned, otherClub], "cl_fc_nordstern");
    expect(fill.map((row) => [row.stage, row.count])).toEqual([
      ["u17", 1],
      ["u19", 1],
      ["pro", 1],
    ]);
  });

  it("maps last_week_growth to tones without inventing a formula", () => {
    expect(heatTone(null)).toBe("pending");
    expect(heatTone(0.4)).toBe("up");
    expect(heatTone(-0.2)).toBe("down");
    expect(heatTone(0)).toBe("flat");
  });

  it("scales pixel intensity from the squad peak |delta|", () => {
    expect(heatIntensity(null, 1)).toBe(0.35);
    expect(heatIntensity(1, 1)).toBeCloseTo(1);
    expect(heatIntensity(0, 1)).toBeCloseTo(0.45);

    const hot = clonePlayer();
    hot.id = "pl_a";
    hot.state.last_week_growth = 1.2;
    const mild = clonePlayer();
    mild.id = "pl_b";
    mild.state.last_week_growth = -0.4;
    expect(heatmapPeak(squadGrowthHeatmap([hot, mild], "cl_fc_nordstern"))).toBe(1.2);
  });

  it("keeps week-1 furniture as pending cells", () => {
    const youth = clonePlayer();
    youth.id = "pl_youth";
    youth.squad_status = "u17";
    youth.name = { first: "Finn", last: "Weber" };
    const pro = clonePlayer();
    pro.name = { first: "Leon", last: "Müller" };

    const cells = squadGrowthHeatmap([youth, pro], "cl_fc_nordstern");
    expect(cells).toHaveLength(2);
    expect(cells.every((cell) => cell.tone === "pending")).toBe(true);
    expect(heatmapCellsForStage(cells, "u17")[0]?.initials).toBe("WE");
    expect(heatmapCellsForStage(cells, "pro")[0]?.label).toContain("Müller");
  });

  it("sorts a stage by last week's 02.1 delta, growers first", () => {
    const hot = clonePlayer();
    hot.id = "pl_hot";
    hot.name = { first: "Max", last: "Hot" };
    hot.state.last_week_growth = 1.2;
    const cold = clonePlayer();
    cold.id = "pl_cold";
    cold.name = { first: "Ben", last: "Cold" };
    cold.state.last_week_growth = -0.3;

    const cells = squadGrowthHeatmap([cold, hot], "cl_fc_nordstern");
    expect(cells.map((cell) => cell.playerId)).toEqual(["pl_hot", "pl_cold"]);
    expect(cells[0]?.tone).toBe("up");
    expect(cells[1]?.tone).toBe("down");
  });

  it("takes initials from the display last name", () => {
    const player = clonePlayer();
    player.name = {};
    player.portrait_seed = 0;
    expect(heatCellInitials(player).length).toBeGreaterThanOrEqual(1);
  });

  it("picks three best and three worst without repeating a player", () => {
    const squad = [1.4, 1.1, 0.8, 0.2, -0.1, -0.4].map((growth, index) => {
      const player = clonePlayer();
      player.id = `pl_${index}`;
      player.name = { first: "Max", last: `P${index}` };
      player.state.last_week_growth = growth;
      return player;
    });
    const report = weeklyTrainingExtremes(squad, "cl_fc_nordstern");
    expect(report.hasData).toBe(true);
    expect(report.best.map((cell) => cell.playerId)).toEqual(["pl_0", "pl_1", "pl_2"]);
    expect(report.worst.map((cell) => cell.playerId)).toEqual(["pl_5", "pl_4", "pl_3"]);
  });

  it("uses week-so-far baseline on the training screen", () => {
    const hot = clonePlayer();
    hot.id = "pl_hot";
    hot.state.last_week_growth = -2;
    hot.state.week_start_attributes = { ...hot.attributes };
    hot.attributes.passing += 0.4;
    hot.state.week_start_key = { season: 1, week: 2 };

    const cells = squadGrowthHeatmap([hot], "cl_fc_nordstern", "weekSoFar", {
      season: 1,
      week: 2,
    });
    expect(cells[0]?.tone).toBe("up");
    expect(cells[0]?.growth).toBeCloseTo(0.4, 5);
  });

  it("stays empty before the first simulated week", () => {
    const player = clonePlayer();
    expect(weeklyTrainingExtremes([player], "cl_fc_nordstern").hasData).toBe(false);
  });
});
