import type { PlayerName } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import {
  campLeaderPortraitSeed,
  type CampDayStamp,
  type CampLeaderHireState,
  type CampLeaderRecord,
  type YouthCamp,
} from "./satellite-camps.ts";

export const CAMP_LEADER_AGENCY_NOTICE =
  "Eine Agentur wurde beauftragt, geeignete Kandidaten für die Camp-Leitung zu finden.";

export const CAMP_LEADER_WORKDAYS_REQUIRED = 5;

export interface CampLeaderCandidate {
  id: string;
  name: PlayerName;
  portrait_seed: number;
  languages: readonly string[];
  intro: readonly string[];
  training_mod: number;
  mental_mod: number;
  disqualified: boolean;
  disqualifyReason?: string;
}

const CAMP_LEADER_LANGUAGES = [
  "Deutsch",
  "Englisch",
  "Spanisch",
  "Portugiesisch",
  "Französisch",
  "Niederländisch",
  "Polnisch",
  "Türkisch",
  "Kroatisch",
  "Italienisch",
  "Arabisch",
] as const;

const CAMP_LEADER_FIRST = [
  "Marco",
  "James",
  "Carlos",
  "André",
  "David",
  "Luca",
  "Samir",
  "Nikos",
  "Oliver",
  "Yusuf",
  "Henrik",
  "Mateo",
  "Priya",
  "Kwame",
  "Elena",
] as const;

const CAMP_LEADER_LAST = [
  "Fischer",
  "Bennett",
  "Silva",
  "Weber",
  "Costa",
  "Nguyen",
  "Okonkwo",
  "Petrov",
  "Schmidt",
  "Almeida",
  "Kowalski",
  "Rossi",
  "Müller",
  "Diallo",
  "Santos",
] as const;

function hashCampKey(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 0x9e3779b1);
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

export function isWorkday(weekday: number): boolean {
  return weekday >= 1 && weekday <= 5;
}

function compareDay(a: CampDayStamp, b: CampDayStamp): number {
  if (a.season !== b.season) return a.season - b.season;
  if (a.week !== b.week) return a.week - b.week;
  return a.weekday - b.weekday;
}

export function advanceCalendarDay(day: CampDayStamp): CampDayStamp {
  if (day.weekday < 7) {
    return { ...day, weekday: day.weekday + 1 };
  }
  return { season: day.season, week: day.week + 1, weekday: 1 };
}

/** Workdays strictly after `from` through `to` (inclusive of `to` when it is a workday). */
export function workdaysElapsed(from: CampDayStamp, to: CampDayStamp): number {
  if (compareDay(from, to) >= 0) return 0;
  let count = 0;
  let cursor = { ...from };
  for (let guard = 0; guard < 400; guard++) {
    cursor = advanceCalendarDay(cursor);
    if (compareDay(cursor, to) > 0) break;
    if (isWorkday(cursor.weekday)) count++;
  }
  return count;
}

export function shouldOpenLeaderCandidates(commissionedAt: CampDayStamp, now: CampDayStamp): boolean {
  return workdaysElapsed(commissionedAt, now) >= CAMP_LEADER_WORKDAYS_REQUIRED;
}

export function candidateSetId(campId: string, commissionedAt: CampDayStamp): string {
  return `${campId}:${commissionedAt.season}:${commissionedAt.week}:${commissionedAt.weekday}`;
}

export function defaultCampLeaderProfile(campId: string, masterSeed: number): CampLeaderRecord {
  const portrait_seed = campLeaderPortraitSeed(campId, masterSeed);
  const first = CAMP_LEADER_FIRST[portrait_seed % CAMP_LEADER_FIRST.length] ?? CAMP_LEADER_FIRST[0]!;
  const last =
    CAMP_LEADER_LAST[Math.floor(portrait_seed / CAMP_LEADER_FIRST.length) % CAMP_LEADER_LAST.length] ??
    CAMP_LEADER_LAST[0]!;
  return { first, last, portrait_seed, training_mod: 0, mental_mod: 0 };
}

function pickName(random: () => number, used: Set<string>): PlayerName {
  for (let attempt = 0; attempt < 24; attempt++) {
    const first = CAMP_LEADER_FIRST[Math.floor(random() * CAMP_LEADER_FIRST.length)]!;
    const last = CAMP_LEADER_LAST[Math.floor(random() * CAMP_LEADER_LAST.length)]!;
    const key = `${first}:${last}`;
    if (used.has(key)) continue;
    used.add(key);
    return { first, last };
  }
  const seed = Math.floor(random() * 1_000_000);
  return {
    first: CAMP_LEADER_FIRST[seed % CAMP_LEADER_FIRST.length]!,
    last: CAMP_LEADER_LAST[seed % CAMP_LEADER_LAST.length]!,
  };
}

type ProfileKind = "solid" | "tradeoff" | "bad";

function profileForSlot(slot: number, random: () => number): {
  kind: ProfileKind;
  training_mod: number;
  mental_mod: number;
  disqualified: boolean;
  disqualifyReason?: string;
} {
  if (slot === 2) {
    return {
      kind: "bad",
      training_mod: -0.05,
      mental_mod: 0,
      disqualified: true,
      disqualifyReason: "Selbst ausgeschieden",
    };
  }
  if (slot === 1) {
    const highTraining = random() > 0.5;
    return highTraining
      ? { kind: "tradeoff", training_mod: 0.1, mental_mod: -0.05, disqualified: false }
      : { kind: "tradeoff", training_mod: -0.03, mental_mod: 0.08, disqualified: false };
  }
  return { kind: "solid", training_mod: 0.05, mental_mod: 0.03, disqualified: false };
}

function pickLanguages(random: () => number): readonly string[] {
  const count = 2 + Math.floor(random() * 2);
  const pool = [...CAMP_LEADER_LANGUAGES];
  const picked: string[] = [];
  for (let index = 0; index < count && pool.length > 0; index++) {
    const slot = Math.floor(random() * pool.length);
    picked.push(pool.splice(slot, 1)[0]!);
  }
  return picked;
}

export function formatCampLeaderLanguages(languages: readonly string[]): string {
  return `Sprachen: ${languages.join(", ")}`;
}

function introForProfile(
  name: PlayerName,
  profile: ReturnType<typeof profileForSlot>,
): readonly string[] {
  const full = formatPlayerName({ name, portrait_seed: 0 });
  if (profile.disqualified) {
    return [
      `${full} hat in Portugal und Ghana Jugendprojekte begleitet.`,
      "Er setzt auf laute Ansprache und kurze Trainingseinheiten.",
      "Seine Referenzen nennen unregelmäßige Anwesenheit und wenig Dokumentation.",
      "Im Gespräch betont er, dass er lieber Freizeitliga coacht.",
      "Er bricht ab: „Ich bin nicht der Richtige für ein ganzes Jahr vor Ort.“",
    ];
  }
  if (profile.kind === "tradeoff" && profile.training_mod > 0.07) {
    return [
      `${full} kommt aus einem akademischen Netzwerk in Spanien.`,
      "Er strukturiert Wochenpläne streng und arbeitet eng mit Eltern zusammen.",
      "Frühere Camps loben seine Disziplin am Platz und klare Tageszeiten.",
      "Er reist gern zwischen Standorten und kennt mehrere Jugend-Ligen.",
      "Er möchte ein Jahr vor Ort bleiben und das Projekt mit aufbauen.",
    ];
  }
  if (profile.kind === "tradeoff" && profile.mental_mod > 0) {
    return [
      `${full} war Betreuer in einer Schweizer Boarding-School-Akademie.`,
      "Er kennt den Alltag fern der Heimat und achtet auf Struktur außerhalb des Trainings.",
      "Spieler beschreiben ihn als geduldig, wenn Neuzugänge ankommen.",
      "Er dokumentiert Gespräche mit Familien und lokalen Partnern.",
      "Er sucht ein langfristiges Projekt mit festem Tagesrhythmus.",
    ];
  }
  return [
    `${full} leitet seit acht Jahren ein Nachwuchscamp in den Niederlanden.`,
    "Er kombiniert Technikblöcke mit klaren Tagesroutinen.",
    "Eltern und Spieler loben seine ruhige, verlässliche Kommunikation.",
    "Er pflegt Kontakte zu Vereinen in mehreren Ländern.",
    "Er möchte ein Camp aufbauen, nicht nur kurze Gastspiele organisieren.",
  ];
}

export function formatCampLeaderModLabel(kind: "training" | "mental", value: number): string {
  const pct = Math.round(Math.abs(value) * 100);
  if (pct === 0) return kind === "training" ? "Standard-Training" : "Standard-Mental";
  const sign = value > 0 ? "+" : "−";
  const noun = kind === "training" ? "Jugendtraining" : "Mental-Stabilität";
  return `${sign}${pct} % ${noun}`;
}

export function generateCampLeaderCandidates(input: {
  campId: string;
  masterSeed: number;
  candidateSetId: string;
}): CampLeaderCandidate[] {
  const seed = hashCampKey(`${input.masterSeed}:${input.campId}:${input.candidateSetId}:candidates`);
  const random = mulberry32(seed);
  const used = new Set<string>();
  const out: CampLeaderCandidate[] = [];
  for (let slot = 0; slot < 3; slot++) {
    const name = pickName(random, used);
    const portrait_seed = hashCampKey(`${seed}:${slot}:${name.first}:${name.last}`);
    const profile = profileForSlot(slot, random);
    const languages = pickLanguages(random);
    out.push({
      id: `${input.candidateSetId}:${slot}`,
      name,
      portrait_seed,
      languages,
      intro: introForProfile(name, profile),
      training_mod: profile.training_mod,
      mental_mod: profile.mental_mod,
      disqualified: profile.disqualified,
      disqualifyReason: profile.disqualifyReason,
    });
  }
  return out;
}

export function campsAwaitingLeaderChoice(camps: readonly YouthCamp[]): YouthCamp[] {
  return camps.filter((camp) => camp.leader_hire === "candidates_ready" && camp.candidate_set_id);
}

export function commissionCampLeaderAgency(
  camps: readonly YouthCamp[],
  campId: string,
  now: CampDayStamp,
): YouthCamp[] {
  return camps.map((camp) => {
    if (camp.id !== campId) return camp;
    if (camp.leader_hire === "agency_pending" || camp.leader_hire === "candidates_ready") {
      return camp;
    }
    return {
      ...camp,
      leader_hire: "agency_pending" as CampLeaderHireState,
      agency_commissioned_at: { ...now },
      staffed: false,
      leader: undefined,
      candidate_set_id: undefined,
    };
  });
}

export function dismissCampLeader(camps: readonly YouthCamp[], campId: string): YouthCamp[] {
  return camps.map((camp) => {
    if (camp.id !== campId) return camp;
    return {
      ...camp,
      leader_hire: "none" as CampLeaderHireState,
      staffed: false,
      leader: undefined,
      agency_commissioned_at: undefined,
      candidate_set_id: undefined,
    };
  });
}

export function hireCampLeader(
  camps: readonly YouthCamp[],
  campId: string,
  candidate: CampLeaderCandidate,
): YouthCamp[] {
  if (candidate.disqualified) return [...camps];
  return camps.map((camp) => {
    if (camp.id !== campId) return camp;
    const leader: CampLeaderRecord = {
      first: candidate.name.first ?? "Unbekannt",
      last: candidate.name.last ?? "",
      portrait_seed: candidate.portrait_seed,
      training_mod: candidate.training_mod,
      mental_mod: candidate.mental_mod,
    };
    return {
      ...camp,
      leader_hire: "hired" as CampLeaderHireState,
      staffed: true,
      leader,
      candidate_set_id: undefined,
      agency_commissioned_at: undefined,
    };
  });
}

export function tickCampLeaderHires(camps: readonly YouthCamp[], now: CampDayStamp): YouthCamp[] {
  return camps.map((camp) => {
    if (camp.leader_hire !== "agency_pending" || !camp.agency_commissioned_at) return camp;
    if (!shouldOpenLeaderCandidates(camp.agency_commissioned_at, now)) return camp;
    const setId = candidateSetId(camp.id, camp.agency_commissioned_at);
    return {
      ...camp,
      leader_hire: "candidates_ready" as CampLeaderHireState,
      candidate_set_id: setId,
    };
  });
}

export function campLeaderDisplayName(camp: YouthCamp): string | null {
  if (camp.leader_hire !== "hired" || !camp.leader) return null;
  return formatPlayerName({ name: { first: camp.leader.first, last: camp.leader.last }, portrait_seed: camp.leader.portrait_seed });
}
