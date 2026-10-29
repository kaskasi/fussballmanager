import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { worldCareerClubId } from "../world/world-generator.ts";
import {
  AI_POSITION_MINIMUMS,
  AI_ROSTER_TARGET,
  AI_ROSTER_YOUTH_CAP,
  neededPositions,
  positionGroup,
  upkeepAiRosters,
} from "./ai-roster-upkeep.ts";
import { rivalMatchMinutes } from "./rival-growth.ts";

const session = newGameSession();
const divisionOf = () => null;

function groups(players: readonly { position: Parameters<typeof positionGroup>[0] }[]) {
  const counts = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
  for (const player of players) counts[positionGroup(player.position)] += 1;
  return counts;
}

describe("AI roster upkeep (PRD 31)", () => {
  it("fills groups below their minimum first", () => {
    const outfield = session.rivalPlayers.filter((player) => player.position !== "GK").slice(0, 10);
    const picks = neededPositions(outfield, 2);
    expect(picks).toEqual(["GK", "GK"]);
  });

  it("refills a gutted club to the target with positional minimums", () => {
    const club = session.world.clubs.find((entry) => worldCareerClubId(entry.id) !== session.clubId)!;
    const clubId = worldCareerClubId(club.id);
    const kept = session.rivalPlayers.filter(
      (player) => player.club_id !== clubId || player.position === "CF",
    );
    const result = upkeepAiRosters({
      rivalPlayers: kept,
      clubs: session.world.clubs,
      playerClubId: session.clubId,
      endingSeason: 3,
      masterSeed: session.masterSeed,
      divisionOf,
    });
    const roster = result.rivalPlayers.filter((player) => player.club_id === clubId);
    expect(roster.length).toBeGreaterThanOrEqual(AI_ROSTER_TARGET);
    const counts = groups(roster);
    for (const [group, minimum] of Object.entries(AI_POSITION_MINIMUMS)) {
      expect(counts[group as keyof typeof counts]).toBeGreaterThanOrEqual(minimum);
    }
    const arrivals = roster.filter((player) => player.id.startsWith("pl_s3c"));
    expect(arrivals.length).toBe(roster.length - 3);
    expect(new Set(result.rivalPlayers.map((player) => player.id)).size).toBe(result.rivalPlayers.length);
  });

  it("adds two to four youth per club up to the roster cap, seed-stable", () => {
    const run = () =>
      upkeepAiRosters({
        rivalPlayers: session.rivalPlayers,
        clubs: session.world.clubs,
        playerClubId: session.clubId,
        endingSeason: 1,
        masterSeed: session.masterSeed,
        divisionOf,
      });
    const first = run();
    expect(first.refill).toBe(0);
    const aiClubs = session.world.clubs.length - 1;
    expect(first.youth).toBeGreaterThanOrEqual(aiClubs);
    expect(first.youth).toBeLessThanOrEqual(aiClubs * 2);
    const youth = first.rivalPlayers.slice(session.rivalPlayers.length);
    expect(youth.every((player) => player.age >= 16 && player.age <= 17 && player.contract)).toBe(true);
    const sizes = new Map<string, number>();
    for (const player of first.rivalPlayers) sizes.set(player.club_id!, (sizes.get(player.club_id!) ?? 0) + 1);
    expect(Math.max(...sizes.values())).toBeLessThanOrEqual(AI_ROSTER_YOUTH_CAP);
    expect(run().rivalPlayers.map((player) => player.id)).toEqual(first.rivalPlayers.map((player) => player.id));
  });
});

describe("AI match minutes (PRD 31)", () => {
  it("plays the selected XI and three subs per club, ignoring id suffixes", () => {
    const minutes = rivalMatchMinutes(session.rivalPlayers);
    const clubId = session.rivalPlayers[0]!.club_id!;
    const roster = session.rivalPlayers.filter((player) => player.club_id === clubId);
    const played = roster.filter((player) => (minutes.get(player.id) ?? 0) > 0);
    expect(played.length).toBe(14);
    expect(roster.filter((player) => minutes.get(player.id) === 90).length).toBe(8);
    expect(played.filter((player) => player.position === "GK").length).toBe(1);
  });
});
