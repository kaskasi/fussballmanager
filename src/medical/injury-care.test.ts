import { describe, expect, it } from "vitest";
import type { Player } from "../types/player.ts";
import { countMedicalHeaderAlerts, injuryNeedsSurgery } from "./injury-care.ts";
import { defaultClubMedicalState, type PendingDiagnosis } from "./diagnosis-queue.ts";

function proPlayer(id: string, injured: boolean): Player {
  return {
    id,
    club_id: "club",
    squad_status: "pro",
    state: {
      injury: injured
        ? { type_id: "muscle", severity: "minor" as const, weeks_remaining: 2, sustained_week: 1 }
        : null,
    },
  } as Player;
}

describe("countMedicalHeaderAlerts", () => {
  it("counts undiagnosed queue and active Mithelfen only", () => {
    const players = [proPlayer("a", true), proPlayer("b", true), proPlayer("c", true), proPlayer("d", true)];
    const state = {
      ...defaultClubMedicalState(),
      pending_diagnoses: [
        {
          player_id: "x",
          type_id: "knee",
          severity: "moderate",
          days_remaining: 0,
          sustained_week: 1,
          sustained_career_day: 0,
          base_weeks_remaining: 2,
          phase: "ready_doctor",
          doctor_ready: true,
        } satisfies PendingDiagnosis,
      ],
      physio_auto_week: { season: 1, week: 5 },
      physio_auto_player_ids: ["a", "b"],
      physio_manual_done_ids: ["c"],
    };
    expect(countMedicalHeaderAlerts(state, players, 1, 5, 1)).toBe(2);
  });

  it("ignores surgery queue and completed physio assist", () => {
    const players = [proPlayer("a", true), proPlayer("b", true)];
    const state = {
      ...defaultClubMedicalState(),
      pending_diagnoses: [
        {
          player_id: "y",
          type_id: "knee",
          severity: "severe",
          days_remaining: 0,
          sustained_week: 1,
          sustained_career_day: 0,
          base_weeks_remaining: 4,
          phase: "awaiting_surgery",
        } satisfies PendingDiagnosis,
      ],
      physio_auto_week: { season: 1, week: 5 },
      physio_auto_player_ids: ["a"],
      physio_manual_done_ids: ["b"],
    };
    expect(countMedicalHeaderAlerts(state, players, 1, 5, 1)).toBe(0);
  });
});

describe("injuryNeedsSurgery", () => {
  const seed = 42_424;

  it("never requires surgery for minor injuries", () => {
    for (const typeId of ["knee", "ankle", "groin", "back", "muscle"]) {
      expect(injuryNeedsSurgery("minor", typeId, "p1", seed)).toBe(false);
    }
  });

  it("always requires surgery for severe knee/ankle/groin/back", () => {
    expect(injuryNeedsSurgery("severe", "knee", "p1", seed)).toBe(true);
    expect(injuryNeedsSurgery("severe", "ankle", "p2", seed)).toBe(true);
    expect(injuryNeedsSurgery("severe", "groin", "p3", seed)).toBe(true);
    expect(injuryNeedsSurgery("severe", "back", "p4", seed)).toBe(true);
  });

  it("is deterministic per player and type", () => {
    const a = injuryNeedsSurgery("moderate", "knee", "player-a", seed);
    const b = injuryNeedsSurgery("moderate", "knee", "player-a", seed);
    const c = injuryNeedsSurgery("moderate", "knee", "player-b", seed);
    expect(a).toBe(b);
    expect(typeof a).toBe("boolean");
    expect(typeof c).toBe("boolean");
  });

  it("moderate muscle rarely needs surgery vs moderate knee", () => {
    let kneeOps = 0;
    let muscleOps = 0;
    for (let i = 0; i < 200; i++) {
      const id = `probe-${i}`;
      if (injuryNeedsSurgery("moderate", "knee", id, seed)) kneeOps += 1;
      if (injuryNeedsSurgery("moderate", "muscle", id, seed)) muscleOps += 1;
    }
    expect(kneeOps).toBeGreaterThan(muscleOps);
  });
});
