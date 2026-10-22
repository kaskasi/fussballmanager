import type { Player } from "../types/player.ts";
import { careerApps, hasStamp } from "./ability-stamps.ts";
import { t } from "../i18n/index.ts";

/** Alter Recke gate — soft cap for the derived match factor, not a potential ceiling. */
export const EXPERIENCE_APPS_SOFT_CAP = 300;
export const EXPERIENCE_FLOOR = 0.62;

/** Seasons with at least one appearance. Youth squads count as 0 Pro-Jahre. */
export function careerProYears(player: Player): number {
  if (player.squad_status === "u17" || player.squad_status === "u19") return 0;
  const past = player.history.growth.filter((snapshot) => (snapshot.season_apps ?? 0) > 0).length;
  const current = (player.state.season_apps ?? 0) > 0 ? 1 : 0;
  return past + current;
}

/**
 * 0.62–1.0 match-greenness. Kids with a handful of apps sit below the sheet;
 * veterans at Alter Recke’s 300 apps sit at 1.0. Not stored on the player.
 */
export function derivedExperienceFactor(player: Player): number {
  const appsNorm = Math.min(1, careerApps(player) / EXPERIENCE_APPS_SOFT_CAP);
  const yearsNorm = Math.min(1, careerProYears(player) / 8);
  const mixed = Math.min(1, appsNorm + 0.08 * yearsNorm);
  return Math.min(1, EXPERIENCE_FLOOR + (1 - EXPERIENCE_FLOOR) * mixed);
}

export function profileExperienceLabel(player: Player): string {
  return hasStamp(player, "gruenschnabel") ? t("profile.experience.raw") : t("profile.experience.label");
}
