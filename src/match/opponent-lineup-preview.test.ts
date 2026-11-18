import { describe, expect, it } from "vitest";
import { prepareCareerMatch } from "../sim/career-match-setup.ts";
import { newGameSession } from "../persistence/game-session.ts";
import { buildClubProfile } from "../sim/club-profiles.ts";
import { buildOpponentLineupPreview } from "./opponent-lineup-preview.ts";
import { applyMatchCards } from "../discipline/suspensions.ts";
import { rivalPlayersForTeam } from "../sim/rival-engine-squad.ts";

describe("opponent lineup preview", () => {
  it("builds opponent starters with career CA and form", () => {
    const session = newGameSession();
    session.week = 1;
    const setup = prepareCareerMatch(session);
    expect(setup).not.toBeNull();
    const preview = buildOpponentLineupPreview(setup!, session.rivalPlayers);
    expect(preview).not.toBeNull();
    expect(preview!.starters.length).toBe(11);
    expect(preview!.starters[0]?.ca).toBeGreaterThan(0);
    expect(preview!.starters[0]?.ca).toBeLessThanOrEqual(199);
    expect(preview!.starters[0]?.formDisplay).toMatch(/^\d+\.\d$/);
    expect(preview!.starters[0]?.playerId).toBeTruthy();
    expect(preview!.formation).toBeTruthy();
  });

  it("aligns top opponent CA with the club profile modal", () => {
    const session = newGameSession();
    session.week = 1;
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
    session.week = 1;
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

  it("lists banned opponents and keeps them out of the starters (PRD 34)", () => {
    const session = newGameSession();
    session.week = 1;
    const setup = prepareCareerMatch(session)!;
    const opponentId = setup.isHome ? setup.awayTeamId : setup.homeTeamId;
    const before = buildOpponentLineupPreview(setup, session.rivalPlayers)!;
    expect(before.suspended).toEqual([]);

    const bannedId = before.starters[0]!.playerId;
    const rivals = session.rivalPlayers.map((player) =>
      player.id === bannedId ? applyMatchCards(player, { yellowCards: 0, redCards: 1 }).player : player,
    );
    expect(rivalPlayersForTeam(rivals, opponentId).some((player) => player.id === bannedId)).toBe(true);

    const after = buildOpponentLineupPreview(setup, rivals)!;
    expect(after.suspended).toEqual([{ playerId: bannedId, name: expect.any(String), matches: 2 }]);
    expect(after.starters.map((entry) => entry.playerId)).not.toContain(bannedId);
  });
});
