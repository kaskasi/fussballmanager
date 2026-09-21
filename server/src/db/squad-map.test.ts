import { SEED_MATCHUP, squadIssues } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { recordsFromSquad, squadFromRecords } from "./squad-map.ts";

describe("squad records", () => {
  it("round-trips both seed squads", () => {
    for (const original of [SEED_MATCHUP.home, SEED_MATCHUP.away]) {
      const { club, players } = recordsFromSquad(original);
      const restored = squadFromRecords(club, players);
      expect(squadIssues(restored)).toEqual([]);
      expect(restored.team).toEqual(original.team);
      expect(restored.tactics).toEqual(original.tactics);
      expect(restored.starters.map((place) => place.player.id)).toEqual(
        original.starters.map((place) => place.player.id),
      );
      expect(restored.bench.map((player) => player.id)).toEqual(
        original.bench.map((player) => player.id),
      );
    }
  });
});
