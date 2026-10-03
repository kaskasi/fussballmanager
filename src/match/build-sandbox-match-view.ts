import type { MatchView, SandboxPlan } from "@fussballmanager/shared";
import { SEED_MATCHUP } from "@fussballmanager/shared";

/** Dev sandbox match — same projection as API, runs in-browser (PRD 17). */
export async function buildSandboxMatchView(input: {
  seed: number;
  home: SandboxPlan;
  away: SandboxPlan;
}): Promise<MatchView> {
  const { buildMatchView } = await import("../../server/src/api/match-view.ts");
  return buildMatchView({
    seed: input.seed,
    home: SEED_MATCHUP.home,
    away: SEED_MATCHUP.away,
    homePlan: input.home,
    awayPlan: input.away,
  });
}
