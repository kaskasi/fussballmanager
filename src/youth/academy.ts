import type { AcademyFacility } from "./intake-generator.ts";

/**
 * Youth campus levels and badge order (PRD 03.2, PRD 09.2 Screen 2).
 * Buying a level is F3.7. This module only says which building is current
 * and which gate blocks the next one.
 */

export const PERFORMANCE_STADIUM_CAPACITY = 20_000;

export const COACH_ICON_ORDER = ["🚀", "➡️", "⚠️", "😞"] as const;

export type CoachIcon = (typeof COACH_ICON_ORDER)[number];

/** PRD 03.3 coach_comment_icon — short tooltip copy for the youth roster. */
export const COACH_ICON_LABELS: Record<CoachIcon, string> = {
  "🚀": "Starke Woche — Top-Form im Jugendspiel",
  "➡️": "Solide Woche — normaler Entwicklungsverlauf",
  "⚠️": "Achtung — wenig Spielzeit oder Stagnation",
  "😞": "Schwache Form oder niedrige Moral",
};

export function coachIconLabel(icon: CoachIcon): string {
  return COACH_ICON_LABELS[icon];
}

export interface AcademyFacilityDef {
  id: AcademyFacility;
  name: string;
  cost: number;
  requires?: "stadion_min_capacity_20000" | "academy_performance";
  effect: string;
  icon: string;
}

export const ACADEMY_FACILITIES: readonly AcademyFacilityDef[] = [
  {
    id: "academy_basic",
    name: "Jugendhaus (Basis)",
    cost: 0,
    effect: "Standard Intake-Qualität",
    icon: "🏠",
  },
  {
    id: "academy_performance",
    name: "Leistungszentrum",
    cost: 2_500_000,
    requires: "stadion_min_capacity_20000",
    effect: "Intake-Means +10, Drive-Umfeld +0.15",
    icon: "🏋️",
  },
  {
    id: "academy_elite",
    name: "Elite-Akademie",
    cost: 8_500_000,
    requires: "academy_performance",
    effect: "Intake-Means +25, 1.5× Gewicht der Elite-Komponente (mean 120), Mentoren-Level steigt",
    icon: "⭐",
  },
];

export interface CampusBadge {
  playerId: string;
  position: string;
  coachIcon: CoachIcon;
  departureRisk: boolean;
}

export type FacilityGate =
  | { status: "current" }
  | { status: "open" }
  | { status: "needs_stadium"; capacity: number }
  | { status: "needs_performance" };

const RANK: Record<AcademyFacility, number> = {
  academy_basic: 0,
  academy_performance: 1,
  academy_elite: 2,
};

/** PRD 14.4 — Campus-Stufe 1/2/3 from the owned academy building. */
export function academyStage(owned: AcademyFacility): number {
  return RANK[owned] + 1;
}


export function facilityById(id: AcademyFacility): AcademyFacilityDef {
  const found = ACADEMY_FACILITIES.find((facility) => facility.id === id);
  if (!found) throw new Error(`Unknown academy facility ${id}`);
  return found;
}

export function nextFacility(owned: AcademyFacility): AcademyFacility | null {
  if (owned === "academy_basic") return "academy_performance";
  if (owned === "academy_performance") return "academy_elite";
  return null;
}

/** Gate for showing the next building. Does not spend money. */
export function facilityGate(
  owned: AcademyFacility,
  target: AcademyFacility,
  stadiumCapacity: number,
): FacilityGate {
  if (target === owned) return { status: "current" };
  if (RANK[target] > RANK[owned] + 1 || (target === "academy_elite" && owned === "academy_basic")) {
    return { status: "needs_performance" };
  }
  if (target === "academy_performance" && stadiumCapacity < PERFORMANCE_STADIUM_CAPACITY) {
    return { status: "needs_stadium", capacity: PERFORMANCE_STADIUM_CAPACITY };
  }
  return { status: "open" };
}

export function sortCampusBadges<T extends CampusBadge>(badges: readonly T[]): T[] {
  return [...badges].sort((a, b) => {
    const byIcon = COACH_ICON_ORDER.indexOf(a.coachIcon) - COACH_ICON_ORDER.indexOf(b.coachIcon);
    if (byIcon !== 0) return byIcon;
    return a.playerId.localeCompare(b.playerId);
  });
}

export function groupCampusBadges<T extends CampusBadge>(
  badges: readonly T[],
): Array<{ icon: CoachIcon; badges: T[] }> {
  const sorted = sortCampusBadges(badges);
  return COACH_ICON_ORDER.map((icon) => ({
    icon,
    badges: sorted.filter((badge) => badge.coachIcon === icon),
  })).filter((group) => group.badges.length > 0);
}
