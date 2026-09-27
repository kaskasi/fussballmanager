import type { Player, PositionPrimary } from "../types/player.ts";
import { estimateCa } from "../transfers/market-value.ts";

export function playerCa(player: Player): number {
  return Math.round(estimateCa(player.attributes, player.position));
}

/** CA change since the previous simulated week (null before first week). */
export function weeklyCaDelta(player: Player): number | null {
  const previous = player.state.last_week_ca;
  if (previous === undefined) return null;
  return playerCa(player) - previous;
}

export function formatCaDelta(delta: number | null): string {
  if (delta === null) return "—";
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return "0";
}

export function caDeltaClassName(delta: number | null): string {
  if (delta === null) return "squad-col-delta";
  if (delta > 0) return "squad-col-delta is-up";
  if (delta < 0) return "squad-col-delta is-down";
  return "squad-col-delta";
}

export function formatRecentGrowth(value: number): string {
  if (value <= 0) return "0";
  return `+${value.toFixed(1)}`;
}

export function squadStatusLabel(status: Player["squad_status"]): string {
  if (status === "u17") return "U17";
  if (status === "u19") return "U19";
  if (status === "pro") return "⭐";
  return status;
}

export function stampLastWeekCa(player: Player): Player {
  return {
    ...player,
    state: {
      ...player.state,
      last_week_ca: playerCa(player),
    },
  };
}

export interface DevelopmentMover {
  playerId: string;
  displayName: string;
  position: PositionPrimary;
  squadStatus: Player["squad_status"];
  ca: number;
  caDelta: number | null;
  recentGrowth: number;
}

export function listDevelopmentMovers(
  players: readonly Player[],
  clubId: string,
  limit = 3,
): DevelopmentMover[] {
  return players
    .filter((player) => player.club_id === clubId && player.squad_status !== "loaned_out")
    .map((player) => ({
      playerId: player.id,
      displayName: formatMoverName(player),
      position: player.position,
      squadStatus: player.squad_status,
      ca: playerCa(player),
      caDelta: weeklyCaDelta(player),
      recentGrowth: player.state.recent_growth_26w ?? 0,
    }))
    .sort((left, right) => {
      const byGrowth = right.recentGrowth - left.recentGrowth;
      if (byGrowth !== 0) return byGrowth;
      const byDelta = (right.caDelta ?? 0) - (left.caDelta ?? 0);
      if (byDelta !== 0) return byDelta;
      return right.ca - left.ca;
    })
    .slice(0, limit);
}

function formatMoverName(player: Player): string {
  const first = player.name.first?.trim() ?? "";
  const last = player.name.last?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  return full || player.id;
}
