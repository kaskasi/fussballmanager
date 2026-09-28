import type { PositionPrimary } from "../types/player.ts";
import type { MarketFilters } from "./market-list.ts";
import { filterMarket } from "./market-list.ts";
import type { BoardTarget } from "./scout-board.ts";

/** PRD 04.2 — default local scout network capacity. */
export const DEFAULT_SCOUT_CAPACITY = 3;

export interface ScoutAssignmentCriteria {
  position: PositionPrimary | "all";
  age: MarketFilters["age"];
  region: string;
  query: string;
}

export interface ScoutAssignment {
  id: string;
  label: string;
  criteria: ScoutAssignmentCriteria;
  active: boolean;
}

export const DEFAULT_ASSIGNMENT_CRITERIA: ScoutAssignmentCriteria = {
  position: "all",
  age: "all",
  region: "",
  query: "",
};

export function createScoutAssignment(
  id: string,
  criteria: Partial<ScoutAssignmentCriteria> = {},
  label?: string,
): ScoutAssignment {
  const merged: ScoutAssignmentCriteria = {
    ...DEFAULT_ASSIGNMENT_CRITERIA,
    ...criteria,
  };
  return {
    id,
    label: label ?? assignmentLabel(merged),
    criteria: merged,
    active: true,
  };
}

export function assignmentLabel(criteria: ScoutAssignmentCriteria): string {
  const parts: string[] = [];
  if (criteria.position !== "all") parts.push(criteria.position);
  if (criteria.age !== "all") {
    parts.push(criteria.age === "u21" ? "U21" : criteria.age === "28+" ? "28+" : "22–27");
  }
  if (criteria.region.trim()) parts.push(criteria.region.trim());
  if (criteria.query.trim()) parts.push(`„${criteria.query.trim()}“`);
  return parts.length > 0 ? parts.join(" · ") : "Alle Spieler";
}

export function assignmentMatchesTarget(
  assignment: ScoutAssignment,
  target: BoardTarget,
): boolean {
  if (!assignment.active) return false;
  const filters: MarketFilters = {
    query: assignment.criteria.query,
    position: assignment.criteria.position,
    age: assignment.criteria.age,
    confidence: "all",
  };
  const region = assignment.criteria.region.trim().toLowerCase();
  if (region && !target.player.birth.region.toLowerCase().includes(region)) {
    return false;
  }
  return filterMarket([{ player: target.player, estimate: target.estimate }], filters).length > 0;
}

export function targetsForAssignment(
  assignment: ScoutAssignment,
  targets: readonly BoardTarget[],
): BoardTarget[] {
  return targets.filter((target) => assignmentMatchesTarget(assignment, target));
}

export function activeAssignmentCount(assignments: readonly ScoutAssignment[]): number {
  return assignments.filter((assignment) => assignment.active).length;
}

export interface ScoutDiscoveryAlert {
  id: string;
  playerId: string;
  playerName: string;
  position: PositionPrimary;
  week: number;
  estimatedCa: number;
  assignmentId?: string;
  headline: string;
}

export function discoveryHeadline(estimatedCa: number, position: PositionPrimary): string {
  if (estimatedCa >= 120) return `🚀 Top-Talent (${position})`;
  if (estimatedCa >= 100) return `⭐ Interessanter Kandidat (${position})`;
  return `👁️ Neuer Fund (${position})`;
}
