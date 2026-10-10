/**
 * F8.2 — Medical staff (doctor, physios, orthopedist).
 */

export type MedicalHireRole = "doctor" | "physio";

export interface MedicalMember {
  id: string;
  name: string;
  role: MedicalHireRole | "orthopedist";
  portrait_seed: number;
  quality: number;
  wage_weekly: number;
  contract_until_season: number;
  legendary_id?: string;
}

export interface MedicalStaff {
  doctor: MedicalMember | null;
  physios: MedicalMember[];
  orthopedist: MedicalMember | null;
}

export interface LegendaryMedicalDef {
  id: string;
  name: string;
  role: MedicalHireRole;
  quality: number;
  trait: string;
}

export const LEGENDARY_MEDICAL: readonly LegendaryMedicalDef[] = [
  {
    id: "doc_wohlfahrt",
    name: "Dr. Hans Wohlfahrt",
    role: "doctor",
    quality: 94,
    trait: "Legende — schnellere Diagnose, −5 % Reha-Wochen",
  },
] as const;

export const MAX_PHYSIOS = 4;

const FIRST = ["Hans", "Eva", "Markus", "Julia", "Felix", "Laura", "Tim", "Nina"];
const LAST = ["Wohlfahrt", "Krämer", "Schulz", "Becker", "Vogt", "Hartmann", "Lorenz", "Brandt"];

function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

export function medicalWeeklyWage(member: MedicalMember): number {
  return member.wage_weekly;
}

export function medicalMemberWage(quality: number, legendary: boolean): number {
  const base = 2_200 + quality * 85;
  return Math.round(legendary ? base * 1.35 : base);
}

function makeMember(
  role: MedicalMember["role"],
  quality: number,
  season: number,
  rng: () => number,
  salt: number,
  legendary?: LegendaryMedicalDef,
): MedicalMember {
  const first = legendary?.name.split(" ")[0] ?? FIRST[Math.floor(rng() * FIRST.length)] ?? "Doc";
  const last =
    legendary?.name.split(" ").slice(1).join(" ") ??
    LAST[Math.floor(rng() * LAST.length)] ??
    "Team";
  const name = legendary?.name ?? `${first} ${last}`;
  const id = legendary?.id ?? `med_${role}_${season}_${salt}`;
  return {
    id,
    name,
    role,
    portrait_seed: hashSeed([id, name, role]),
    quality: legendary?.quality ?? quality,
    wage_weekly: medicalMemberWage(legendary?.quality ?? quality, Boolean(legendary)),
    contract_until_season: season + 2 + Math.floor(rng() * 2),
    ...(legendary ? { legendary_id: legendary.id } : {}),
  };
}

export function defaultMedicalStaff(): MedicalStaff {
  return { doctor: null, physios: [], orthopedist: null };
}

export function normalizeMedicalStaff(staff: MedicalStaff | undefined): MedicalStaff {
  if (!staff) return defaultMedicalStaff();
  return {
    doctor: staff.doctor ?? null,
    physios: (staff.physios ?? []).slice(0, MAX_PHYSIOS),
    orthopedist: staff.orthopedist ?? null,
  };
}

/** Slot caps by medical_center building level (0 = not built). */
export function medicalSlotCaps(buildingLevel: number): {
  doctor: number;
  physios: number;
  orthopedist: number;
} {
  if (buildingLevel <= 0) return { doctor: 0, physios: 0, orthopedist: 0 };
  if (buildingLevel === 1) return { doctor: 1, physios: 1, orthopedist: 0 };
  if (buildingLevel === 2) return { doctor: 1, physios: 3, orthopedist: 0 };
  return { doctor: 1, physios: MAX_PHYSIOS, orthopedist: 1 };
}

export function medicalStaffWageBill(staff: MedicalStaff): number {
  let sum = 0;
  if (staff.doctor) sum += staff.doctor.wage_weekly;
  if (staff.orthopedist) sum += staff.orthopedist.wage_weekly;
  for (const p of staff.physios) sum += p.wage_weekly;
  return sum;
}

export interface MedicalModifiers {
  diagnosisDays: number;
  recoveryMultiplier: number;
  injuryRiskMultiplier: number;
}

export function medicalDiagnosisDaysForBuilding(buildingLevel: number): number {
  if (buildingLevel <= 0) return 0;
  if (buildingLevel === 1) return 3;
  return 1;
}

export function medicalModifiers(
  staff: MedicalStaff,
  buildingLevel: number,
  tzPhysioStack: number,
): MedicalModifiers {
  const diagnosisDays = medicalDiagnosisDaysForBuilding(buildingLevel);
  let recoveryMultiplier = 1;
  if (buildingLevel >= 3) recoveryMultiplier *= 0.82;
  else if (buildingLevel >= 2) recoveryMultiplier *= 0.92;

  const docQ = staff.doctor?.quality ?? 0;
  if (staff.doctor?.legendary_id === "doc_wohlfahrt") recoveryMultiplier *= 0.95;
  recoveryMultiplier *= 1 - Math.min(0.12, docQ / 199 * 0.1);

  const physioAvg =
    staff.physios.length > 0
      ? staff.physios.reduce((s, p) => s + p.quality, 0) / staff.physios.length
      : 0;
  const physioCountFactor = 1 - Math.min(0.14, staff.physios.length * 0.035);
  let injuryRiskMultiplier = physioCountFactor * (1 - Math.min(0.1, physioAvg / 199 * 0.08));
  if (staff.orthopedist) injuryRiskMultiplier *= 0.94;

  injuryRiskMultiplier *= tzPhysioStack;

  if (buildingLevel <= 0) {
    return { diagnosisDays: 0, recoveryMultiplier: 1, injuryRiskMultiplier: tzPhysioStack };
  }

  return {
    diagnosisDays,
    recoveryMultiplier: Math.max(0.65, recoveryMultiplier),
    injuryRiskMultiplier: Math.max(0.72, injuryRiskMultiplier),
  };
}

export function medicalCandidates(
  role: MedicalHireRole,
  season: number,
  week: number,
  masterSeed: number,
  legendaryAlreadyHired: boolean,
): MedicalMember[] {
  const rng = mulberry32(hashSeed([masterSeed, season, week, role, "med-market"]));
  const out: MedicalMember[] = [];
  if (role === "doctor" && !legendaryAlreadyHired && rng() < 0.08) {
    out.push(makeMember("doctor", 94, season, rng, 0, LEGENDARY_MEDICAL[0]));
  }
  const qualities = [
    Math.round(52 + rng() * 16),
    Math.round(62 + rng() * 18),
    Math.round(72 + rng() * 14),
  ];
  for (let i = 0; i < qualities.length; i++) {
    out.push(makeMember(role, qualities[i]!, season, rng, i + 1));
  }
  return out;
}

export function hireMedicalDoctor(staff: MedicalStaff, candidate: MedicalMember): MedicalStaff {
  return { ...staff, doctor: { ...candidate, role: "doctor" } };
}

export function hireMedicalPhysio(staff: MedicalStaff, candidate: MedicalMember): MedicalStaff {
  if (staff.physios.length >= MAX_PHYSIOS) return staff;
  return {
    ...staff,
    physios: [...staff.physios, { ...candidate, role: "physio" }],
  };
}

export function hireMedicalOrthopedist(staff: MedicalStaff, candidate: MedicalMember): MedicalStaff {
  return { ...staff, orthopedist: { ...candidate, role: "orthopedist" } };
}

export function hasLegendaryMedicalHired(staff: MedicalStaff): boolean {
  if (staff.doctor?.legendary_id) return true;
  return staff.physios.some((p) => p.legendary_id) || Boolean(staff.orthopedist?.legendary_id);
}
