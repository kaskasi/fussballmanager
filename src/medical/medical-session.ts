import type { GameSession } from "../persistence/game-session.ts";
import { enqueueDiagnosis, tickMedicalDiagnoses } from "./diagnosis-queue.ts";
import type { PendingDiagnosis } from "./diagnosis-queue.ts";
import {
  medicalModifiers,
  normalizeMedicalStaff,
} from "../staff/medical-staff.ts";
import {
  precinctMedicalCenterLevel,
  precinctTzPhysioStack,
} from "../stadium/precinct-effects.ts";
import {
  advanceOrthopedistSearch,
  startOrthopedistSearch,
} from "./orthopedist-hire.ts";
import { merchCareerWeekIndex } from "../economy/merchandising-market.ts";

export function appendPendingDiagnoses(
  session: GameSession,
  pending: readonly PendingDiagnosis[],
): GameSession {
  if (pending.length === 0) return session;
  let medicalState = session.medicalState;
  for (const row of pending) {
    medicalState = enqueueDiagnosis(medicalState, row);
  }
  return { ...session, medicalState };
}

export function tickMedicalSessionDay(session: GameSession): GameSession {
  const level = precinctMedicalCenterLevel(session.stadium.precinct);
  const mods = medicalModifiers(
    normalizeMedicalStaff(session.medicalStaff),
    level,
    precinctTzPhysioStack(session.stadium.precinct),
  );
  const tick = tickMedicalDiagnoses(
    session.medicalState,
    session.players,
    mods.recoveryMultiplier,
    session.masterSeed,
  );
  let orthopedistHire = advanceOrthopedistSearch(
    session.orthopedistHire,
    merchCareerWeekIndex(session.season, session.week),
  );
  if (
    level >= 2 &&
    !session.medicalStaff.orthopedist &&
    orthopedistHire.phase === "none"
  ) {
    orthopedistHire = startOrthopedistSearch(
      orthopedistHire,
      merchCareerWeekIndex(session.season, session.week) + 1,
    );
  }
  return {
    ...session,
    medicalState: tick.state,
    players: tick.players,
    orthopedistHire,
  };
}

/** One diagnosis day per calendar day advanced (smart-skip / multi-day jumps). */
export function tickMedicalSessionDays(session: GameSession, days: number): GameSession {
  if (days <= 0) return session;
  let next = session;
  for (let index = 0; index < days; index++) {
    next = tickMedicalSessionDay(next);
  }
  return next;
}
