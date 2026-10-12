import { describe, expect, it } from "vitest";
import type { BoardObjective } from "../board/board-state.ts";
import { SURVIVAL_TARGET_PLACE } from "../narrative/season-objectives.ts";
import { objectiveDisplayLabel } from "./board-display.ts";
import { setLocale } from "./index.ts";

describe("board-display", () => {
  it("localizes survival objective in English", () => {
    setLocale("en");
    const objective: BoardObjective = {
      id: "league_place",
      kind: "league_place_max",
      target: SURVIVAL_TARGET_PLACE,
      label: "Klassenerhalt — Platz 15 oder besser",
      icon: "🛡️",
    };
    expect(objectiveDisplayLabel(objective, 1)).toContain("Stay up");
  });

  it("localizes medical project objective in Chinese", () => {
    setLocale("zh-Hans");
    const objective: BoardObjective = {
      id: "project_medical",
      kind: "project",
      projectId: "medical_center",
      target: 1,
      label: "Arztzentrum im Gelände",
      icon: "medical",
    };
    expect(objectiveDisplayLabel(objective, 1)).toBe("园区医疗中心");
  });
});
