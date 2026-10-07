import type { PositionPrimary } from "../types/player.ts";
import type { MarketFilters } from "./market-list.ts";
import type { ScoutCalendarDay } from "./scout-calendar-day.ts";
import { filterMarket } from "./market-list.ts";
import type { BoardTarget } from "./scout-board.ts";

/** PRD 04.2 — default local scout network capacity. */
export const DEFAULT_SCOUT_CAPACITY = 3;

export type ScoutAssignmentKind = "roster" | "filter_sweep";

export interface ScoutAssignmentCriteria {
  position: PositionPrimary | "all";
  age: MarketFilters["age"];
  region: string;
  query: string;
  confidence: MarketFilters["confidence"];
}

export function assignmentCriteriaToMarketFilters(
  criteria: ScoutAssignmentCriteria,
): MarketFilters {
  const query = criteria.query.trim() || criteria.region.trim();
  return {
    query,
    position: criteria.position,
    age: criteria.age,
    confidence: criteria.confidence ?? "all",
  };
}

export interface ScoutAssignment {
  id: string;
  label: string;
  criteria: ScoutAssignmentCriteria;
  active: boolean;
  /** `filter_sweep`: anteilige Pool-Woche; `roster`: Kapazitäts-Ziele (Legacy/Assistent). */
  kind?: ScoutAssignmentKind;
  weeksRemaining?: number;
  cancelling_since?: ScoutCalendarDay;
}

export const DEFAULT_ASSIGNMENT_CRITERIA: ScoutAssignmentCriteria = {
  position: "all",
  age: "all",
  region: "",
  query: "",
  confidence: "all",
};

export function createScoutAssignment(
  id: string,
  criteria: Partial<ScoutAssignmentCriteria> = {},
  label?: string,
  options?: { kind?: ScoutAssignmentKind; weeksRemaining?: number },
): ScoutAssignment {
  const merged: ScoutAssignmentCriteria = {
    ...DEFAULT_ASSIGNMENT_CRITERIA,
    ...criteria,
  };
  const kind = options?.kind ?? "roster";
  return {
    id,
    label: label ?? assignmentLabel(merged),
    criteria: merged,
    active: true,
    kind,
    weeksRemaining:
      options?.weeksRemaining ?? (kind === "filter_sweep" ? 1 : undefined),
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
  if ((assignment.kind ?? "roster") === "filter_sweep" && (assignment.weeksRemaining ?? 0) <= 0) {
    return false;
  }
  const filters = assignmentCriteriaToMarketFilters(assignment.criteria);
  return filterMarket(
    [{ player: target.player, estimate: target.estimate, clubName: target.clubName }],
    filters,
  ).length > 0;
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
