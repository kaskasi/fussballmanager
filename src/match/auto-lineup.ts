import { getFormation, type FormationId, type FormationSlotId } from "@fussballmanager/shared";
import { DEFAULT_CLUB_ID } from "../persistence/game-session.ts";
import { estimateCa } from "../transfers/market-value.ts";
import { isPlayerMatchEligible } from "../development/injury-roll.ts";
import type { Player } from "../types/player.ts";
import type { LineupAssignments } from "./lineup-board.ts";

/** F1.3 — auto-lineup assistant modes. */
export type AutoLineupMode = "best_eleven" | "rotation" | "youth";

export type AutoLineupIcon = "star" | "refresh" | "rocket";

export const AUTO_LINEUP_OPTIONS: {
  mode: AutoLineupMode;
  labelKey: string;
  icon: AutoLineupIcon;
  titleKey: string;
}[] = [
  {
    mode: "best_eleven",
    labelKey: "match.lineup.auto.bestEleven",
    icon: "star",
    titleKey: "match.lineup.auto.bestElevenTitle",
  },
  {
    mode: "rotation",
    labelKey: "match.lineup.auto.rotation",
    icon: "refresh",
    titleKey: "match.lineup.auto.rotationTitle",
  },
  {
    mode: "youth",
    labelKey: "match.lineup.auto.youth",
    icon: "rocket",
    titleKey: "match.lineup.auto.youthTitle",
  },
];

export function autoLineupAssignments(
  players: readonly Player[],
  formation: FormationId,
  mode: AutoLineupMode,
  managerClubId: string = DEFAULT_CLUB_ID,
): LineupAssignments {
  const pool = proSquad(players, managerClubId);
  if (pool.length === 0) return {};

  const ranked = rankPool(pool, mode);
  const slots = getFormation(formation);
  const assignments: LineupAssignments = {};
  const used = new Set<string>();

  for (const slot of slots) {
    const pick = pickForSlot(ranked, slot.role, slot.id, mode, used);
    if (!pick) continue;
    assignments[slot.id] = pick.id;
    used.add(pick.id);
  }
  return assignments;
}

function proSquad(players: readonly Player[], managerClubId: string): Player[] {
  return players.filter(
    (player) =>
      player.club_id === managerClubId &&
      player.squad_status === "pro" &&
      isPlayerMatchEligible(player),
  );
}

function rankPool(pool: Player[], mode: AutoLineupMode): Player[] {
  return [...pool].sort((left, right) => scorePlayer(right, mode) - scorePlayer(left, mode));
}

function scorePlayer(player: Player, mode: AutoLineupMode): number {
  const ca = estimateCa(player.attributes, player.position);
  if (mode === "best_eleven") {
    return ca + player.state.form * 2 + player.state.fitness * 0.05;
  }
  if (mode === "rotation") {
    const recentMinutes = player.state.recent_weekly_minutes.reduce((sum, value) => sum + value, 0);
    return player.state.fitness * 1.4 - player.state.season_minutes * 0.08 - recentMinutes * 0.12 + ca * 0.15;
  }
  const youthBoost = player.age <= 21 ? (22 - player.age) * 12 : player.age <= 23 ? 6 : 0;
  return youthBoost + player.state.recent_growth_26w * 2.5 + ca * 0.35 + player.state.form;
}

function pickForSlot(
  ranked: readonly Player[],
  slotRole: string,
  slotId: FormationSlotId,
  mode: AutoLineupMode,
  used: Set<string>,
): Player | undefined {
  let best: Player | undefined;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const candidate of ranked) {
    if (used.has(candidate.id)) continue;
    if (slotId === "GK" && candidate.position !== "GK") continue;
    if (candidate.position === "GK" && slotId !== "GK") continue;
    const fit = roleFit(candidate.position, slotRole);
    const score = scorePlayer(candidate, mode) - fit * 18;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

function roleFit(position: string, slotRole: string): number {
  const map: Record<string, string> = {
    GK: "GK",
    CB: "CB",
    LB: "FB",
    RB: "FB",
    DM: "DM",
    CM: "CM",
    LM: "CM",
    RM: "CM",
    AM: "AM",
    LW: "W",
    RW: "W",
    CF: "ST",
  };
  const playerRole = map[position] ?? "CM";
  if (playerRole === slotRole) return 0;
  const order = ["GK", "FB", "CB", "DM", "CM", "AM", "W", "ST"];
  return Math.abs(order.indexOf(playerRole) - order.indexOf(slotRole));
}
