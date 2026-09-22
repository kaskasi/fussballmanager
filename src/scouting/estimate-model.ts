/**
 * Scout knowledge (PRD 04.1, invariant 04.6).
 * File is kebab-case per the project naming rule.
 *
 * An observation narrows `uncertaintyRange` and adds samples.
 * The published rule does not move `estimatedAbilityMean`.
 * A quiet week widens the range by 0.25, never past 40.
 * Own players have no interval.
 */

export interface AbilityEstimate {
  estimatedAbilityMean: number;
  uncertaintyRange: number;
  sampleSize: number;
}

export type PlayerKnowledge = { status: "owned" } | { status: "scouted"; estimate: AbilityEstimate };

export type ObservationKind = "live_match_view" | "scout_visit_report" | "video_review" | "trial_period";

export const UNKNOWN_PRIOR: AbilityEstimate = {
  estimatedAbilityMean: 65,
  uncertaintyRange: 40,
  sampleSize: 0,
};

const UNCERTAINTY_CEILING = 40;
const WEEKLY_DECAY = 0.25;

const OBSERVATIONS: Record<ObservationKind, { reducesUncertaintyBy: number; samples: number }> = {
  live_match_view: { reducesUncertaintyBy: 15, samples: 1 },
  scout_visit_report: { reducesUncertaintyBy: 8, samples: 1 },
  video_review: { reducesUncertaintyBy: 5, samples: 1 },
  trial_period: { reducesUncertaintyBy: 25, samples: 3 },
};

export function unknownPlayer(): PlayerKnowledge {
  return { status: "scouted", estimate: { ...UNKNOWN_PRIOR } };
}

export function ownPlayer(): PlayerKnowledge {
  return { status: "owned" };
}

export function applyObservation(knowledge: PlayerKnowledge, kind: ObservationKind): PlayerKnowledge {
  if (knowledge.status === "owned") return knowledge;
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
  if (range >= 40) return "❓ Unbekannt";
  if (range >= 20) return "🤷 Unklar";
  if (range >= 10) return "👁️ Grobes Bild";
  if (range >= 5) return "✅ Gut bekannt";
  return "🎯 Präzise Einschätzung";
}
