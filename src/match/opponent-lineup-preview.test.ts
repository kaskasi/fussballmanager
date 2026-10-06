import { describe, expect, it } from "vitest";
import { prepareCareerMatch } from "../sim/career-match-setup.ts";
import { newGameSession } from "../persistence/game-session.ts";
import { buildClubProfile } from "../sim/club-profiles.ts";
import { buildOpponentLineupPreview } from "./opponent-lineup-preview.ts";

describe("opponent lineup preview", () => {
  it("builds opponent starters with career CA and form", () => {
    const session = newGameSession();
    const setup = prepareCareerMatch(session);
    expect(setup).not.toBeNull();
    const preview = buildOpponentLineupPreview(setup!, session.rivalPlayers);
    expect(preview).not.toBeNull();
    expect(preview!.starters.length).toBe(11);
    expect(preview!.starters[0]?.ca).toBeGreaterThan(0);
    expect(preview!.starters[0]?.ca).toBeLessThanOrEqual(199);
    expect(preview!.starters[0]?.formMark).toBeTruthy();
    expect(preview!.formation).toBeTruthy();
  });

  it("aligns top opponent CA with the club profile modal", () => {
    const session = newGameSession();
    const setup = prepareCareerMatch(session);
    expect(setup).not.toBeNull();
    const opponentId = setup!.isHome ? setup!.awayTeamId : setup!.homeTeamId;
    const preview = buildOpponentLineupPreview(setup!, session.rivalPlayers);
    const profile = buildClubProfile(opponentId, {
      rivalPlayers: session.rivalPlayers,
      worldClubs: session.world.clubs,
    });
    expect(preview).not.toBeNull();
    expect(profile).not.toBeNull();

    const topPreview = [...preview!.starters].sort((left, right) => right.ca - left.ca)[0];
    expect(topPreview?.ca).toBe(profile!.bestPlayers[0]?.ca);
  });

  it("places opponents on the opposite half from the player club", () => {
    const session = newGameSession();
    const setup = prepareCareerMatch(session);
    expect(setup).not.toBeNull();
    const preview = buildOpponentLineupPreview(setup!, session.rivalPlayers);
    expect(preview).not.toBeNull();
    const gk = preview!.starters.find((entry) => entry.slotId === "GK");
    expect(gk).toBeDefined();
    if (setup!.isHome) {
      expect(gk!.position.x).toBeGreaterThan(50);
    } else {
      expect(gk!.position.x).toBeLessThan(50);
    }
  });
});
