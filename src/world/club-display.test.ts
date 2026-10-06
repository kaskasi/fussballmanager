import { asTeamId } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { clubPlaceName, clubNameFromWorld } from "./club-display.ts";
import { NORDSTERN_TEAM_ID } from "./world-generator.ts";

describe("club-display", () => {
  it("reads place from world clubs for league labels", () => {
    const clubs = [
      {
        id: NORDSTERN_TEAM_ID,
        name: "FC Nordstern",
        short_name: "NOR",
        place: "Kiel",
        region: "Fördeküste",
        division_id: "regionalliga-nord" as const,
        identity: "community" as const,
        reputation: 35,
        rivalry_ids: [],
      },
    ];
    const teamId = asTeamId(NORDSTERN_TEAM_ID);
    expect(clubPlaceName(teamId, clubs)).toBe("Kiel");
    expect(clubNameFromWorld(teamId, clubs)).toBe("FC Nordstern");
  });
});
