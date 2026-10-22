import type { Player, PositionPrimary } from "../types/player.ts";
import { estimateCa } from "../transfers/market-value.ts";
import { formatDecimal } from "../i18n/number-display.ts";

export function playerCa(player: Player): number {
  return Math.round(estimateCa(player.attributes, player.position));
}

/** Unrounded CA — monthly growth is often below one point, so period deltas need the fraction. */
function rawCa(player: Player): number {
  return estimateCa(player.attributes, player.position);
}

/** Weeks of CA history kept for the Hub "year" view. */
export const CA_HISTORY_WEEKS = 52;

/** CA change since the previous simulated week (null before first week). */
export function weeklyCaDelta(player: Player): number | null {
  const previous = player.state.last_week_ca;
  if (previous === undefined) return null;
  return playerCa(player) - previous;
}

/** CA change since the start of the given season (null in season 1 before first snapshot). */
export function seasonCaDelta(player: Player, season: number): number | null {
  const baseline = player.history.growth
    .filter((entry) => entry.season < season)
    .at(-1);
  if (!baseline) return null;
  const startCa = Math.round(estimateCa(baseline.attributes_snapshot, player.position));
  if (!Number.isFinite(startCa)) return null;
  return playerCa(player) - startCa;
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

/** Icon-first CA delta mark (PRD 09 — paired with color). */
export function caDeltaMark(delta: number | null): string {
  if (delta === null) return "·";
  if (delta > 0) return "▲";
  if (delta < 0) return "▼";
  return "—";
}

export interface SquadCaDeltaSummary {
  total: number;
  risers: number;
  fallers: number;
  flat: number;
  hasData: boolean;
}

export function squadWeeklyCaDeltaSummary(
  players: readonly Player[],
  clubId: string,
): SquadCaDeltaSummary {
  const squad = players.filter(
    (player) => player.club_id === clubId && player.squad_status === "pro",
  );
  let total = 0;
  let risers = 0;
  let fallers = 0;
  let flat = 0;
  let hasData = false;

  for (const player of squad) {
    const delta = weeklyCaDelta(player);
    if (delta === null) continue;
    hasData = true;
    total += delta;
    if (delta > 0) risers += 1;
    else if (delta < 0) fallers += 1;
    else flat += 1;
  }

  return { total, risers, fallers, flat, hasData };
}

export function formatSquadCaDeltaSummary(summary: SquadCaDeltaSummary): string {
  if (!summary.hasData) return "Noch keine Woche simuliert";
  const sign = summary.total > 0 ? "+" : "";
  return `${sign}${summary.total} CA · ${summary.risers}▲ ${summary.fallers}▼`;
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

/**
 * Record the CA the player had when the week started (`weekStart`, before training and matches),
 * so the next weekly Δ compares against it. Without a week-start copy the player's own CA is used.
 */
export function stampLastWeekCa(player: Player, weekStart: Player = player): Player {
  const startRaw = rawCa(weekStart);
  const history = [...(player.state.ca_history ?? []), Math.round(startRaw * 100) / 100].slice(-CA_HISTORY_WEEKS);
  return {
    ...player,
    state: {
      ...player.state,
      last_week_ca: Math.round(startRaw),
      ca_history: history,
    },
  };
}

export interface DevelopmentMover {
  playerId: string;
  displayName: string;
  portraitSeed: number;
  clubId: string | null;
  age: number;
  position: PositionPrimary;
  squadStatus: Player["squad_status"];
  ca: number;
  caDelta: number | null;
  recentGrowth: number;
}

export type DevelopmentMoverPeriod = "week" | "month" | "year";

/** Display delta for hub dev pills (week = CA, month ≈ 4-week pace, year = season CA). */
const PERIOD_WEEKS: Record<DevelopmentMoverPeriod, number> = { week: 1, month: 4, year: CA_HISTORY_WEEKS };

/**
 * CA change over the last week / 4 weeks / 52 weeks, from the week-start history (unrounded).
 * With less history than the period, it measures from the oldest recorded week; null before the first week.
 */
export function developmentMoverPeriodDelta(
  player: Player,
  period: DevelopmentMoverPeriod,
  _season?: number,
): number | null {
  const history = player.state.ca_history ?? [];
  if (history.length === 0) return null;
  const from = history[Math.max(0, history.length - PERIOD_WEEKS[period])]!;
  return Math.round((rawCa(player) - from) * 10) / 10;
}

export function formatDevelopmentPeriodDelta(delta: number | null): string {
  if (delta === null) return "—";
  if (Math.abs(delta) < 0.05) return "0";
  const body = formatDecimal(Math.abs(delta), 1);
  return delta > 0 ? `+${body}` : `−${body}`;
}

/** Squad players ranked by CA gain over `period` (Hub desk); without a period by 26-week growth (pipeline). */
export function listDevelopmentMovers(
  players: readonly Player[],
  clubId: string,
  limit = 3,
  period?: DevelopmentMoverPeriod,
): DevelopmentMover[] {
  const squad = players.filter((player) => player.club_id === clubId && player.squad_status !== "loaned_out");
  if (period) {
    const ranked = squad
      .map((player) => ({ player, delta: developmentMoverPeriodDelta(player, period) }))
      .sort((left, right) => (right.delta ?? -Infinity) - (left.delta ?? -Infinity) || playerCa(right.player) - playerCa(left.player));
    return ranked.slice(0, limit).map(({ player }) => toMover(player));
  }
  return squad
    .map(toMover)
    .sort((left, right) => {
      const byGrowth = right.recentGrowth - left.recentGrowth;
      if (byGrowth !== 0) return byGrowth;
      const byDelta = (right.caDelta ?? 0) - (left.caDelta ?? 0);
      if (byDelta !== 0) return byDelta;
      return right.ca - left.ca;
    })
    .slice(0, limit);
}

function toMover(player: Player): DevelopmentMover {
  return {
    playerId: player.id,
    displayName: formatMoverName(player),
    portraitSeed: player.portrait_seed,
    clubId: player.club_id,
    age: player.age,
    position: player.position,
    squadStatus: player.squad_status,
    ca: playerCa(player),
    caDelta: weeklyCaDelta(player),
    recentGrowth: player.state.recent_growth_26w ?? 0,
  };
}

function formatMoverName(player: Player): string {
  const first = player.name.first?.trim() ?? "";
  const last = player.name.last?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  return full || player.id;
}
