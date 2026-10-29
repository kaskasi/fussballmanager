import type { BroadcastStoryContext, MatchView, Squad, TeamId } from "@fussballmanager/shared";
import type { MatchSubstitutionRequest } from "../../server/src/api/manual-substitution.ts";

export type CareerMatchBuildInput = {
  seed: number;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  homeSquad: Squad;
  awaySquad: Squad;
  playerClubSquad?: Squad;
  broadcastStory?: BroadcastStoryContext;
  /** PRD 27 — the manager's live changes; the match replays identically up to each one. */
  substitutions?: readonly MatchSubstitutionRequest[];
  /** The assistant takes over the manager's changes from this seq ("skip to report"). */
  assistantFromSeq?: number;
};

function squadsForCareerMatch(input: CareerMatchBuildInput): {
  home: Squad;
  away: Squad;
  humanTeamId: TeamId;
} {
  const home =
    input.playerClubSquad?.team.id === input.homeTeamId
      ? input.playerClubSquad
      : input.homeSquad;
  const away =
    input.playerClubSquad?.team.id === input.awayTeamId
      ? input.playerClubSquad
      : input.awaySquad;
  const humanTeamId =
    input.playerClubSquad?.team.id === home.team.id ||
    input.playerClubSquad?.team.id === away.team.id
      ? input.playerClubSquad.team.id
      : home.team.id;
  return { home, away, humanTeamId };
}

/** Full match sim in-browser (same code path as Worker API). */
export async function buildCareerMatchViewLocally(
  input: CareerMatchBuildInput,
): Promise<MatchView> {
  const { buildMatchView } = await import("../../server/src/api/match-view.ts");
  const { home, away, humanTeamId } = squadsForCareerMatch(input);
  return buildMatchView({
    seed: input.seed,
    home,
    away,
    humanTeamId,
    broadcastStory: input.broadcastStory,
    substitutions: input.substitutions,
    assistantFromSeq: input.assistantFromSeq,
  });
}
