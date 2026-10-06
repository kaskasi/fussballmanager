/** PRD 22 v2 — finite tactic grid for Monte Carlo studies. */
import {
  FORMATION_IDS,
  sandboxPlanFromFormation,
  type FormationId,
  type SandboxPlan,
} from "@fussballmanager/shared";
import { tacticHashFromPlan } from "./opponent-scout-bundle.ts";

export interface TacticLatticeConfig {
  mentalitySteps: readonly number[];
  pressingSteps: readonly number[];
  lineHeightSteps: readonly number[];
}

/** 3 × 5 × 5 × 5 = 375 plans (offline default). */
export const DEFAULT_OFFLINE_LATTICE: TacticLatticeConfig = {
  mentalitySteps: [40, 46, 52, 58, 64],
  pressingSteps: [40, 48, 56, 64, 72],
  lineHeightSteps: [40, 48, 56, 64, 72],
};

/** Smaller grid for CI / quick probes. */
export const COMPACT_OFFLINE_LATTICE: TacticLatticeConfig = {
  mentalitySteps: [46, 58],
  pressingSteps: [48, 64],
  lineHeightSteps: [48, 64],
};

export interface LatticeTacticPlan {
  planId: string;
  label: string;
  formation: FormationId;
  plan: SandboxPlan;
  tacticHash: number;
}

export function latticePlanCount(config: TacticLatticeConfig = DEFAULT_OFFLINE_LATTICE): number {
  return (
    FORMATION_IDS.length *
    config.mentalitySteps.length *
    config.pressingSteps.length *
    config.lineHeightSteps.length
  );
}

export function enumerateTacticPlans(
  basePlan: SandboxPlan,
  config: TacticLatticeConfig = DEFAULT_OFFLINE_LATTICE,
): LatticeTacticPlan[] {
  const plans: LatticeTacticPlan[] = [];
  for (const formation of FORMATION_IDS) {
    const formationBase = sandboxPlanFromFormation(formation);
    for (const mentality of config.mentalitySteps) {
      for (const pressing of config.pressingSteps) {
        for (const lineHeight of config.lineHeightSteps) {
          const plan: SandboxPlan = {
            ...formationBase,
            formation,
            mentality,
            pressing,
            lineHeight,
            width: basePlan.width,
            tempo: basePlan.tempo,
            intensity: basePlan.intensity,
            fluidity: basePlan.fluidity,
          };
          const planId = `${formation}_m${mentality}_p${pressing}_l${lineHeight}`;
          plans.push({
            planId,
            label: `${formation} · M${mentality} P${pressing} L${lineHeight}`,
            formation,
            plan,
            tacticHash: tacticHashFromPlan(plan),
          });
        }
      }
    }
  }
  return plans;
}
