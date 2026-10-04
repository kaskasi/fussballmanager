import { t } from "../i18n/index.ts";
import { minutesLast4Weeks } from "../player/minute-history.ts";
import type { Player } from "../types/player.ts";

export type DepartureReason =
  | "no_game_time"
  | "rival_offer"
  | "family_move"
  | "no_contract";

export function departureRiskReasons(
  player: Player,
  week: number,
  masterSeed: number,
): DepartureReason[] {
  if (player.age < 16) return [];
  if (player.squad_status !== "u17" && player.squad_status !== "u19") return [];

  const reasons: DepartureReason[] = [];
  if (minutesLast4Weeks(player) < 45) reasons.push("no_game_time");
  if (player.age >= 17 && !player.contract) reasons.push("no_contract");
  if (departureRoll(masterSeed, week, player.id, "family") < 0.005) {
    reasons.push("family_move");
  }
  if (departureRoll(masterSeed, week, player.id, "rival") < 0.04) {
    reasons.push("rival_offer");
  }
  return reasons;
}

export function departureReasonLabel(reason: DepartureReason): string {
  switch (reason) {
    case "no_game_time":
      return t("inbox.departure.no_game_time");
    case "rival_offer":
      return t("inbox.departure.rival_offer");
    case "family_move":
      return t("inbox.departure.family_move");
    case "no_contract":
      return t("inbox.departure.no_contract");
  }
}

function departureRoll(masterSeed: number, week: number, playerId: string, salt: string): number {
  let hash = masterSeed ^ week;
  for (const ch of `${playerId}:${salt}`) {
    hash = Math.imul(hash ^ ch.charCodeAt(0), 0x9e3779b1);
  }
  return ((hash >>> 0) % 10_000) / 10_000;
}
