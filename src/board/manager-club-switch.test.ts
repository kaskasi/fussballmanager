import { asTeamId, NORDSTERN_ID } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { careerTeamId } from "../sim/rival-growth.ts";
import { switchManagerClub } from "./manager-club-switch.ts";
import { SUNDAY } from "../sim/day-calendar.ts";
import { simulateGameWeek } from "../sim/week-pipeline.ts";

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

  it("resets club pipeline and seeds new youth when accepting a job", () => {
    const session = newGameSession();
    const oldStadiumName = session.stadium.name;
    session.stadium = { ...session.stadium, name: "Custom KFC Arena", upgrade_levels: { vip: 2 } };
    const oldYouthIds = new Set(
      session.players.filter((p) => p.squad_status === "u17" || p.squad_status === "u19").map((p) => p.id),
    );
    const targetId = asTeamId("tsv-holzweg");
    const next = switchManagerClub(session, targetId);

    expect(next.stadium.name).not.toBe("Custom KFC Arena");
    expect(next.stadium.name).not.toBe(oldStadiumName);
    expect(Object.keys(next.stadium.upgrade_levels ?? {})).toHaveLength(0);
    expect(next.transferState.negotiations ?? []).toHaveLength(0);
    const youth = next.players.filter((p) => p.squad_status === "u17" || p.squad_status === "u19");
    expect(youth.length).toBe(24);
    expect(youth.every((p) => oldYouthIds.has(p.id))).toBe(false);
    expect(youth.every((p) => p.club_id === next.clubId)).toBe(true);
  });

  it("can simulate a week after switching clubs", async () => {
    const session = switchManagerClub(newGameSession(), asTeamId("tsv-holzweg"));
    session.weekday = SUNDAY;
    session.week = 1;
    const result = await simulateGameWeek(session);
    expect(result.session.week).toBe(2);
  });
});
