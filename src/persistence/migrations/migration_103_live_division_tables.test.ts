import { describe, expect, it } from "vitest";
import { newGameSession, saveFromSession } from "../game-session.ts";
import { pyramidDivisionIds } from "../../sim/league-pyramid.ts";
import { migration103LiveDivisionTables } from "./migration_103_live_division_tables.ts";

describe("migration 103 — live division tables (PRD 32 slice 3)", () => {
  it("backfills the matchdays already played in every other division", () => {
    const session = newGameSession(new Date("2026-08-01T12:00:00Z"), { seed: 99 });
    const save = structuredClone(saveFromSession(session, undefined, new Date(0)));
    save.state.league = { ...save.state.league!, matchday: 6, division_results: undefined };
    const migrated = migration103LiveDivisionTables.apply(save);
    const results = migrated.state.league!.division_results!;
    for (const id of pyramidDivisionIds()) {
      if (id === migrated.state.league!.division_id) continue;
      expect(results[id]).toHaveLength(5 * 9);
    }
    expect(migrated.manifest.save_version).toBe(103);
  });

  it("writes empty tables before the first matchday", () => {
    const session = newGameSession(new Date("2026-08-01T12:00:00Z"), { seed: 99 });
    const save = structuredClone(saveFromSession(session, undefined, new Date(0)));
    const migrated = migration103LiveDivisionTables.apply(save);
    expect(Object.values(migrated.state.league!.division_results!).every((rows) => rows?.length === 0)).toBe(true);
  });
});
