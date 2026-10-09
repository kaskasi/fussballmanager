import type { Player } from "../types/player.ts";
import type { AbilityEstimate } from "../scouting/estimate-model.ts";
import { CAREER_START_YEAR, careerSeasonIndex, seasonCalendarYear } from "../sim/season-label.ts";

/** First calendar year as a professional (debut at 19). */
export const PRO_DEBUT_AGE = 19;

export interface CareerSeasonStats {
  apps: number;
  goals: number;
  assists: number;
  minutes: number;
  rating: string;
}

/** One pill per pro year since debut at 19 through the current career season. */
export function listCareerStatSeasons(player: Player, currentSeason: number): number[] {
  if (player.age < PRO_DEBUT_AGE) {
    return [currentSeason];
  }
  const debutCalendarYear = CAREER_START_YEAR - (player.age - PRO_DEBUT_AGE);
  const latestCalendarYear = seasonCalendarYear(currentSeason);
  const seasons: number[] = [];
  for (let year = debutCalendarYear; year <= latestCalendarYear; year += 1) {
    seasons.push(careerSeasonIndex(year));
  }
  const withArchive = new Set(player.history.growth.map((entry) => entry.season));
  withArchive.add(currentSeason);
  return seasons.filter((entry) => withArchive.has(entry));
}

export function careerSeasonStatsForSeason(
  player: Player,
  season: number,
  currentSeason: number,
  owned: boolean,
  estimate?: AbilityEstimate,
): CareerSeasonStats | null {
  if (!owned && estimate && estimate.uncertaintyRange >= 20) return null;
  if (player.squad_status === "loaned_out") return null;

  if (season === currentSeason) {
    return careerSeasonStats(player, owned, estimate);
  }

  const snapshot = player.history.growth.find((entry) => entry.season === season);
  if (!snapshot) return null;

  const minutes = snapshot.minutes_played;
  const apps =
    snapshot.season_apps ??
    (minutes > 0 ? Math.max(1, Math.round(minutes / 72)) : 0);
  return {
    apps,
    goals: snapshot.season_goals ?? 0,
    assists: snapshot.season_assists ?? 0,
    minutes,
    rating: "—",
  };
}

export function careerSeasonStats(
  player: Player,
  owned: boolean,
  estimate?: AbilityEstimate,
): CareerSeasonStats | null {
  if (!owned && estimate && estimate.uncertaintyRange >= 20) return null;
  if (player.squad_status === "loaned_out") return null;

  const minutes = player.state.season_minutes;
  const apps =
    player.state.season_apps > 0
      ? player.state.season_apps
      : minutes > 0
        ? Math.max(1, Math.round(minutes / 72))
        : 0;
  const rating = estimateMatchRating(player, minutes);

  return {
    apps,
    goals: player.state.season_goals ?? 0,
    assists: player.state.season_assists ?? 0,
    minutes,
    rating,
  };
}

export function seasonMatchRating(player: Player): number | null {
  const minutes = player.state.season_minutes;
  if (minutes === 0) return null;
  const base = 6.35 + player.state.form * 0.14 + Math.min(minutes / 1_200, 0.55);
  const moraleBoost = (player.state.morale - 50) / 200;
  return Math.min(9.2, Math.max(5.4, base + moraleBoost));
}

function estimateMatchRating(player: Player, minutes: number): string {
  if (minutes === 0) return "—";
  return seasonMatchRating(player)!.toFixed(1);
}
