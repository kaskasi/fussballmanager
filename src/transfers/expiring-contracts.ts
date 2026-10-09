import type { Player } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import { contractMonthsRemaining } from "./contract-remaining.ts";
import { estimateCa } from "./market-value.ts";
import { needsYouthContract } from "../player/youth-contract.ts";

export const EXPIRING_CONTRACT_MONTHS = 12;
export const EXPIRING_CONTRACT_LIMIT = 3;

export interface ExpiringContractEntry {
  playerId: string;
  displayName: string;
  position: string;
  age: number;
  ca: number;
  monthsRemaining: number;
  untilSeason: number;
}

function ownSquadWithContract(
  players: readonly Player[],
  clubId: string,
  season: number,
): Player[] {
  return players.filter(
    (player) =>
      player.club_id === clubId &&
      player.squad_status !== "loaned_out" &&
      player.contract &&
      !needsYouthContract(player, season),
  );
}

export function listExpiringClubContracts(
  players: readonly Player[],
  clubId: string,
  season: number,
  week: number,
  limit = EXPIRING_CONTRACT_LIMIT,
): ExpiringContractEntry[] {
  const rows: ExpiringContractEntry[] = [];

  for (const player of ownSquadWithContract(players, clubId, season)) {
    const untilSeason = player.contract!.until_season;
    const monthsRemaining = contractMonthsRemaining(season, week, untilSeason);
    if (monthsRemaining <= 0 || monthsRemaining > EXPIRING_CONTRACT_MONTHS) continue;

    rows.push({
      playerId: player.id,
      displayName: formatPlayerName(player),
      position: player.position,
      age: player.age,
      ca: estimateCa(player.attributes, player.position),
      monthsRemaining,
      untilSeason,
    });
  }

  rows.sort((left, right) => left.monthsRemaining - right.monthsRemaining);
  return rows.slice(0, limit);
}
