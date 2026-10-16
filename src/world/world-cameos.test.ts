import { describe, expect, it } from "vitest";
import { estimateCa } from "../transfers/market-value.ts";
import { UNION_RENDSBURG_TEAM_ID } from "./world-cameos.ts";
import { generateWorld, worldCareerClubId } from "./world-generator.ts";

describe("world cameos", () => {
  it("places Axel Jaiser CM at Union Rendsburg in Oberliga", () => {
    const world = generateWorld(2026);
    const club = world.clubs.find((entry) => entry.id === UNION_RENDSBURG_TEAM_ID);
    expect(club).toMatchObject({
      name: "Union Rendsburg",
      place: "Rendsburg",
      division_id: "oberliga-nord",
    });

    const axel = world.players.find(
      (player) => player.name.first === "Axel" && player.name.last === "Jaiser",
    );
    expect(axel?.name).toEqual({ first: "Axel", last: "Jaiser" });
    expect(axel?.position).toBe("CM");
    expect(axel?.club_id).toBe(worldCareerClubId(UNION_RENDSBURG_TEAM_ID));
    expect(estimateCa(axel!.attributes, "CM")).toBeGreaterThanOrEqual(80);
  });
});
