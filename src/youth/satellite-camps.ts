import type { Player, PlayerName } from "../types/player.ts";
import { generatePlayerName } from "../types/player-display.ts";
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

export interface YouthCamp {
  id: string;
  staffed: boolean;
  purchased_season: number;
}

export const MAX_YOUTH_CAMPS = 3;
export const CAMP_BETREUER_WAGE = 2_500;
export const CAMP_INTAKE_STAFFED = 4;
export const CAMP_INTAKE_UNSTAFFED = 2;

export const YOUTH_CAMP_NATIONS: readonly YouthCampNation[] = [
  { id: "camp_br", code: "BR", flag: "🇧🇷", label: "Brasilien", region: "São Paulo", cost: 1_200_000, upkeepWeekly: 8_000 },
  { id: "camp_ng", code: "NG", flag: "🇳🇬", label: "Nigeria", region: "Lagos", cost: 900_000, upkeepWeekly: 6_500 },
  { id: "camp_pl", code: "PL", flag: "🇵🇱", label: "Polen", region: "Krakau", cost: 750_000, upkeepWeekly: 5_500 },
  { id: "camp_fr", code: "FR", flag: "🇫🇷", label: "Frankreich", region: "Lyon", cost: 1_100_000, upkeepWeekly: 7_500 },
  { id: "camp_tr", code: "TR", flag: "🇹🇷", label: "Türkei", region: "Istanbul", cost: 850_000, upkeepWeekly: 6_000 },
  { id: "camp_hr", code: "HR", flag: "🇭🇷", label: "Kroatien", region: "Split", cost: 800_000, upkeepWeekly: 5_800 },
];

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

export function weeklyCampUpkeep(camps: readonly YouthCamp[]): number {
  return camps.reduce((sum, camp) => {
    const nation = campNationById(camp.id);
    if (!nation) return sum;
    return sum + nation.upkeepWeekly + (camp.staffed ? CAMP_BETREUER_WAGE : 0);
  }, 0);
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
  return [...camps, { id: nationId, staffed: false, purchased_season: season }];
}

export function setCampStaffed(camps: readonly YouthCamp[], nationId: string, staffed: boolean): YouthCamp[] {
  return camps.map((camp) => (camp.id === nationId ? { ...camp, staffed } : camp));
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

export function campMixtureShift(staffed: boolean): number {
  return staffed ? 0 : -8;
}

export function normalizeYouthCamps(camps: readonly YouthCamp[] | undefined): YouthCamp[] {
  if (!camps) return [];
  const seen = new Set<string>();
  const next: YouthCamp[] = [];
  for (const camp of camps) {
    if (!campNationById(camp.id) || seen.has(camp.id)) continue;
    seen.add(camp.id);
    next.push({ id: camp.id, staffed: Boolean(camp.staffed), purchased_season: camp.purchased_season ?? 1 });
    if (next.length >= MAX_YOUTH_CAMPS) break;
  }
  return next;
}
