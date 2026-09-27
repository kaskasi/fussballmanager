import type { Player, PositionPrimary } from "../types/player.ts";
import { formatPlayerName } from "../types/player-display.ts";
import { seasonMatchRating } from "../player/season-stats.ts";
import { weeklyCaDelta } from "../player/ca-tracking.ts";
import { estimateCa } from "../transfers/market-value.ts";

export interface ProSquadRow {
  playerId: string;
  displayName: string;
  position: PositionPrimary;
  age: number;
  ca: number;
  caDelta: number | null;
  form: number;
  seasonMinutes: number;
  marketValue: number;
  goals: number;
  assists: number;
  yellowCards: number;
  tackles: number;
  headers: number;
  avgRating: number | null;
}

export type ProSquadSortKey =
  | "name"
  | "position"
  | "age"
  | "ca"
  | "caDelta"
  | "marketValue"
  | "seasonMinutes"
  | "goals"
  | "assists"
  | "yellowCards"
  | "tackles"
  | "headers"
  | "avgRating"
  | "form";

export type ProSquadSortDirection = "asc" | "desc";

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
      caDelta: weeklyCaDelta(player),
      form: player.state.form,
      seasonMinutes: player.state.season_minutes,
      marketValue: player.market_value,
      goals: player.state.season_goals ?? 0,
      assists: player.state.season_assists ?? 0,
      yellowCards: player.state.season_yellow_cards ?? 0,
      tackles: player.state.season_tackles ?? 0,
      headers: player.state.season_headers ?? 0,
      avgRating: seasonMatchRating(player),
    }));
}

export function sortProSquadRows<T extends ProSquadRow>(
  rows: readonly T[],
  key: ProSquadSortKey,
  direction: ProSquadSortDirection,
): T[] {
  return [...rows].sort(compareProSquadRows(key, direction));
}

function compareProSquadRows(
  key: ProSquadSortKey,
  direction: ProSquadSortDirection,
): (left: ProSquadRow, right: ProSquadRow) => number {
  const factor = direction === "asc" ? 1 : -1;
  return (left, right) => {
    const delta = compareByKey(left, right, key);
    if (delta !== 0) return delta * factor;
    return left.displayName.localeCompare(right.displayName, "de");
  };
}

function compareByKey(left: ProSquadRow, right: ProSquadRow, key: ProSquadSortKey): number {
  switch (key) {
    case "name":
      return left.displayName.localeCompare(right.displayName, "de");
    case "position":
      return POSITION_ORDER[left.position] - POSITION_ORDER[right.position] || right.ca - left.ca;
    case "age":
      return left.age - right.age;
    case "ca":
      return left.ca - right.ca;
    case "caDelta":
      return (left.caDelta ?? -999) - (right.caDelta ?? -999);
    case "marketValue":
      return left.marketValue - right.marketValue;
    case "seasonMinutes":
      return left.seasonMinutes - right.seasonMinutes;
    case "goals":
      return left.goals - right.goals;
    case "assists":
      return left.assists - right.assists;
    case "yellowCards":
      return left.yellowCards - right.yellowCards;
    case "tackles":
      return left.tackles - right.tackles;
    case "headers":
      return left.headers - right.headers;
    case "avgRating":
      return (left.avgRating ?? -1) - (right.avgRating ?? -1);
    case "form":
      return left.form - right.form;
    default:
      return 0;
  }
}

export function formatMarketValueShort(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return `${value}`;
}
