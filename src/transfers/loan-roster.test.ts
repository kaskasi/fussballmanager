import { describe, expect, it } from "vitest";
import { loanClubName } from "./loan-roster.ts";
import type { WorldClub } from "../world/world-generator.ts";

describe("loanClubName", () => {
  it("resolves career club ids to world short names", () => {
    const clubs: WorldClub[] = [
      {
        id: "world-d9b26db0-10",
        name: "Test FC Nord",
        short_name: "TFN",
        place: "Teststadt",
        region: "Fördeküste",
        division_id: "oberliga-nord",
        identity: "community",
        reputation: 30,
        rivalry_ids: [],
        kit: { primary: "#000", secondary: "#fff" },
      },
    ];
    expect(loanClubName("cl_world_d9b26db0_10", clubs)).toBe("TFN");
  });
});
