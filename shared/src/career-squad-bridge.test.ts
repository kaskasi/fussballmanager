import { describe, expect, it } from "vitest";
import { nordsternSquad } from "./seed-clubs.ts";
import {
  buildCareerEngineSquad,
  careerPositionToRole,
  mapCareerAttributes,
  scaleCareerAttribute,
} from "./career-squad-bridge.ts";
import { squadIssues } from "./squad.ts";

describe("career squad bridge", () => {
  it("maps career positions to engine roles", () => {
    expect(careerPositionToRole("LB")).toBe("FB");
    expect(careerPositionToRole("CF")).toBe("ST");
    expect(careerPositionToRole("GK")).toBe("GK");
  });

  it("scales attributes from 0-199 to 1-99", () => {
    expect(scaleCareerAttribute(0)).toBe(1);
    expect(scaleCareerAttribute(199)).toBe(99);
    expect(scaleCareerAttribute(100)).toBe(50);
  });

  it("builds a valid engine squad from career players", () => {
    const careerPlayers = Array.from({ length: 16 }, (_, index) => ({
      id: `pl_test_${index}`,
      displayName: `Player ${index}`,
      position: index === 0 ? "GK" : index < 5 ? "CB" : index < 8 ? "CM" : "CF",
      attributes: {
        shooting: 90 + index,
        passing: 88 + index,
        dribbling: 80 + index,
        pace: 75 + index,
        stamina: 82 + index,
        positioning: 84 + index,
        strength: 78 + index,
        technique: 80 + index,
        composure: 76 + index,
        gk_handling: index === 0 ? 120 : 20,
      },
      form: 0,
      fitness: 90,
      portraitSeed: index + 10,
      overall: 100 + index,
    }));

    const squad = buildCareerEngineSquad(nordsternSquad, careerPlayers);
    expect(squadIssues(squad)).toEqual([]);
    expect(squad.starters[0]?.player.id).toBe("pl_test_0");
    expect(squad.starters.some((place) => place.player.id.startsWith("pl_test_"))).toBe(true);
    expect(mapCareerAttributes(careerPlayers[1]!.attributes, "CB").goalkeeping).toBe(1);
  });
});
