import type { ClubStadium } from "./club-stadium.ts";
import { stadiumTotalCapacity } from "./club-stadium.ts";
import { advanceClubFanbase } from "./fanbase.ts";
import { careerWeekIndex, hospitalityDocked, RESTAURANT_VIRAL_WEEKS } from "./hospitality.ts";
import { dockedOccupiedCells, precinctBuildingLevel } from "./precinct.ts";
import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import { playerCa } from "../player/ca-tracking.ts";

export const STADIUM_MEGA_EVENT_MIN_CAPACITY = 30_000;
export const RESTAURANT_WEDDING_REPEAT_SEASONS = 3;
export const PITCH_CONDITION_MAX = 100;
export const PITCH_RECOVERY_PER_WEEK = 3;
export const MEGA_EVENT_PITCH_DAMAGE = 20;

export interface RestaurantProposalResult {
  stadium: ClubStadium;
  players: Player[];
  clubEventMessage: string;
}

/** Top pro by current ability — “Star” for campus stories. */
export function starProPlayer(players: readonly Player[], clubId: string): Player | undefined {
  let best: Player | undefined;
  let bestCa = -1;
  for (const player of players) {
    if (player.club_id !== clubId || player.squad_status !== "pro") continue;
    const ca = playerCa(player);
    if (ca > bestCa) {
      bestCa = ca;
      best = player;
    }
  }
  return best;
}

function clampPitch(value: number): number {
  return Math.min(PITCH_CONDITION_MAX, Math.max(0, Math.round(value)));
}

export function normalizePitchCondition(stadium: ClubStadium): ClubStadium {
  const pitch = stadium.pitch_condition;
  if (pitch == null || !Number.isFinite(pitch)) {
    return { ...stadium, pitch_condition: PITCH_CONDITION_MAX };
  }
  return { ...stadium, pitch_condition: clampPitch(pitch) };
}

/** Worn pitch slightly hurts home fill (PRD 14.7 — Rasen leidet). */
export function pitchFillPenalty(stadium: ClubStadium): number {
  const condition = stadium.pitch_condition ?? PITCH_CONDITION_MAX;
  if (condition >= 85) return 0;
  return ((85 - condition) / 85) * 0.06;
}

export function recoverPitchWeekly(stadium: ClubStadium): ClubStadium {
  const current = stadium.pitch_condition ?? PITCH_CONDITION_MAX;
  if (current >= PITCH_CONDITION_MAX) return stadium;
  return { ...stadium, pitch_condition: clampPitch(current + PITCH_RECOVERY_PER_WEEK) };
}

export function damagePitch(stadium: ClubStadium, amount: number): ClubStadium {
  const current = stadium.pitch_condition ?? PITCH_CONDITION_MAX;
  return { ...stadium, pitch_condition: clampPitch(current - amount) };
}

/** First opening of the Vereinsrestaurant — viral story + star fatigue + fans. */
export function applyRestaurantProposalStory(
  stadium: ClubStadium,
  players: readonly Player[],
  clubId: string,
  season: number,
  week: number,
): RestaurantProposalResult {
  const now = careerWeekIndex(season, week);
  const star = starProPlayer(players, clubId);
  const starName = star ? formatPlayerName(star) : "ein Star des Kaders";
  let nextPlayers = players;
  if (star) {
    nextPlayers = players.map((player) => {
      if (player.id !== star.id) return player;
      return {
        ...player,
        state: {
          ...player.state,
          fitness: Math.max(0, Math.min(100, player.state.fitness - 14)),
        },
      };
    });
  }
  let nextStadium = advanceClubFanbase(stadium, 1.4);
  nextStadium = {
    ...nextStadium,
    restaurant_viral_until_week: now + RESTAURANT_VIRAL_WEEKS,
    restaurant_story_last_season: season,
  };
  const clubEventMessage = `Restaurant: Heiratsantrag im Vereinslokal — ${starName} war zufällig mit dabei, wirkte sichtbar müde, die Fans reden wochenlang davon.`;
  return { stadium: nextStadium, players: nextPlayers, clubEventMessage };
}

export function shouldRepeatRestaurantWedding(
  stadium: ClubStadium,
  season: number,
): boolean {
  if (!hospitalityDocked(stadium.precinct, "restaurant")) return false;
  const last = stadium.restaurant_story_last_season;
  if (last == null) return false;
  return season >= last + RESTAURANT_WEDDING_REPEAT_SEASONS;
}

export function applyRestaurantWeddingRepeat(
  stadium: ClubStadium,
  season: number,
  week: number,
): ClubStadium {
  const now = careerWeekIndex(season, week);
  return {
    ...advanceClubFanbase(stadium, 0.9),
    restaurant_viral_until_week: now + RESTAURANT_VIRAL_WEEKS,
    restaurant_story_last_season: season,
  };
}

const MEGA_EVENT_LABELS = [
  "Konzert",
  "Autoball",
  "Ice-Fußball",
] as const;

function megaEventRoll(masterSeed: number, season: number, week: number): number {
  let hash = 0x811c9dc5;
  for (const char of `${masterSeed}:mega:${season}:${week}`) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 0x9e3779b1);
  }
  return (hash >>> 0) / 4_294_967_296;
}

function megaEventLabel(masterSeed: number, season: number, week: number): string {
  const index = Math.floor(megaEventRoll(masterSeed, season, week + 17) * MEGA_EVENT_LABELS.length);
  return MEGA_EVENT_LABELS[index] ?? MEGA_EVENT_LABELS[0]!;
}

/** Large stadium — occasional mega events: publicity, fanbase, pitch wear. */
export function maybeStadiumMegaEventWeek(
  stadium: ClubStadium,
  season: number,
  week: number,
  masterSeed: number,
): { stadium: ClubStadium; message: string | null } {
  const capacity = stadiumTotalCapacity(stadium);
  if (capacity < STADIUM_MEGA_EVENT_MIN_CAPACITY) {
    return { stadium: recoverPitchWeekly(stadium), message: null };
  }
  let next = recoverPitchWeekly(stadium);
  const inquiryWeeks = [8, 22, 38];
  if (!inquiryWeeks.includes(week)) {
    return { stadium: next, message: null };
  }
  const roll = megaEventRoll(masterSeed, season, week);
  if (roll > 0.42) {
    return { stadium: next, message: null };
  }
  const label = megaEventLabel(masterSeed, season, week);
  next = damagePitch(advanceClubFanbase(next, 1.1), MEGA_EVENT_PITCH_DAMAGE);
  return {
    stadium: next,
    message: `${label} auf dem Rasen: volle Halle, Schlagzeilen — Fanbase wächst, der Platz leidet.`,
  };
}

/** Per-stage Trainingszentrum bonuses for UI copy. */
export function trainingGroundStageBonusLabel(level: number): string | null {
  if (level <= 0) return null;
  if (level === 1) return "Basis-Campus";
  if (level === 2) return "Halle · Premium-Technikeinheiten";
  if (level === 3) return "Fitness";
  if (level === 4) return "Pool · schnellere Erholung";
  if (level >= 5) return "Physio · weniger Verletzungen";
  return null;
}

export function precinctHasPoolRecovery(state: ClubStadium["precinct"]): boolean {
  if (!state || dockedOccupiedCells(state, "training_ground") <= 0) return false;
  return precinctBuildingLevel(state, "training_ground") >= 4;
}

export function precinctHasPhysio(state: ClubStadium["precinct"]): boolean {
  if (!state || dockedOccupiedCells(state, "training_ground") <= 0) return false;
  return precinctBuildingLevel(state, "training_ground") >= 5;
}
