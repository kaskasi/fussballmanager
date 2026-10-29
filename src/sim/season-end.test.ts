import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { INTAKE_COUNT } from "../youth/intake-generator.ts";
import { runSeasonEnd } from "./season-end.ts";

describe("season end", () => {
  it("ages the squad and adds a new intake batch", () => {
    const session = newGameSession();
    const before = session.players.length;
    const ages = session.players.map((player) => player.age);
    const result = runSeasonEnd(session, session.season);
    expect(result.intakeCount).toBe(INTAKE_COUNT);
    expect(result.session.players.length).toBe(before + INTAKE_COUNT);
    const pros = result.session.players.filter((player) => ages.includes(player.age));
    expect(pros.length).toBeGreaterThan(0);
  });

  it("retires AI veterans into retired records with a career line (PRD 31)", () => {
    const session = newGameSession();
    const result = runSeasonEnd(session, session.season);
    const retired = result.session.retiredPlayers;
    expect(result.retiredCount).toBe(retired.length);
    expect(retired.length).toBeGreaterThan(10);
    const rivalIds = new Set(result.session.rivalPlayers.map((player) => player.id));
    for (const entry of retired) {
      expect(rivalIds.has(entry.id)).toBe(false);
      expect(entry.retired_season).toBe(session.season);
      expect(entry.career).toHaveLength(1);
      expect(entry.career[0]?.[0]).toBe(session.season);
    }
    expect(retired.every((entry) => entry.age >= 30)).toBe(true);
    const retiredIds = new Set(retired.map((entry) => entry.id));
    const listed = (result.session.transferState.listings ?? []).map((listing) => listing.player_id);
    expect(listed.some((id) => retiredIds.has(id))).toBe(false);
  });

  it("gives every player a season line and resets AI season counters", () => {
    const session = newGameSession();
    const result = runSeasonEnd(session, session.season);
    const rival = result.session.rivalPlayers[0]!;
    expect(rival.history.season_lines?.[0]?.[0]).toBe(session.season);
    expect(rival.state.season_apps).toBe(0);
    expect(rival.state.peak_ca).toBeGreaterThan(0);
    const own = result.session.players.find((player) => player.squad_status === "pro")!;
    expect(own.history.season_lines?.[0]?.[2]).toBe("regionalliga-nord");
  });

  it("retires the same players for the same seed", () => {
    const ids = () =>
      runSeasonEnd(newGameSession(), 1).session.retiredPlayers.map((entry) => entry.id);
    expect(ids()).toEqual(ids());
  });
});

describe("season end retirement exemptions (PRD 31)", () => {
  it("lets an AI veteran with an agreed move see it through", () => {
    const session = newGameSession();
    const retiredIds = runSeasonEnd(session, 1).session.retiredPlayers.map((entry) => entry.id);
    const target = retiredIds[0]!;
    const withDeal = {
      ...session,
      transferState: {
        ...session.transferState,
        scheduled_transfers: [
          { id: "st_test", player_id: target, direction: "in" as const, other_club_id: "cl_x", fee: 0 },
        ],
      },
    } as typeof session;
    const after = runSeasonEnd(withDeal, 1).session;
    expect(after.retiredPlayers.some((entry) => entry.id === target)).toBe(false);
  });
});
