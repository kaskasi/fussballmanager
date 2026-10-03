import type { MatchView } from "@fussballmanager/shared";
import {
  buildCareerMatchViewLocally,
  type CareerMatchBuildInput,
} from "./build-career-match-view.ts";
import { normalizeMatchView } from "./normalize-match-view.ts";

/** Career match — engine runs in the client (PRD 17). Dev server API optional legacy. */
export async function fetchCareerMatchView(input: CareerMatchBuildInput): Promise<MatchView> {
  if (
    input.playerClubSquad &&
    input.playerClubSquad.team.id !== input.homeTeamId &&
    input.playerClubSquad.team.id !== input.awayTeamId
  ) {
    throw new Error(
      "Aufstellung passt nicht zum Spiel — bitte Seite neu laden und Aufstellung erneut bestätigen.",
    );
  }
  const view = await buildCareerMatchViewLocally(input);
  return normalizeMatchView(view);
}
