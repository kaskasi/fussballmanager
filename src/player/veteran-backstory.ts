import type { Attributes, GrowthSnapshot, Player, PositionPrimary } from "../types/player.ts";
import { PRO_DEBUT_AGE } from "./season-stats.ts";
import { CAREER_START_YEAR, careerSeasonIndex } from "../sim/season-label.ts";
import { estimateCa } from "../transfers/market-value.ts";

/** Labels for F1.5 hunger slots until PRD 15 C1 schema ships. */
export const CAREER_STAMP_POOL: readonly { label: string; minAge: number }[] = [
  { label: "⚡ Scharfe Antritte", minAge: 24 },
  { label: "🎯 Fernschuss", minAge: 23 },
  { label: "🛡️ Zweikampf-Koloss", minAge: 26 },
  { label: "🧠 Spielübersicht", minAge: 27 },
  { label: "✨ Geölter Blitz", minAge: 28 },
  { label: "💪 Kopfballstark", minAge: 25 },
  { label: "🎭 Kaltblütig", minAge: 29 },
];

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function seedFromPlayerId(playerId: string): number {
  let hash = 0;
  for (let index = 0; index < playerId.length; index += 1) {
    hash = (hash * 31 + playerId.charCodeAt(index)) >>> 0;
  }
  return hash || 1;
}

/** CA base offset for generated pros — peak around 28–31 (PRD 02 curves). */
export function peakCaBaseAdjustment(age: number): number {
  if (age <= 20) return -5;
  if (age <= 22) return -3;
  if (age <= 25) return 0;
  if (age <= 28) return 3;
  if (age <= 31) return 5;
  if (age <= 34) return 2;
  return -2 - Math.min(5, age - 35);
}

function archivedProSeasons(age: number): number {
  if (age < PRO_DEBUT_AGE) return 0;
  return Math.min(14, age - PRO_DEBUT_AGE);
}

function peakAgeForPosition(position: PositionPrimary): number {
  if (position === "GK") return 31;
  if (position === "CB" || position === "DM") return 30;
  if (position === "CF" || position === "LW" || position === "RW") return 28;
  return 29;
}

function synthesizeSeasonMinutes(
  ca: number,
  ageAtSeason: number,
  peakAge: number,
  random: () => number,
): number {
  const peakFactor = 1 - Math.min(0.45, Math.abs(ageAtSeason - peakAge) * 0.05);
  const base = 900 + (ca / 199) * 1_400;
  const noise = 0.75 + random() * 0.5;
  return Math.round(base * peakFactor * noise);
}

function synthesizeSeasonStats(
  position: PositionPrimary,
  minutes: number,
  ageAtSeason: number,
  peakAge: number,
  random: () => number,
): Pick<GrowthSnapshot, "season_apps" | "season_goals" | "season_assists"> {
  if (minutes < 120) {
    return { season_apps: 0, season_goals: 0, season_assists: 0 };
  }
  const apps = Math.max(1, Math.round(minutes / 76));
  const peakFactor = 1 - Math.min(0.4, Math.abs(ageAtSeason - peakAge) * 0.045);
  const attacking =
    position === "CF" ? 1.2 : position === "LW" || position === "RW" || position === "AM" ? 1 : 0.55;
  const creative =
    position === "AM" || position === "CM" || position === "LM" || position === "RM" ? 1.1 : 0.65;
  const goals = Math.round((minutes / 2_400) * attacking * peakFactor * (0.4 + random() * 1.4));
  const assists = Math.round((minutes / 2_200) * creative * peakFactor * (0.35 + random() * 1.2));
  return { season_apps: apps, season_goals: goals, season_assists: assists };
}

function snapshotAttributes(current: Attributes, yearsAgo: number): Attributes {
  if (yearsAgo <= 0) return { ...current };
  const factor = Math.max(0.82, 1 - yearsAgo * 0.018);
  return Object.fromEntries(
    (Object.keys(current) as (keyof Attributes)[]).map((key) => [key, Math.round(current[key] * factor)]),
  ) as unknown as Attributes;
}

function rollCareerStamps(age: number, ca: number, random: () => number): string[] {
  if (age <= 20) return [];
  const slots =
    age >= 30 ? 2 + Math.floor(random() * 2) : age >= 25 ? 1 + Math.floor(random() * 2) : random() < 0.45 ? 1 : 0;
  if (slots === 0) return [];
  const caBonus = ca >= 78 ? 1 : 0;
  const count = Math.min(3, slots + caBonus);
  const eligible = CAREER_STAMP_POOL.filter((entry) => age >= entry.minAge);
  const picked: string[] = [];
  const pool = [...eligible];
  while (picked.length < count && pool.length > 0) {
    const index = Math.floor(random() * pool.length);
    picked.push(pool.splice(index, 1)[0]!.label);
  }
  return picked;
}

/**
 * Synthesizes pre-career growth archives and display stamps for pros older than 20.
 * Deterministic per player id + optional extra seed.
 */
/**
 * `keepSeasons` keeps only the most recent archived seasons (the draws are the
 * same, so stamps do not change). PRD 32: national-tier players keep one to
 * hold the save budget.
 */
export function applyVeteranBackstory(
  player: Player,
  storySeed: number,
  keepSeasons = Number.POSITIVE_INFINITY,
): Player {
  if (player.age < PRO_DEBUT_AGE || player.squad_status === "u17" || player.squad_status === "u19") {
    return player;
  }

  const random = mulberry32(storySeed);
  const ca = estimateCa(player.attributes, player.position);
  const archived = archivedProSeasons(player.age);
  const debutCalendarYear = CAREER_START_YEAR - (player.age - PRO_DEBUT_AGE);
  const peakAge = peakAgeForPosition(player.position);
  const growth: GrowthSnapshot[] = [];

  for (let index = 0; index < archived; index += 1) {
    const calendarYear = debutCalendarYear + index;
    const season = careerSeasonIndex(calendarYear);
    const yearsAgo = player.age - (PRO_DEBUT_AGE + index);
    const ageAtSeason = PRO_DEBUT_AGE + index;
    const minutes = synthesizeSeasonMinutes(ca, ageAtSeason, peakAge, random);
    const line = synthesizeSeasonStats(player.position, minutes, ageAtSeason, peakAge, random);
    growth.push({
      season,
      age: ageAtSeason,
      attributes_snapshot: snapshotAttributes(player.attributes, yearsAgo),
      minutes_played: minutes,
      drive_at_snapshot: player.hidden.drive,
      ...line,
    });
  }

  const career_stamps = rollCareerStamps(player.age, ca, random);

  const keptGrowth = player.history.growth.filter((entry) => entry.season >= 1);

  return {
    ...player,
    history: {
      ...player.history,
      growth: [...growth.slice(Math.max(0, growth.length - keepSeasons)), ...keptGrowth].sort(
        (left, right) => left.season - right.season,
      ),
      career_stamps: career_stamps.length > 0 ? career_stamps : player.history.career_stamps,
    },
  };
}
