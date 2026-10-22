import type { FixtureResult } from "@fussballmanager/shared";
import type { LeagueState } from "../persistence/league-state.ts";
import { lastPlayerResult, leagueTable } from "../sim/league-week.ts";
import { applyStadiumFillRates, DEFAULT_FANBASE, type ClubStadium } from "./club-stadium.ts";
import { t } from "../i18n/index.ts";

export const FANBASE_MIN = 25;
export const FANBASE_MAX = 95;

export type FanbaseMood = "weak" | "steady" | "growing" | "strong";

export function normalizeFanbase(value: number): number {
  return Math.min(FANBASE_MAX, Math.max(FANBASE_MIN, value));
}

/** Display/storage rounding — avoids float artifacts like 51.879999… in the UI. */
export function roundFanbase(value: number): number {
  return Math.round(normalizeFanbase(value) * 100) / 100;
}

export function formatFanbase(value: number): string {
  return roundFanbase(value).toFixed(2);
}

export function fanbaseFillMultiplier(fanbase: number): number {
  const clamped = normalizeFanbase(fanbase);
  return 1 + (clamped - DEFAULT_FANBASE) * 0.004;
}

export function fanbaseMood(fanbase: number): FanbaseMood {
  if (fanbase >= 72) return "strong";
  if (fanbase >= 58) return "growing";
  if (fanbase >= 42) return "steady";
  return "weak";
}

export function fanbaseMoodLabel(mood: FanbaseMood): string {
  return t(`stadium.fanbase.mood.${mood}`);
}

export function matchResultFanbaseDelta(result: FixtureResult, clubId: string): number {
  const home = result.homeTeamId === clubId;
  const goalsFor = home ? result.homeGoals : result.awayGoals;
  const goalsAgainst = home ? result.awayGoals : result.homeGoals;
  const homeBoost = home ? 0.15 : 0;
  if (goalsFor > goalsAgainst) return 1.1 + homeBoost;
  if (goalsFor === goalsAgainst) return 0.2 + homeBoost * 0.5;
  return -0.85 + homeBoost * 0.25;
}

export function tablePositionFanbaseDrift(league: LeagueState): number {
  const table = leagueTable(league);
  const place = table.findIndex((row) => row.teamId === league.player_club_id) + 1;
  if (place <= 0 || table.length <= 1) return 0;
  const normalized = (table.length - place) / (table.length - 1);
  return (normalized - 0.5) * 0.28;
}

export function weeklyFanbaseDelta(league: LeagueState, clubId: string, hadMatch: boolean): number {
  const drift = tablePositionFanbaseDrift(league);
  if (!hadMatch) return drift * 0.45;
  const last = lastPlayerResult(league);
  const match = last ? matchResultFanbaseDelta(last, clubId) : 0;
  return match + drift;
}

export function seasonEndFanbaseBonus(league: LeagueState): number {
  const table = leagueTable(league);
  const place = table.findIndex((row) => row.teamId === league.player_club_id) + 1;
  if (place <= 0 || table.length <= 1) return 0;
  const normalized = (table.length - place) / (table.length - 1);
  return (normalized - 0.5) * 7;
}

export function advanceClubFanbase(
  stadium: ClubStadium,
  delta: number,
): ClubStadium {
  const nextFanbase = roundFanbase((stadium.fanbase ?? DEFAULT_FANBASE) + delta);
  return applyStadiumFillRates({
    ...stadium,
    fanbase: nextFanbase,
    fanbase_last_delta: Math.round(delta * 10) / 10,
  });
}
