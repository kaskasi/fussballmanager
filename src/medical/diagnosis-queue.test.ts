import { describe, expect, it } from "vitest";
import { newGameSession } from "../persistence/game-session.ts";
import {
  buildPendingFromRoll,
  defaultClubMedicalState,
  enqueueDiagnosis,
  tickMedicalDiagnoses,
} from "./diagnosis-queue.ts";

describe("diagnosis-queue", () => {
  it("ticks days then applies injury with recovery multiplier", () => {
    const session = newGameSession();
    const player = session.players.find((p) => p.club_id === session.clubId && p.squad_status === "pro");
    expect(player).toBeDefined();
    let state = enqueueDiagnosis(
      defaultClubMedicalState(),
      buildPendingFromRoll(player!, 70, 1, 3, session.masterSeed, 100, 2),
    );
    expect(state.pending_diagnoses[0]?.days_remaining).toBe(2);
    const tick1 = tickMedicalDiagnoses(state, session.players, 0.9);
    expect(tick1.state.pending_diagnoses[0]?.days_remaining).toBe(1);
    const tick2 = tickMedicalDiagnoses(tick1.state, tick1.players, 0.9, session.masterSeed);
    expect(tick2.state.pending_diagnoses).toHaveLength(1);
    expect(tick2.state.pending_diagnoses[0]?.doctor_ready).toBe(true);
    expect(tick2.state.pending_diagnoses[0]?.phase).toBe("ready_doctor");
  });
});
