import type { MedicalMember } from "../staff/medical-staff.ts";

export const ORTHOPEDIST_AGENCY_NOTICE =
  "Die Klinikpartnerschaft sucht einen erfahrenen Orthopäden für euer Medical Center.";

export type OrthopedistHirePhase = "none" | "searching" | "candidates_ready";

export interface OrthopedistHireState {
  phase: OrthopedistHirePhase;
  /** Career week when search completes. */
  ready_career_week?: number;
}

export function defaultOrthopedistHireState(): OrthopedistHireState {
  return { phase: "none" };
}

export interface OrthopedistCandidate {
  id: string;
  name: string;
  portrait_seed: number;
  quality: number;
  intro: string;
}

const INTROS = [
  "Spezialist für Knie und Sprunggelenk — OP-Saal kennt er blind.",
  "Ehemals Nationalmannschaft — ruhige Hände unter Druck.",
  "Forschung und Praxis: schnellere Reha nach schweren Fällen.",
] as const;

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

export function orthopedistPostfachItemId(): string {
  return "medical_orthopedist_hire";
}

export function isOrthopedistPostfachItemId(itemId: string): boolean {
  return itemId === orthopedistPostfachItemId();
}

export function startOrthopedistSearch(
  state: OrthopedistHireState,
  readyCareerWeek: number,
): OrthopedistHireState {
  if (state.phase !== "none") return state;
  return { phase: "searching", ready_career_week: readyCareerWeek };
}

export function advanceOrthopedistSearch(
  state: OrthopedistHireState,
  careerWeek: number,
): OrthopedistHireState {
  if (state.phase !== "searching") return state;
  if (state.ready_career_week != null && careerWeek >= state.ready_career_week) {
    return { phase: "candidates_ready", ready_career_week: state.ready_career_week };
  }
  return state;
}

export function orthopedistCandidates(
  masterSeed: number,
  season: number,
  week: number,
): OrthopedistCandidate[] {
  const rng = mulberry32(hashSeed([masterSeed, season, week, "ortho-hire"]));
  const names = ["Prof. Dr. Stein", "Dr. Albrecht", "Dr. Menzel"];
  return names.map((name, index) => {
    const quality = Math.round(68 + rng() * 22);
    const id = `ortho_cand_${index}_${season}_${week}`;
    return {
      id,
      name,
      portrait_seed: hashSeed([id, name]),
      quality,
      intro: INTROS[index % INTROS.length] ?? INTROS[0],
    };
  });
}

export function orthopedistFromCandidate(
  candidate: OrthopedistCandidate,
  season: number,
): MedicalMember {
  return {
    id: `ortho_${candidate.id}`,
    name: candidate.name,
    role: "orthopedist",
    portrait_seed: candidate.portrait_seed,
    quality: candidate.quality,
    wage_weekly: Math.round(4_500 + candidate.quality * 120),
    contract_until_season: season + 3,
  };
}

export function clearOrthopedistHireAfterPick(): OrthopedistHireState {
  return { phase: "none" };
}

export function orthopedistAwaitingPostfach(
  hire: OrthopedistHireState,
  hasOrthopedist: boolean,
): boolean {
  return hire.phase === "candidates_ready" && !hasOrthopedist;
}
