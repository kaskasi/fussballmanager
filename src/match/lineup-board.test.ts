import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import { applySandboxPlan, kickoffLineup, NORDSTERN_ID, sandboxPlanFromFormation } from "@fussballmanager/shared";
import {
  autoLineupAssignments,
} from "./auto-lineup.ts";
import {
  buildSquadFromAssignments,
  lineupSlotCount,
  normalizeMatchLineup,
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

  it("plays a moved slot in its zone: centre-back to libero, centre-mid to DM (F1.6)", () => {
    const assignments = suggestLineupAssignments(session.players, "4-4-2", playerClubId);
    const moved = { ...sandboxPlanFromFormation("4-4-2"), slotZones: { LCB: "SW", RCM: "DM" } as const };
    const squad = buildSquadFromAssignments(session.players, moved, assignments, playerClubId)!;
    expect(squad.tactics.slotZones).toEqual({ LCB: "SW", RCM: "DM" });
    const roleOf = (slot: string) => squad.starters.find((place) => place.slot === slot)?.player.role;
    expect(roleOf("LCB")).toBe("CB");
    expect(roleOf("RCM")).toBe("DM");
    // The match wrapper re-seats on the plan: the moved slots keep their players and zones.
    const seated = applySandboxPlan(squad, moved);
    expect(seated.starters.map((place) => place.player.id)).toEqual(squad.starters.map((place) => place.player.id));
    const kickoff = kickoffLineup(seated, "home");
    const libero = kickoff.find((place) => place.slot === "LCB")!;
    const partner = kickoff.find((place) => place.slot === "RCB")!;
    expect(libero.position.x).toBeLessThan(partner.position.x);
  });

  it("drops zone moves that clash or put an outfielder in goal", () => {
    const lineup = normalizeMatchLineup(
      {
        formation: "4-3-3",
        assignments: {},
        plan: { ...plan, slotZones: { LCB: "GK", RCB: "DM", ST: "SW", LW: "SW" } as never },
      },
      session.players,
      plan,
    );
    // Two moves into one zone: the earlier slot in formation order (LW before ST) keeps it.
    expect(lineup.plan.slotZones).toEqual({ LW: "SW" });
  });

  it("auto-lineup modes fill all slots", () => {
    for (const mode of ["best_eleven", "rotation", "youth"] as const) {
      const assignments = autoLineupAssignments(session.players, "4-4-2", mode);
      expect(lineupSlotCount(assignments, "4-4-2")).toBe(11);
    }
  });

});
