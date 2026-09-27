import type { Player, PositionPrimary } from "../types/player.ts";

/** Max registered pros before youth promotions to the first team are blocked. */
export const MAX_PRO_SQUAD_SIZE = 28;

/** Max U19 roster before U17 promotions are blocked. */
export const MAX_U19_SQUAD_SIZE = 22;

const DEFAULT_POSITION_CAP = 3;

const POSITION_CAP: Partial<Record<PositionPrimary, number>> = {
  GK: 2,
  CB: 5,
  LB: 2,
  RB: 2,
  DM: 3,
  CM: 4,
  AM: 3,
  LM: 2,
  RM: 2,
  LW: 2,
  RW: 2,
  CF: 3,
};

export type PromotionTarget = "u19" | "pro";

export type PromotionBlockReason = "squad_full" | "position_full" | "u19_full";

export interface PromotionGateResult {
  allowed: boolean;
  reason?: PromotionBlockReason;
}

export function proSquadSize(players: readonly Player[], clubId: string): number {
  return players.filter((player) => player.club_id === clubId && player.squad_status === "pro").length;
}

export function countProByPosition(
  players: readonly Player[],
  clubId: string,
): Map<PositionPrimary, number> {
  const counts = new Map<PositionPrimary, number>();
  for (const player of players) {
    if (player.club_id !== clubId || player.squad_status !== "pro") continue;
    counts.set(player.position, (counts.get(player.position) ?? 0) + 1);
  }
  return counts;
}

export function promotionGate(
  players: readonly Player[],
  clubId: string,
  position: PositionPrimary,
  target: PromotionTarget,
): PromotionGateResult {
  if (target === "u19") {
    const u19Count = players.filter(
      (player) => player.club_id === clubId && player.squad_status === "u19",
    ).length;
    if (u19Count >= MAX_U19_SQUAD_SIZE) {
      return { allowed: false, reason: "u19_full" };
    }
    return { allowed: true };
  }

  if (proSquadSize(players, clubId) >= MAX_PRO_SQUAD_SIZE) {
    return { allowed: false, reason: "squad_full" };
  }

  const atPosition = countProByPosition(players, clubId).get(position) ?? 0;
  const cap = POSITION_CAP[position] ?? DEFAULT_POSITION_CAP;
  if (atPosition >= cap) {
    return { allowed: false, reason: "position_full" };
  }

  return { allowed: true };
}

export function canPromotePlayer(
  players: readonly Player[],
  clubId: string,
  player: Player,
): PromotionGateResult {
  if (player.squad_status === "u17") {
    return promotionGate(players, clubId, player.position, "u19");
  }
  if (player.squad_status === "u19") {
    return promotionGate(players, clubId, player.position, "pro");
  }
  return { allowed: false, reason: "squad_full" };
}

export function promotionGateLabel(
  result: PromotionGateResult,
  position?: PositionPrimary,
): string | null {
  if (result.allowed) return null;
  switch (result.reason) {
    case "squad_full":
      return "Profikader voll — kein Platz zum Hochziehen";
    case "position_full":
      return `${position ?? "Position"} im Profikader bereits gut besetzt`;
    case "u19_full":
      return "U19-Kader voll — kein Platz zum Hochziehen";
    default:
      return "Hochziehen derzeit nicht möglich";
  }
}
