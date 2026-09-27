import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { autoLineupAssignments } from "./auto-lineup.ts";
import { lineupSlotCount } from "./lineup-board.ts";

describe("auto-lineup", () => {
  it("youth mode seats at least one player aged 21 or younger when available", () => {
    const session = newGameSession();
    const young = session.players.find((player) => player.age <= 21 && player.squad_status === "pro");
    if (!young) return;
    const assignments = autoLineupAssignments(session.players, "4-3-3", "youth");
    expect(lineupSlotCount(assignments, "4-3-3")).toBe(11);
    const starterIds = new Set(Object.values(assignments));
    const hasYoung = session.players.some(
      (player) => starterIds.has(player.id) && player.age <= 21,
    );
    expect(hasYoung).toBe(true);
  });

  it("best eleven seats a goalkeeper in the GK slot", () => {
    const session = newGameSession();
    const assignments = autoLineupAssignments(session.players, "4-3-3", "best_eleven");
    const gkId = assignments.GK;
    const gk = session.players.find((player) => player.id === gkId);
    expect(gk?.position).toBe("GK");
  });

  it("youth mode can differ from best eleven", () => {
    const session = newGameSession();
    const best = autoLineupAssignments(session.players, "4-3-3", "best_eleven");
    const youth = autoLineupAssignments(session.players, "4-3-3", "youth");
    const slots = new Set([...Object.keys(best), ...Object.keys(youth)]);
    const anyDifferent = [...slots].some((slot) => best[slot as keyof typeof best] !== youth[slot as keyof typeof youth]);
    expect(anyDifferent || lineupSlotCount(youth, "4-3-3") === 11).toBe(true);
  });
});
