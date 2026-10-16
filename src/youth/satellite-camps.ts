import type { Player, PlayerName } from "../types/player.ts";
import { generatePlayerName, formatPlayerName } from "../types/player-display.ts";
import { seasonCalendarYear } from "../sim/season-label.ts";
import type { PositionPrimary } from "../types/player.ts";
import { buildAcademyCohort, type AcademyFacility } from "./intake-generator.ts";
import {
  campDebutHookIndex,
  CAMP_OPENING_HEADLINE_MEAN_SHIFT,
  CAMP_OPENING_SUPPORT_MEAN_SHIFT,
  CAMP_OPENING_TOTAL_PLAYERS,
  pickCampHeadlinePosition,
} from "./camp-opening-debut.ts";
import { careerWeekIndex } from "../stadium/hospitality.ts";
import { isHqYouth, withYouthSite, YOUTH_SITE_HQ } from "./youth-site.ts";
import { CAMP_BUILD_WEEKS } from "./camp-construction.ts";

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
  purchased_week?: number;
  /** Career week index (inclusive) while camp is under construction — PRD camp build. */
  construction_until?: number;
  /** Opening bundle spawned after construction (purchase defer). */
  opening_players_delivered?: boolean;
  leader_hire?: CampLeaderHireState;
  agency_commissioned_at?: CampDayStamp;
  leader?: CampLeaderRecord;
  candidate_set_id?: string;
  /** Career week index when the build finishes. Absent = already open. */
  construction_until?: number;
}

export const MAX_YOUTH_CAMPS = 3;
/** Camp-Leiter Gehalt (Material/Miete/Werbung/Essen läuft über `upkeepWeekly`). */
export const CAMP_BETREUER_WAGE = 7_500;
export const CAMP_INTAKE_STAFFED = 4;
export const CAMP_INTAKE_UNSTAFFED = 2;

/** Playtest 2026-10-09: premium opening bundle (headline + 2 support). */
export const YOUTH_CAMP_NATIONS: readonly YouthCampNation[] = [
  { id: "camp_br", code: "BR", flag: "🇧🇷", label: "Brasilien", region: "São Paulo", cost: 2_460_000, upkeepWeekly: 29_000 },
  { id: "camp_fr", code: "FR", flag: "🇫🇷", label: "Frankreich", region: "Lyon", cost: 2_260_000, upkeepWeekly: 28_000 },
  { id: "camp_ng", code: "NG", flag: "🇳🇬", label: "Nigeria", region: "Lagos", cost: 1_860_000, upkeepWeekly: 24_000 },
  { id: "camp_tr", code: "TR", flag: "🇹🇷", label: "Türkei", region: "Istanbul", cost: 1_730_000, upkeepWeekly: 23_000 },
  { id: "camp_hr", code: "HR", flag: "🇭🇷", label: "Kroatien", region: "Dubrovnik", cost: 1_660_000, upkeepWeekly: 21_000 },
  { id: "camp_pl", code: "PL", flag: "🇵🇱", label: "Polen", region: "Krakau", cost: 1_530_000, upkeepWeekly: 20_000 },
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

/** @deprecated Use camp-opening-debut shifts; kept for tests/docs references. */
export const CAMP_OPENING_MEAN_SHIFT = CAMP_OPENING_SUPPORT_MEAN_SHIFT;
export const CAMP_OPENING_PLAYER_MIN = CAMP_OPENING_TOTAL_PLAYERS;
export const CAMP_OPENING_PLAYER_MAX = CAMP_OPENING_TOTAL_PLAYERS;
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

export function campOpeningPlayerCount(_campId: string, _masterSeed: number, _season: number): number {
  return CAMP_OPENING_TOTAL_PLAYERS;
}

export interface CampOpeningBundle {
  players: Player[];
  headlinePlayerId: string;
}

function spotlightHeadline(
  player: Player,
  campId: string,
  position: PositionPrimary,
  hookIndex: number,
): Player {
  return {
    ...player,
    position,
    state: {
      ...player.state,
      youth_site: campId,
      camp_opening_headline: true,
      camp_debut_hook_index: hookIndex,
    },
  };
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

/** 1 headline + 2 support youths — max Anlage/Drive, purchase “loot box” payoff. */
export function generateCampOpeningBundle(input: {
  campId: string;
  clubId: string;
  season: number;
  week: number;
  masterSeed: number;
  players: readonly Player[];
  /** Same campus tier as HQ intake — camp talents never below own youth baseline. */
  facility?: AcademyFacility;
}): CampOpeningBundle {
  const nation = campNationById(input.campId);
  if (!nation) return { players: [], headlinePlayerId: "" };
  const idStart = nextYouthPlayerIdStart(input.players);
  const random = mulberry32(hashCampKey(`${input.masterSeed}:${input.campId}:prospects:${input.season}`));
  const hookIndex = campDebutHookIndex(input.campId, input.masterSeed, input.season);
  const facility = input.facility ?? "academy_basic";
  const base = {
    season: input.season,
    week: input.week,
    seasonYear: seasonCalendarYear(input.season),
    clubId: input.clubId,
    nationality: nation.code,
    region: nation.region,
    facility,
    youthSite: input.campId,
    hiddenProfile: "max_development" as const,
    nameFor: (seed: number) => generateCampPlayerName(nation.code, seed),
  };

  const headlinePosition = pickCampHeadlinePosition(random);
  const headlineRaw = buildAcademyCohort({
    ...base,
    idStart,
    random,
    count: 1,
    meanShift: CAMP_OPENING_HEADLINE_MEAN_SHIFT,
    fixedPositions: [headlinePosition],
  })[0];
  if (!headlineRaw) return { players: [], headlinePlayerId: "" };

  const headline = spotlightHeadline(headlineRaw, input.campId, headlinePosition, hookIndex);

  const support = buildAcademyCohort({
    ...base,
    idStart: idStart + 1,
    random,
    count: CAMP_OPENING_TOTAL_PLAYERS - 1,
    meanShift: campSupportMeanShift(facility),
  });

  return {
    players: [headline, ...support],
    headlinePlayerId: headline.id,
  };
}

export function generateCampOpeningProspects(input: {
  campId: string;
  clubId: string;
  season: number;
  week: number;
  masterSeed: number;
  players: readonly Player[];
}): Player[] {
  return generateCampOpeningBundle(input).players;
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

export function isCampUnderConstruction(camp: YouthCamp): boolean {
  return camp.construction_until != null;
}

export function weeklyCampUpkeepForCamp(camp: YouthCamp): number {
  if (isCampUnderConstruction(camp)) return 0;
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

export function buyYouthCamp(
  camps: readonly YouthCamp[],
  nationId: string,
  season: number,
  week?: number,
  buildWeeks = CAMP_BUILD_WEEKS,
): YouthCamp[] {
  if (ownedCamp(camps, nationId)) return [...camps];
  const purchaseWeek = week ?? 1;
  const construction_until =
    buildWeeks > 0
      ? careerWeekIndex(season, purchaseWeek) + buildWeeks - 1
      : undefined;
  return [
    ...camps,
    {
      id: nationId,
      staffed: false,
      purchased_season: season,
      purchased_week: week,
      opening_players_delivered: false,
      leader_hire: "none" as const,
      ...(construction_until != null ? { construction_until } : {}),
    },
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
  if (isCampUnderConstruction(camp)) return 0;
  return campIntakeCount(isCampStaffed(camp));
}

/**
 * Extra mean shift on top of the club's HQ campus facility.
 * Never below HQ parity (0); staffed camps can add leader training_mod bonus.
 */
export function campMixtureShift(camp: YouthCamp): number {
  if (isCampUnderConstruction(camp) || !isCampStaffed(camp)) return 0;
  const mod = camp.leader?.training_mod ?? 0;
  return Math.max(0, Math.round(mod * 100));
}

/** Opening-bundle support: same attribute floor as HQ intake for this facility. */
export function campSupportMeanShift(_facility: AcademyFacility): number {
  return 0;
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
      ...(camp.purchased_week != null ? { purchased_week: camp.purchased_week } : {}),
      ...(camp.construction_until != null ? { construction_until: camp.construction_until } : {}),
      opening_players_delivered: camp.opening_players_delivered ?? camp.construction_until == null,
      leader_hire,
      agency_commissioned_at: camp.agency_commissioned_at,
      leader: camp.leader,
      candidate_set_id: camp.candidate_set_id,
      ...(camp.construction_until != null ? { construction_until: camp.construction_until } : {}),
    });
    if (next.length >= MAX_YOUTH_CAMPS) break;
  }
  return next;
}
