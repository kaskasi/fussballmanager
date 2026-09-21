import type { FormationId } from "./formations.ts";
import type { TeamId } from "./ids.ts";

export type TeamTactics = {
  teamId: TeamId;
  /** Phase 1 uses a fixed formation id, not a formation UI. */
  formation: FormationId;
  mentality: number;
  pressing: number;
  width: number;
  tempo: number;
};
