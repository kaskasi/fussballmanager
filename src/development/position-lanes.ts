import type { PositionPrimary } from "../types/player.ts";
import { t } from "../i18n/index.ts";

/** PRD 14.3 / 07.7 — four coarse lanes (Abw / MIT / ANG in playtest maps to IV / MF / ST). */
export type StaerkeLane = "TW" | "IV" | "MF" | "ST";

export const STAERKE_LANE_ORDER: readonly StaerkeLane[] = ["TW", "IV", "MF", "ST"];

export const STAERKE_LANE_LABELS: Record<StaerkeLane, string> = {
  TW: "Torhüter",
  IV: "Verteidiger",
  MF: "Mittelfeld",
  ST: "Stürmer",
};

/** Full lane name ("Mittelfeld"). */
export function staerkeLaneLabel(lane: StaerkeLane): string {
  return t(`player.lane.${lane}`);
}

/** Short lane tag for chips ("MF"). */
export function staerkeLaneShort(lane: StaerkeLane): string {
  return t(`player.lane.${lane}.short`);
}

export function positionLane(position: PositionPrimary): StaerkeLane {
  if (position === "GK") return "TW";
  if (position === "CB" || position === "LB" || position === "RB") return "IV";
  if (position === "LW" || position === "RW" || position === "CF") return "ST";
  return "MF";
}

export function laneOrderIndex(lane: StaerkeLane): number {
  return STAERKE_LANE_ORDER.indexOf(lane);
}
