import type { LeagueState } from "../persistence/league-state.ts";
import { leagueTable } from "../sim/league-week.ts";
import { applyChronicleEntry } from "./apply.ts";
import { seasonCodaChronicle } from "./render.ts";
import { isInRelegationZone, SURVIVAL_TARGET_PLACE } from "./season-objectives.ts";
import type { StoryState } from "./story-state.ts";

export function appendSeasonCoda(
  story: StoryState,
  league: LeagueState,
  endingSeason: number,
  week: number,
): StoryState {
  if (story.active_arc !== "relegation_battle" || !story.opening_complete) return story;

  const place =
    leagueTable(league).findIndex((row) => row.teamId === league.player_club_id) + 1;
  if (place <= 0) return story;

  const survived = place <= SURVIVAL_TARGET_PLACE;
  const coda = seasonCodaChronicle(survived, place, story.cast, story.career_origin);
  return applyChronicleEntry(story, {
    id: `chronicle_season_end_${endingSeason}`,
    season: endingSeason,
    week,
    icon: coda.icon,
    title: coda.title,
    body: coda.body,
  });
}

export function seasonSurvived(league: LeagueState): boolean {
  const place =
    leagueTable(league).findIndex((row) => row.teamId === league.player_club_id) + 1;
  return place > 0 && !isInRelegationZone(place) && place <= SURVIVAL_TARGET_PLACE;
}
