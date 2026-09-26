import type { Player } from "../types/player.ts";
import type { AbilityEstimate } from "../scouting/estimate-model.ts";

export interface CareerSeasonStats {
  apps: number;
  goals: number;
  assists: number;
  minutes: number;
  rating: string;
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

function estimateMatchRating(player: Player, minutes: number): string {
  if (minutes === 0) return "—";
  const base = 6.35 + player.state.form * 0.14 + Math.min(minutes / 1_200, 0.55);
  const moraleBoost = (player.state.morale - 50) / 200;
  return Math.min(9.2, Math.max(5.4, base + moraleBoost)).toFixed(1);
}
