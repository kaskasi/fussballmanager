import { describe, expect, it } from "vitest";
import { generateWorld } from "./world-generator.ts";
import { realCityByName } from "./real-cities.ts";

describe("Hansebogen club places (world generation)", () => {
  it("assigns each Hanse club a catalog city with coordinates", () => {
    const world = generateWorld(2026);
    const hanseClubs = world.clubs.filter((club) => club.region === "Hansebogen");
    expect(hanseClubs.length).toBeGreaterThan(0);

    const places = new Set<string>();
    for (const club of hanseClubs) {
      places.add(club.place);
      const city = realCityByName(club.place);
      expect(city, `missing real city for place=${club.place} (${club.name})`).toBeDefined();
      expect(city!.worldRegion).toBe("Hansebogen");
    }

    expect(places.has("Bremen")).toBe(true);
    expect(places.has("Hamburg")).toBe(true);
  });
});
