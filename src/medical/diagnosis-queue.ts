import type { Injury, Player } from "../types/player.ts";
import { createInjuryForPlayer } from "../development/injury-roll.ts";
import {
  canUseRehabMinigame,
  REHAB_MINIGAME_RECOVERY_WEEK_BONUS,
} from "./rehab-minigame.ts";
import type { BodyRegion } from "./medical-symptoms.ts";
import { symptomPresentation } from "./medical-symptoms.ts";
import {
  applyPendingToPlayerInjury,
  injuryNeedsSurgery,
  normalizePendingCare,
  type PendingCarePhase,
} from "./injury-care.ts";

export interface PendingDiagnosis {
  player_id: string;
  type_id: string;
  severity: Injury["severity"];
  days_remaining: number;
  sustained_week: number;
  sustained_career_day: number;
  /** Base weeks before recovery multiplier (stored at enqueue). */
  base_weeks_remaining: number;
  phase?: PendingCarePhase;
  doctor_ready?: boolean;
  body_region?: BodyRegion;
  symptom_key?: string;
  needs_surgery?: boolean;
  surgery_weeks_remaining?: number;
}

export interface ClubMedicalState {
  pending_diagnoses: PendingDiagnosis[];
  /** Player ids that used rehab minigame bonus this game week. */
  rehab_minigame_player_ids?: string[];
  rehab_minigame_week?: { season: number; week: number };
  physio_auto_week?: { season: number; week: number };
  physio_auto_player_ids?: string[];
  physio_manual_done_ids?: string[];
  physio_manual_outcomes?: Record<string, "success" | "fail">;
}

export function defaultClubMedicalState(): ClubMedicalState {
  return { pending_diagnoses: [] };
}

export function normalizeClubMedicalState(state: ClubMedicalState | undefined): ClubMedicalState {
  if (!state) return defaultClubMedicalState();
  return {
    pending_diagnoses: [...(state.pending_diagnoses ?? [])],
    rehab_minigame_player_ids: state.rehab_minigame_player_ids
      ? [...state.rehab_minigame_player_ids]
      : undefined,
    rehab_minigame_week: state.rehab_minigame_week,
    physio_auto_week: state.physio_auto_week,
    physio_auto_player_ids: state.physio_auto_player_ids
      ? [...state.physio_auto_player_ids]
      : undefined,
    physio_manual_done_ids: state.physio_manual_done_ids
      ? [...state.physio_manual_done_ids]
      : undefined,
    physio_manual_outcomes: state.physio_manual_outcomes
      ? { ...state.physio_manual_outcomes }
      : undefined,
  };
}

export function enqueueDiagnosis(
  state: ClubMedicalState,
  entry: PendingDiagnosis,
): ClubMedicalState {
  if (state.pending_diagnoses.some((row) => row.player_id === entry.player_id)) {
    return state;
  }
  return {
    ...state,
    pending_diagnoses: [...state.pending_diagnoses, entry],
  };
}

export function tickMedicalDiagnoses(
  state: ClubMedicalState,
  players: readonly Player[],
  recoveryMultiplier: number,
  masterSeed = 0,
): { state: ClubMedicalState; players: Player[]; completed: PendingDiagnosis[] } {
  const completed: PendingDiagnosis[] = [];
  const remaining: PendingDiagnosis[] = [];
  let nextPlayers = [...players];

  for (const row of state.pending_diagnoses) {
    const normalized = normalizePendingCare(row, masterSeed);
    if (normalized.phase === "external_surgery") {
      const left = (normalized.surgery_weeks_remaining ?? 1) - 1;
      if (left > 0) {
        remaining.push({ ...normalized, surgery_weeks_remaining: left });
        continue;
      }
      completed.push(normalized);
      const injury = applyPendingToPlayerInjury(normalized, recoveryMultiplier, true);
      nextPlayers = nextPlayers.map((player) =>
        player.id === row.player_id
          ? { ...player, state: { ...player.state, injury } }
          : player,
      );
      continue;
    }
    if (normalized.phase === "awaiting_surgery" || normalized.phase === "ready_doctor") {
      remaining.push(normalized);
      continue;
    }
    const nextDays = normalized.days_remaining - 1;
    if (nextDays > 0) {
      remaining.push({ ...normalized, days_remaining: nextDays, phase: "waiting_praxis" });
      continue;
    }
    remaining.push({
      ...normalized,
      days_remaining: 0,
      phase: "ready_doctor",
      doctor_ready: true,
    });
  }

  return {
    state: { ...state, pending_diagnoses: remaining },
    players: nextPlayers,
    completed,
  };
}

export function reduceDiagnosisDay(state: ClubMedicalState, playerId: string): ClubMedicalState {
  return {
    ...state,
    pending_diagnoses: state.pending_diagnoses.map((row) =>
      row.player_id === playerId
        ? { ...row, days_remaining: Math.max(0, row.days_remaining - 1) }
        : row,
    ),
  };
}

export function recordRehabMinigameUse(
  state: ClubMedicalState,
  season: number,
  week: number,
  playerId: string,
): ClubMedicalState {
  const weekMatch =
    state.rehab_minigame_week?.season === season && state.rehab_minigame_week?.week === week;
  const used = weekMatch ? [...(state.rehab_minigame_player_ids ?? [])] : [];
  if (!used.includes(playerId)) used.push(playerId);
  return {
    ...state,
    rehab_minigame_player_ids: used,
    rehab_minigame_week: { season, week },
  };
}

export function applyRehabMinigameBonus(
  medicalState: ClubMedicalState,
  players: readonly Player[],
  season: number,
  week: number,
  playerId: string,
  success: boolean,
): { medicalState: ClubMedicalState; players: Player[] } {
  if (
    !canUseRehabMinigame(
      medicalState.rehab_minigame_player_ids,
      season,
      week,
      medicalState.rehab_minigame_week,
      playerId,
    )
  ) {
    return { medicalState, players: [...players] };
  }
  let nextState = recordRehabMinigameUse(medicalState, season, week, playerId);
  let nextPlayers = [...players];
  if (success) {
    const pending = nextState.pending_diagnoses.some((row) => row.player_id === playerId);
    if (pending) {
      nextState = reduceDiagnosisDay(nextState, playerId);
    } else {
      nextPlayers = nextPlayers.map((player) =>
        player.id === playerId
          ? reduceInjuryWeeks(player, REHAB_MINIGAME_RECOVERY_WEEK_BONUS)
          : player,
      );
    }
  }
  return { medicalState: nextState, players: nextPlayers };
}

export function reduceInjuryWeeks(player: Player, amount: number): Player {
  const injury = player.state.injury;
  if (!injury) return player;
  const weeks = Math.max(0, Math.round((injury.weeks_remaining - amount) * 10) / 10);
  if (weeks <= 0) {
    return { ...player, state: { ...player.state, injury: null } };
  }
  return {
    ...player,
    state: { ...player.state, injury: { ...injury, weeks_remaining: weeks } },
  };
}

export function extendInjuryWeeks(player: Player, extraWeeks: number): Player {
  const injury = player.state.injury;
  if (!injury || extraWeeks <= 0) return player;
  return {
    ...player,
    state: {
      ...player.state,
      injury: { ...injury, weeks_remaining: injury.weeks_remaining + extraWeeks },
    },
  };
}

export function buildPendingFromRoll(
  player: Player,
  riskScore: number,
  season: number,
  week: number,
  masterSeed: number,
  careerDay: number,
  diagnosisDays: number,
): PendingDiagnosis {
  const injury = createInjuryForPlayer(player, riskScore, season, week, masterSeed);
  const symptom = symptomPresentation(injury.type_id, player.id, masterSeed);
  return normalizePendingCare(
    {
      player_id: player.id,
      type_id: injury.type_id,
      severity: injury.severity,
      days_remaining: diagnosisDays,
      sustained_week: week,
      sustained_career_day: careerDay,
      base_weeks_remaining: injury.weeks_remaining,
      phase: "waiting_praxis",
      body_region: symptom.body_region,
      symptom_key: symptom.symptom_key,
      needs_surgery: injuryNeedsSurgery(injury.severity, injury.type_id, player.id, masterSeed),
    },
    masterSeed,
  );
}

export function applyPendingRowToPlayer(
  players: readonly Player[],
  row: PendingDiagnosis,
  recoveryMultiplier: number,
  hadSurgery: boolean,
): Player[] {
  const injury = applyPendingToPlayerInjury(row, recoveryMultiplier, hadSurgery);
  return players.map((player) =>
    player.id === row.player_id ? { ...player, state: { ...player.state, injury } } : player,
  );
}
