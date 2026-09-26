import type { Player, PositionPrimary } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import { estimateCa } from "../transfers/market-value.ts";

export interface ProSquadRow {
  playerId: string;
  displayName: string;
  position: PositionPrimary;
  age: number;
  ca: number;
  form: number;
  seasonMinutes: number;
  marketValue: number;
}

const POSITION_ORDER: Record<PositionPrimary, number> = {
  GK: 0,
  CB: 1,
  LB: 2,
  RB: 3,
  DM: 4,
  CM: 5,
  AM: 6,
  LM: 7,
  RM: 8,
  LW: 9,
  RW: 10,
  CF: 11,
};

export function listProSquad(players: readonly Player[], clubId: string): ProSquadRow[] {
  return players
    .filter((player) => player.club_id === clubId && player.squad_status === "pro")
    .map((player) => ({
      playerId: player.id,
      displayName: formatPlayerName(player),
      position: player.position,
      age: player.age,
      ca: Math.round(estimateCa(player.attributes, player.position)),
      form: player.state.form,
      seasonMinutes: player.state.season_minutes,
      marketValue: player.market_value,
    }))
    .sort(
      (left, right) =>
        POSITION_ORDER[left.position] - POSITION_ORDER[right.position] ||
        right.ca - left.ca ||
        left.displayName.localeCompare(right.displayName),
    );
}

export function formatMarketValueShort(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return `${value}`;
}
