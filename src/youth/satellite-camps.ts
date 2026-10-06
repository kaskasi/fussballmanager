import type { Player, PlayerName } from "../types/player.ts";
import { generatePlayerName, formatPlayerName } from "../types/player-display.ts";
import { seasonCalendarYear } from "../sim/season-label.ts";
import { buildAcademyCohort } from "./intake-generator.ts";
import { isHqYouth, withYouthSite, YOUTH_SITE_HQ } from "./youth-site.ts";

export interface YouthCampNation {
  id: string;
  code: string;
  flag: string;
  label: string;
  region: string;
  cost: number;
  upkeepWeekly: number;
}

export type CampLeaderHireState = "none" | "agency_pending" | "candidates_ready" | "hired";

export interface CampDayStamp {
  season: number;
  week: number;
  weekday: number;
}

export interface CampLeaderRecord {
  first: string;
  last: string;
  portrait_seed: number;
  training_mod: number;
  mental_mod: number;
  tagline?: string;
}

export interface YouthCamp {
  id: string;
  staffed: boolean;
  purchased_season: number;
  leader_hire?: CampLeaderHireState;
  agency_commissioned_at?: CampDayStamp;
  leader?: CampLeaderRecord;
  candidate_set_id?: string;
}

export const MAX_YOUTH_CAMPS = 3;
/** Camp-Leiter Gehalt (Material/Miete/Werbung/Essen läuft über `upkeepWeekly`). */
export const CAMP_BETREUER_WAGE = 7_500;
export const CAMP_INTAKE_STAFFED = 4;
export const CAMP_INTAKE_UNSTAFFED = 2;

export const YOUTH_CAMP_NATIONS: readonly YouthCampNation[] = [
  { id: "camp_br", code: "BR", flag: "🇧🇷", label: "Brasilien", region: "São Paulo", cost: 1_200_000, upkeepWeekly: 19_000 },
  { id: "camp_ng", code: "NG", flag: "🇳🇬", label: "Nigeria", region: "Lagos", cost: 900_000, upkeepWeekly: 15_500 },
  { id: "camp_pl", code: "PL", flag: "🇵🇱", label: "Polen", region: "Krakau", cost: 750_000, upkeepWeekly: 13_000 },
  { id: "camp_fr", code: "FR", flag: "🇫🇷", label: "Frankreich", region: "Lyon", cost: 1_100_000, upkeepWeekly: 18_000 },
  { id: "camp_tr", code: "TR", flag: "🇹🇷", label: "Türkei", region: "Istanbul", cost: 850_000, upkeepWeekly: 14_500 },
  { id: "camp_hr", code: "HR", flag: "🇭🇷", label: "Kroatien", region: "Dubrovnik", cost: 800_000, upkeepWeekly: 13_500 },
];

/** Camp-Leiter: international pool, not tied to nation locale (PRD 03.6.1 UX). */
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
] as const;

export const CAMP_OPENING_MEAN_SHIFT = -38;
export const CAMP_OPENING_PLAYER_MIN = 1;
export const CAMP_OPENING_PLAYER_MAX = 2;
/** Fixed roster rows when all camp slots are owned (wide row layout). */
export const CAMP_CARD_ROSTER_SLOTS = 5;
/** Smaller camp cards in 6-up shop grid — at least three talents visible. */
export const CAMP_CARD_ROSTER_SLOTS_COMPACT = 3;

const NAMES: Record<string, { first: readonly string[]; last: readonly string[] }> = {
  BR: {
    first: ["Lucas", "Gabriel", "Pedro", "Rafael", "Thiago", "Matheus"],
    last: ["Silva", "Santos", "Oliveira", "Souza", "Pereira", "Costa"],
  },
  NG: {
    first: ["Chukwu", "Ibrahim", "Tunde", "Emeka", "Yusuf", "Kelechi"],
    last: ["Okafor", "Balogun", "Nwosu", "Adeyemi", "Okoro", "Musa"],
  },
  PL: {
    first: ["Jakub", "Kacper", "Szymon", "Filip", "Mateusz", "Bartek"],
    last: ["Nowak", "Kowalski", "Wiśniewski", "Wójcik", "Kamiński", "Lewandowski"],
  },
  FR: {
    first: ["Hugo", "Louis", "Nathan", "Enzo", "Jules", "Mathis"],
    last: ["Martin", "Bernard", "Dubois", "Moreau", "Laurent", "Petit"],
  },
  TR: {
    first: ["Emre", "Can", "Yusuf", "Burak", "Arda", "Kerem"],
    last: ["Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Öztürk"],
  },
  HR: {
    first: ["Luka", "Ivan", "Marko", "Josip", "Mateo", "Filip"],
    last: ["Horvat", "Kovač", "Babić", "Jurić", "Marić", "Kovačević"],
  },
};

export function campNationById(id: string): YouthCampNation | undefined {
  return YOUTH_CAMP_NATIONS.find((entry) => entry.id === id);
}

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

export function campLeaderPortraitSeed(campId: string, masterSeed: number): number {
  return hashCampKey(`${masterSeed}:${campId}:leader`);
}

/** Stable Camp-Leiter name for a owned camp (no extra save field). */
export function campLeaderName(campId: string, masterSeed: number): string {
  const hash = campLeaderPortraitSeed(campId, masterSeed);
  const first = CAMP_LEADER_FIRST[hash % CAMP_LEADER_FIRST.length] ?? CAMP_LEADER_FIRST[0]!;
  const last =
    CAMP_LEADER_LAST[Math.floor(hash / CAMP_LEADER_FIRST.length) % CAMP_LEADER_LAST.length] ??
    CAMP_LEADER_LAST[0]!;
  return formatPlayerName({ name: { first, last }, portrait_seed: hash });
}

export function campOpeningPlayerCount(campId: string, masterSeed: number, season: number): number {
  const random = mulberry32(hashCampKey(`${masterSeed}:${campId}:${season}:opening`));
  return random() < 0.45 ? CAMP_OPENING_PLAYER_MIN : CAMP_OPENING_PLAYER_MAX;
}

export function nextYouthPlayerIdStart(players: readonly Player[]): number {
  let max = 0;
  for (const player of players) {
    const match = /^pl_(\d+)$/.exec(player.id);
    if (!match) continue;
    max = Math.max(max, Number.parseInt(match[1]!, 10));
  }
  return max + 1;
}

/** 1–2 weak-CA youths with max Anlage/Drive — immediate roster after camp purchase. */
export function generateCampOpeningProspects(input: {
  campId: string;
  clubId: string;
  season: number;
  week: number;
  masterSeed: number;
  players: readonly Player[];
}): Player[] {
  const nation = campNationById(input.campId);
  if (!nation) return [];
  const count = campOpeningPlayerCount(input.campId, input.masterSeed, input.season);
  const idStart = nextYouthPlayerIdStart(input.players);
  const random = mulberry32(hashCampKey(`${input.masterSeed}:${input.campId}:prospects:${input.season}`));
  return buildAcademyCohort({
    season: input.season,
    week: input.week,
    seasonYear: seasonCalendarYear(input.season),
    clubId: input.clubId,
    nationality: nation.code,
    region: nation.region,
    facility: "academy_basic",
    idStart,
    random,
    count,
    youthSite: input.campId,
    meanShift: CAMP_OPENING_MEAN_SHIFT,
    hiddenProfile: "max_development",
    nameFor: (seed) => generateCampPlayerName(nation.code, seed),
  });
}

export function generateCampPlayerName(code: string, seed: number): PlayerName {
  const lists = NAMES[code];
  if (!lists) return generatePlayerName(seed);
  const first = lists.first[seed % lists.first.length] ?? lists.first[0]!;
  const last = lists.last[Math.floor(seed / lists.first.length) % lists.last.length] ?? lists.last[0]!;
  return { first, last };
}

export function ownedCamp(camps: readonly YouthCamp[], id: string): YouthCamp | undefined {
  return camps.find((entry) => entry.id === id);
}

export function weeklyCampUpkeepForCamp(camp: YouthCamp): number {
  const nation = campNationById(camp.id);
  if (!nation) return 0;
  return nation.upkeepWeekly + (isCampStaffed(camp) ? CAMP_BETREUER_WAGE : 0);
}

export function weeklyCampUpkeep(camps: readonly YouthCamp[]): number {
  return camps.reduce((sum, camp) => sum + weeklyCampUpkeepForCamp(camp), 0);
}

export function canBuyYouthCamp(
  camps: readonly YouthCamp[],
  nationId: string,
  cash: number,
): { ok: true; cost: number } | { ok: false; reason: string } {
  const nation = campNationById(nationId);
  if (!nation) return { ok: false, reason: "Unbekanntes Camp." };
  if (ownedCamp(camps, nationId)) return { ok: false, reason: "Camp schon gekauft." };
  if (camps.length >= MAX_YOUTH_CAMPS) return { ok: false, reason: `Höchstens ${MAX_YOUTH_CAMPS} Camps.` };
  if (cash < nation.cost) return { ok: false, reason: "Zu wenig Kasse." };
  return { ok: true, cost: nation.cost };
}

export function buyYouthCamp(camps: readonly YouthCamp[], nationId: string, season: number): YouthCamp[] {
  if (ownedCamp(camps, nationId)) return [...camps];
  return [
    ...camps,
    { id: nationId, staffed: false, purchased_season: season, leader_hire: "none" as const },
  ];
}

export function isCampStaffed(camp: YouthCamp): boolean {
  return camp.leader_hire === "hired" && camp.staffed;
}

export function pullCampPlayerToHq(player: Player): Player {
  return withYouthSite(player, YOUTH_SITE_HQ);
}

export function campRoster(players: readonly Player[], campId: string): Player[] {
  return players.filter(
    (player) =>
      (player.squad_status === "u17" || player.squad_status === "u19") &&
      player.state.youth_site === campId,
  );
}

export function hqYouthPlayers(players: readonly Player[]): Player[] {
  return players.filter(
    (player) =>
      (player.squad_status === "u17" || player.squad_status === "u19") && isHqYouth(player),
  );
}

export function campIntakeCount(staffed: boolean): number {
  return staffed ? CAMP_INTAKE_STAFFED : CAMP_INTAKE_UNSTAFFED;
}

export function campIntakeCountForCamp(camp: YouthCamp): number {
  return campIntakeCount(isCampStaffed(camp));
}

/** Mean shift for season-end camp intake; leader `training_mod` adds points when staffed. */
export function campMixtureShift(camp: YouthCamp): number {
  if (!isCampStaffed(camp)) return -8;
  const mod = camp.leader?.training_mod ?? 0;
  return Math.round(mod * 100);
}

export function normalizeYouthCamps(camps: readonly YouthCamp[] | undefined): YouthCamp[] {
  if (!camps) return [];
  const seen = new Set<string>();
  const next: YouthCamp[] = [];
  for (const camp of camps) {
    if (!campNationById(camp.id) || seen.has(camp.id)) continue;
    seen.add(camp.id);
    const leader_hire = camp.leader_hire ?? (camp.staffed ? "hired" : "none");
    const staffed = leader_hire === "hired";
    next.push({
      id: camp.id,
      staffed,
      purchased_season: camp.purchased_season ?? 1,
      leader_hire,
      agency_commissioned_at: camp.agency_commissioned_at,
      leader: camp.leader,
      candidate_set_id: camp.candidate_set_id,
    });
    if (next.length >= MAX_YOUTH_CAMPS) break;
  }
  return next;
}
