import type { Injury, Player } from "../types/player.ts";
import type { MedicalStaff } from "../staff/medical-staff.ts";
import type { PendingDiagnosis, ClubMedicalState } from "./diagnosis-queue.ts";
import { symptomPresentation } from "./medical-symptoms.ts";
import { injuryTypeLabel } from "../development/injury-roll.ts";

export type PendingCarePhase =
  | "waiting_praxis"
  | "ready_doctor"
  | "awaiting_surgery"
  | "external_surgery";

function hashSeed(parts: readonly (string | number)[]): number {
  let hash = 0;
  for (const part of parts) {
    const text = String(part);
    for (let index = 0; index < text.length; index++) {
      hash = Math.imul(hash ^ text.charCodeAt(index), 0x9e3779b1);
    }
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function physioAutoSlotsPerWeek(medicalCenterLevel: number): number {
  if (medicalCenterLevel <= 0) return 0;
  if (medicalCenterLevel === 1) return 2;
  if (medicalCenterLevel === 2) return 4;
  return 6;
}

export function canOperateInHouse(medicalCenterLevel: number, staff: MedicalStaff): boolean {
  return medicalCenterLevel >= 3 && Boolean(staff.orthopedist);
}

/** Moderate: roll must exceed threshold to require OP (lower = more ops). */
const SURGERY_MODERATE_THRESHOLD: Record<string, number> = {
  knee: 0.22,
  ankle: 0.42,
  groin: 0.38,
  back: 0.72,
  muscle: 0.88,
};

/** Severe: roll must exceed threshold when not always (knee/ankle/groin/back always OP). */
const SURGERY_SEVERE_THRESHOLD: Record<string, number> = {
  muscle: 0.55,
};

export function injuryNeedsSurgery(
  severity: Injury["severity"],
  typeId: string,
  playerId: string,
  masterSeed: number,
): boolean {
  if (severity === "minor") return false;
  const roll = mulberry32(hashSeed([masterSeed, playerId, typeId, severity, "surgery"]))();
  if (severity === "severe") {
    if (typeId === "knee" || typeId === "ankle" || typeId === "groin" || typeId === "back") {
      return true;
    }
    const cut = SURGERY_SEVERE_THRESHOLD[typeId] ?? 1;
    return roll > cut;
  }
  const cut = SURGERY_MODERATE_THRESHOLD[typeId] ?? 0.95;
  return roll > cut;
}

export function rehabWeeksAfterCare(baseWeeks: number, severity: Injury["severity"], hadSurgery: boolean): number {
  let weeks = baseWeeks;
  if (hadSurgery && severity === "severe") weeks = Math.max(weeks, 8 + Math.floor(baseWeeks * 0.5));
  if (hadSurgery) weeks = Math.round(weeks * 1.15);
  return Math.max(1, weeks);
}

export function normalizePendingCare(row: PendingDiagnosis, masterSeed: number): PendingDiagnosis {
  const phase = row.phase ?? (row.doctor_ready ? "ready_doctor" : "waiting_praxis");
  const symptom =
    row.body_region && row.symptom_key
      ? { body_region: row.body_region, symptom_key: row.symptom_key }
      : symptomPresentation(row.type_id, row.player_id, masterSeed);
  return {
    ...row,
    phase,
    doctor_ready: row.doctor_ready ?? phase === "ready_doctor",
    body_region: symptom.body_region,
    symptom_key: symptom.symptom_key,
    needs_surgery: row.needs_surgery ?? injuryNeedsSurgery(row.severity, row.type_id, row.player_id, masterSeed),
    surgery_weeks_remaining: row.surgery_weeks_remaining,
  };
}

export function pendingFromExistingInjury(
  player: Player,
  injury: Injury,
  masterSeed: number,
): PendingDiagnosis {
  const symptom = symptomPresentation(injury.type_id, player.id, masterSeed);
  return normalizePendingCare(
    {
      player_id: player.id,
      type_id: injury.type_id,
      severity: injury.severity,
      days_remaining: 0,
      sustained_week: injury.sustained_week,
      sustained_career_day: 0,
      base_weeks_remaining: injury.weeks_remaining,
      phase: "ready_doctor",
      doctor_ready: true,
      body_region: symptom.body_region,
      symptom_key: symptom.symptom_key,
    },
    masterSeed,
  );
}

export function applyPendingToPlayerInjury(
  row: PendingDiagnosis,
  recoveryMultiplier: number,
  hadSurgery: boolean,
): Injury {
  const base = rehabWeeksAfterCare(row.base_weeks_remaining, row.severity, hadSurgery);
  const weeks = Math.max(1, Math.round(base * recoveryMultiplier));
  return {
    type_id: row.type_id,
    severity: row.severity,
    weeks_remaining: weeks,
    sustained_week: row.sustained_week,
  };
}

export function removePending(state: ClubMedicalState, playerId: string): ClubMedicalState {
  return {
    ...state,
    pending_diagnoses: state.pending_diagnoses.filter((row) => row.player_id !== playerId),
  };
}

export function completeDoctorExam(
  state: ClubMedicalState,
  row: PendingDiagnosis,
  medicalCenterLevel: number,
  staff: MedicalStaff,
  masterSeed: number,
): { state: ClubMedicalState; players?: Player[]; nextPhase: "surgery" | "external" | "rehab" | null } {
  const normalized = normalizePendingCare(row, masterSeed);
  if (normalized.phase !== "ready_doctor" && !normalized.doctor_ready) {
    return { state, nextPhase: null };
  }
  const needs = normalized.needs_surgery ?? injuryNeedsSurgery(normalized.severity, normalized.type_id, normalized.player_id, masterSeed);
  if (needs && !canOperateInHouse(medicalCenterLevel, staff)) {
    const updated: PendingDiagnosis = {
      ...normalized,
      phase: "external_surgery",
      needs_surgery: true,
      surgery_weeks_remaining: 2,
      doctor_ready: false,
    };
    return {
      state: {
        ...state,
        pending_diagnoses: state.pending_diagnoses.map((entry) =>
          entry.player_id === row.player_id ? updated : entry,
        ),
      },
      nextPhase: "external",
    };
  }
  if (needs && canOperateInHouse(medicalCenterLevel, staff)) {
    const updated: PendingDiagnosis = {
      ...normalized,
      phase: "awaiting_surgery",
      needs_surgery: true,
      doctor_ready: false,
    };
    return {
      state: {
        ...state,
        pending_diagnoses: state.pending_diagnoses.map((entry) =>
          entry.player_id === row.player_id ? updated : entry,
        ),
      },
      nextPhase: "surgery",
    };
  }
  return { state: removePending(state, row.player_id), nextPhase: "rehab" };
}

export function completeInHouseSurgery(
  state: ClubMedicalState,
  row: PendingDiagnosis,
): ClubMedicalState {
  return removePending(state, row.player_id);
}

export function diagnosisRevealLabel(row: PendingDiagnosis): string {
  return injuryTypeLabel(row.type_id);
}

export function countMedicalHeaderAlerts(
  state: ClubMedicalState,
  players: readonly Player[],
  medicalCenterLevel: number,
): number {
  let count = 0;
  for (const row of state.pending_diagnoses) {
    if (row.phase === "ready_doctor" || row.doctor_ready) count += 1;
    else if (row.phase === "waiting_praxis") count += 1;
    else if (row.phase === "awaiting_surgery") count += 1;
  }
  const rehabIds = players.filter((p) => p.state.injury).map((p) => p.id);
  const auto = physioAutoSlotsPerWeek(medicalCenterLevel);
  if (rehabIds.length > auto) count += rehabIds.length - auto;
  return count;
}

export function physioManualPlayerIds(
  state: ClubMedicalState,
  players: readonly Player[],
  season: number,
  week: number,
  medicalCenterLevel: number,
): string[] {
  const rehab = players.filter((p) => p.state.injury).map((p) => p.id);
  const auto = physioAutoSlotsPerWeek(medicalCenterLevel);
  const weekMatch =
    state.physio_auto_week?.season === season && state.physio_auto_week?.week === week;
  const autoIds = weekMatch ? (state.physio_auto_player_ids ?? []) : [];
  const done = weekMatch ? (state.physio_manual_done_ids ?? []) : [];
  const needManual = rehab.filter((id) => !autoIds.includes(id) && !done.includes(id));
  if (rehab.length <= auto) return [];
  return needManual.slice(0, Math.max(0, rehab.length - auto));
}

export function startPhysioWeek(
  state: ClubMedicalState,
  players: readonly Player[],
  season: number,
  week: number,
  medicalCenterLevel: number,
): ClubMedicalState {
  const rehab = players.filter((p) => p.state.injury).map((p) => p.id);
  const auto = physioAutoSlotsPerWeek(medicalCenterLevel);
  const autoIds = rehab.slice(0, auto);
  return {
    ...state,
    physio_auto_week: { season, week },
    physio_auto_player_ids: autoIds,
    physio_manual_done_ids: [],
    physio_manual_outcomes: {},
  };
}

export function physioManualOutcomeForPlayer(
  state: ClubMedicalState,
  season: number,
  week: number,
  playerId: string,
): "success" | "fail" | null {
  const weekMatch =
    state.physio_auto_week?.season === season && state.physio_auto_week?.week === week;
  if (!weekMatch) return null;
  if (!(state.physio_manual_done_ids ?? []).includes(playerId)) return null;
  return state.physio_manual_outcomes?.[playerId] ?? null;
}

export function markPhysioManualDone(
  state: ClubMedicalState,
  playerId: string,
  success: boolean,
): ClubMedicalState {
  const done = [...(state.physio_manual_done_ids ?? [])];
  if (!done.includes(playerId)) done.push(playerId);
  return {
    ...state,
    physio_manual_done_ids: done,
    physio_manual_outcomes: {
      ...(state.physio_manual_outcomes ?? {}),
      [playerId]: success ? "success" : "fail",
    },
  };
}
