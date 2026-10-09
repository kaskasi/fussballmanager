import { describe, expect, it } from "vitest";
import { FORMATION_IDS } from "@fussballmanager/shared";
import { newGameSession } from "../persistence/game-session.ts";
import { suggestCareerSquad } from "./career-engine-squad.ts";

describe("suggestCareerSquad", () => {
  it("seats eleven starters for each formation", () => {
    const session = newGameSession();
    for (const formation of FORMATION_IDS) {
      const squad = suggestCareerSquad(session.players, formation);
      expect(squad).toBeDefined();
      expect(squad!.starters).toHaveLength(11);
      expect(squad!.tactics.formation).toBe(formation);
    }
  });
});
