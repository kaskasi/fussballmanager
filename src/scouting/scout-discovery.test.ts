import { describe, expect, it } from "vitest";
import {
  advanceDiscoveryWeek,
  completeRegionDiscovery,
  emptyDiscovery,
  foreignClubVisibilityCount,
  isClubDirectoryVisible,
  regionScoutTier,
  canStartRegionScout,
} from "./scout-discovery.ts";
import type { ScoutBoard } from "./scout-board.ts";
import type { Player } from "../types/player.ts";
import type { WorldClub } from "../world/world-generator.ts";
const sampleClub = (overrides: Partial<WorldClub> = {}): WorldClub => ({
  id: "cl_test",
  name: "Test FC",
  short_name: "TFC",
  region: "Fördeküste",
  division_id: "oberliga-nord",
  identity: "community",
  reputation: 50,
  rivalry_ids: [],
  ...overrides,
});

describe("scout discovery", () => {
  it("shows same-division clubs in directory without region scout", () => {
    const discovery = emptyDiscovery();
    const club = sampleClub({ division_id: "regionalliga-nord" });
    expect(isClubDirectoryVisible(club, "regionalliga-nord", discovery)).toBe(true);
    expect(isClubDirectoryVisible(club, "oberliga-nord", discovery)).toBe(false);
  });

  it("unlocks foreign clubs in thirds per region tier", () => {
    const foreign = [
      sampleClub({ id: "cl_a", region: "Fördeküste" }),
      sampleClub({ id: "cl_b", region: "Fördeküste" }),
      sampleClub({ id: "cl_c", region: "Fördeküste" }),
    ];
    let discovery = emptyDiscovery();
    expect(foreignClubVisibilityCount(foreign.length, 1)).toBe(1);
    expect(
      isClubDirectoryVisible(foreign[0]!, "regionalliga-nord", discovery, foreign),
    ).toBe(false);

    discovery = completeRegionDiscovery(discovery, "foerde");
    expect(regionScoutTier(discovery, "foerde")).toBe(1);
    expect(
      isClubDirectoryVisible(foreign[0]!, "regionalliga-nord", discovery, foreign),
    ).toBe(true);
    expect(
      isClubDirectoryVisible(foreign[2]!, "regionalliga-nord", discovery, foreign),
    ).toBe(false);

    discovery = completeRegionDiscovery(discovery, "foerde");
    discovery = completeRegionDiscovery(discovery, "foerde");
    expect(regionScoutTier(discovery, "foerde")).toBe(3);
    expect(
      foreign.every((club) =>
        isClubDirectoryVisible(club, "regionalliga-nord", discovery, foreign),
      ),
    ).toBe(true);
  });

  it("allows region scout until tier 3", () => {
    let discovery = emptyDiscovery();
    expect(canStartRegionScout("foerde", discovery, null)).toBe(true);
    discovery = completeRegionDiscovery(discovery, "foerde");
    discovery = completeRegionDiscovery(discovery, "foerde");
    discovery = completeRegionDiscovery(discovery, "foerde");
    expect(canStartRegionScout("foerde", discovery, null)).toBe(false);
  });

  it("advances club scout job into pool", () => {
    const board: ScoutBoard = {
      targets: {},
      discovery: emptyDiscovery(),
      active_club_scout: { club_id: "cl_away", progress: 90 },
    };
    const rivals = [
      {
        id: "p1",
        club_id: "cl_away",
        squad_status: "pro",
      },
    ] as unknown as readonly Player[];

    const next = advanceDiscoveryWeek(board, rivals, 1);
    expect(next.discovery?.scout_pool).toContain("p1");
    expect(next.discovery?.discovered_club_ids).toContain("cl_away");
    expect(next.active_club_scout).toBeNull();
  });
});
