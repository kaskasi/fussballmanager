import { describe, expect, it } from "vitest";
import { NORDSTERN_TEAM_ID } from "../../world/world-generator.ts";
import {
  deriveClubKitColors,
  PLAYER_CLUB_KIT_PRIMARY,
} from "../../world/club-kit.ts";

describe("deriveClubKitColors", () => {
  it("uses rasen green for the player club", () => {
    const kit = deriveClubKitColors(2026, NORDSTERN_TEAM_ID, 0);
    expect(kit.primary).toBe(PLAYER_CLUB_KIT_PRIMARY);
  });

  it("is stable for the same seed and index", () => {
    const a = deriveClubKitColors(90210, "world-deadbeef-3", 3);
    const b = deriveClubKitColors(90210, "world-deadbeef-3", 3);
    expect(a).toEqual(b);
  });

  it("varies by club index", () => {
    const a = deriveClubKitColors(90210, "world-aaa-1", 1);
    const b = deriveClubKitColors(90210, "world-bbb-2", 2);
    expect(a.primary).not.toBe(b.primary);
  });
});
