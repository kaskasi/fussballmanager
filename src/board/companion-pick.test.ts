import { asTeamId } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { switchManagerClub } from "./manager-club-switch.ts";
import {
  applyCompanionPick,
  pickCompanionCandidates,
  COMPANION_CANDIDATE_COUNT,
} from "./companion-pick.ts";
import { careerTeamId } from "../sim/rival-growth.ts";

describe("companion pick", () => {
  it("selects up to nine ranked pros from the old club", () => {
    const session = newGameSession();
    const pros = session.players.filter(
      (player) => player.squad_status === "pro" && player.club_id === session.clubId,
    );
    const picked = pickCompanionCandidates(
      pros,
      session.masterSeed,
      session.league.player_club_id,
      session.season,
    );
    expect(picked.length).toBeLessThanOrEqual(COMPANION_CANDIDATE_COUNT);
    expect(picked.length).toBeGreaterThan(0);
  });

  it("moves the chosen player to the new club roster", () => {
    const session = newGameSession();
    const target = asTeamId("tsv-holzweg");
    const pros = session.players.filter(
      (player) => player.squad_status === "pro" && player.club_id === session.clubId,
    );
    const candidates = pickCompanionCandidates(
      pros,
      session.masterSeed,
      session.league.player_club_id,
      session.season,
    );
    const switched = switchManagerClub(session, target);
    const choice = candidates[0]!;
    const after = applyCompanionPick(switched, choice.id);
    expect(after.players.some((player) => player.id === choice.id && player.club_id === after.clubId)).toBe(
      true,
    );
    expect(
      after.rivalPlayers.some(
        (player) => player.id === choice.id && player.club_id === careerTeamId(session.league.player_club_id),
      ),
    ).toBe(false);
  });
});
