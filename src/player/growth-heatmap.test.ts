import { describe, expect, it } from "vitest";
import { clonePlayer } from "../types/__tests__/fixtures.ts";
import {
  heatCellInitials,
  heatTone,
  heatmapCellsForStage,
  pipelineStageFill,
  squadGrowthHeatmap,
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
});
