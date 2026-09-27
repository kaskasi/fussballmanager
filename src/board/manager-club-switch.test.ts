import { asTeamId, NORDSTERN_ID } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { careerTeamId } from "../sim/rival-growth.ts";
import { switchManagerClub } from "./manager-club-switch.ts";

describe("switchManagerClub", () => {
  it("moves the playable squad and league club id to the new team", () => {
    const session = newGameSession();
    const targetId = asTeamId("tsv-holzweg");
    const next = switchManagerClub(session, targetId);

    expect(next.league.player_club_id).toBe(targetId);
    expect(next.clubId).toBe(careerTeamId(targetId));
    expect(next.players.every((player) => player.club_id === next.clubId || player.squad_status !== "pro")).toBe(
      true,
    );
    expect(next.players.some((player) => player.club_id === careerTeamId(NORDSTERN_ID))).toBe(false);
    expect(next.rivalPlayers.some((player) => player.club_id === careerTeamId(NORDSTERN_ID))).toBe(true);
    expect(next.matchLineup).toBeUndefined();
  });
});
