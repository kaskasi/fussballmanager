import { t } from "../i18n/index.ts";
import type { Player } from "../types/player.ts";
import { estimateCa } from "./market-value.ts";

/**
 * PRD 05 §6 — buying a player who is not on the transfer list ("approach").
 * The club negotiates, but asks a premium and keeps its key players.
 */
export const UNSOLICITED_PREMIUM = 1.4;
/** The club's best N players by CA are not for sale without a listing. */
export const UNSOLICITED_KEY_PLAYERS = 3;

export function unsolicitedAskingPrice(baseAsking: number): number {
  return Math.round(baseAsking * UNSOLICITED_PREMIUM);
}

/** Refusal reason when the selling club keeps this player, else null. */
export function unsolicitedRefusalReason(
  player: Player,
  clubPlayers: readonly Player[],
): string | null {
  const clubId = player.club_id;
  if (!clubId) return null;
  const ranked = clubPlayers
    .filter((entry) => entry.club_id === clubId && entry.id !== player.id)
    .map((entry) => estimateCa(entry.attributes, entry.position));
  const ca = estimateCa(player.attributes, player.position);
  const better = ranked.filter((value) => value > ca).length;
  if (better < UNSOLICITED_KEY_PLAYERS) {
    return t("transfer.purchase.keyPlayer");
  }
  return null;
}
