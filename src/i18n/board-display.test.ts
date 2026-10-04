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
});
