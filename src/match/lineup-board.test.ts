import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { NORDSTERN_ID, sandboxPlanFromFormation } from "@fussballmanager/shared";
import {
  autoLineupAssignments,
} from "./auto-lineup.ts";
import {
  buildSquadFromAssignments,
  lineupSlotCount,
  suggestLineupAssignments,
} from "./lineup-board.ts";

describe("lineup-board", () => {
  const session = newGameSession();
  const plan = sandboxPlanFromFormation("4-3-3");
  const playerClubId = NORDSTERN_ID;

  it("suggests eleven slots for a full pro squad", () => {
    const assignments = suggestLineupAssignments(session.players, "4-3-3", playerClubId);
    expect(lineupSlotCount(assignments, "4-3-3")).toBe(11);
  });

  it("builds a valid engine squad from manual assignments", () => {
    const assignments = suggestLineupAssignments(session.players, "4-3-3", playerClubId);
    const squad = buildSquadFromAssignments(session.players, plan, assignments, playerClubId);
    expect(squad).toBeDefined();
    expect(squad!.starters).toHaveLength(11);
    expect(squad!.bench.length).toBeGreaterThanOrEqual(5);
    expect(squad!.tactics.formation).toBe("4-3-3");
  });

  it("pads bench to five when the pro squad is thin", () => {
    const assignments = suggestLineupAssignments(session.players, "2-3-5", playerClubId);
    const squad = buildSquadFromAssignments(
      session.players,
      { ...plan, formation: "2-3-5" },
      assignments,
      playerClubId,
    );
    expect(squad?.bench.length).toBeGreaterThanOrEqual(5);
  });

  it("auto-lineup modes fill all slots", () => {
    for (const mode of ["best_eleven", "rotation", "youth"] as const) {
      const assignments = autoLineupAssignments(session.players, "4-4-2", mode);
      expect(lineupSlotCount(assignments, "4-4-2")).toBe(11);
    }
  });

});
