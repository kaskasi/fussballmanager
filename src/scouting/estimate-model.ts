/**
 * Scout knowledge (PRD 04.1, invariant 04.6).
 * File is kebab-case per the project naming rule.
 *
 * An observation narrows `uncertaintyRange` and adds samples.
 * The published rule does not move `estimatedAbilityMean`.
 * A quiet week widens the range by 0.25, never past 40.
 * Own players have no interval.
 */
import { t } from "../i18n/index.ts";

export interface AbilityEstimate {
  estimatedAbilityMean: number;
  uncertaintyRange: number;
  sampleSize: number;
}

export type PlayerKnowledge = { status: "owned" } | { status: "scouted"; estimate: AbilityEstimate };

export type ObservationKind =
  | "live_match_view"
  | "scout_visit_report"
  | "video_review"
  | "trial_period"
  | "map_club_visit";

/** Floor for foreign players after map revisits (PRD 04.5 map visit). */
export const MAP_CLUB_VISIT_MIN_UNCERTAINTY = 5;

export const UNKNOWN_PRIOR: AbilityEstimate = {
  estimatedAbilityMean: 65,
  uncertaintyRange: 40,
  sampleSize: 0,
};

const UNCERTAINTY_CEILING = 40;
const WEEKLY_DECAY = 0.25;

const OBSERVATIONS: Record<
  Exclude<ObservationKind, "map_club_visit">,
  { reducesUncertaintyBy: number; samples: number }
> = {
  live_match_view: { reducesUncertaintyBy: 15, samples: 1 },
  scout_visit_report: { reducesUncertaintyBy: 8, samples: 1 },
  video_review: { reducesUncertaintyBy: 5, samples: 1 },
  trial_period: { reducesUncertaintyBy: 25, samples: 3 },
};

/** Multiplicative −⅓ uncertainty per map club visit (plan: Rest × 2/3, min 5). */
export function applyMapClubVisitToEstimate(estimate: AbilityEstimate): AbilityEstimate {
  const uncertaintyRange = Math.max(
    MAP_CLUB_VISIT_MIN_UNCERTAINTY,
    Math.floor(estimate.uncertaintyRange * (2 / 3)),
  );
  return {
    ...estimate,
    uncertaintyRange,
    sampleSize: estimate.sampleSize + 1,
  };
}

export function unknownPlayer(): PlayerKnowledge {
  return { status: "scouted", estimate: { ...UNKNOWN_PRIOR } };
}

export function ownPlayer(): PlayerKnowledge {
  return { status: "owned" };
}

export function applyObservation(knowledge: PlayerKnowledge, kind: ObservationKind): PlayerKnowledge {
  if (knowledge.status === "owned") return knowledge;
  if (kind === "map_club_visit") {
    return {
      status: "scouted",
      estimate: applyMapClubVisitToEstimate(knowledge.estimate),
    };
  }
  const rule = OBSERVATIONS[kind];
  return {
    status: "scouted",
    estimate: {
      estimatedAbilityMean: knowledge.estimate.estimatedAbilityMean,
      uncertaintyRange: Math.max(0, knowledge.estimate.uncertaintyRange - rule.reducesUncertaintyBy),
      sampleSize: knowledge.estimate.sampleSize + rule.samples,
    },
  };
}

/** One week with no new observation. Own players stay fully known. */
export function applyQuietWeek(knowledge: PlayerKnowledge): PlayerKnowledge {
  if (knowledge.status === "owned") return knowledge;
  return {
    status: "scouted",
    estimate: {
      ...knowledge.estimate,
      uncertaintyRange: Math.min(UNCERTAINTY_CEILING, knowledge.estimate.uncertaintyRange + WEEKLY_DECAY),
    },
  };
}

/** Labels from PRD 04.1. Own players have no band, so this returns null. */
export function confidenceLabel(knowledge: PlayerKnowledge): string | null {
  if (knowledge.status === "owned") return null;
  const range = knowledge.estimate.uncertaintyRange;
  if (range >= 40) return t("scouting.knowledge.unknown");
  if (range >= 20) return t("scouting.knowledge.unclear");
  if (range >= 10) return t("scouting.knowledge.rough");
  if (range >= 5) return t("scouting.knowledge.good");
  return t("scouting.knowledge.precise");
}
