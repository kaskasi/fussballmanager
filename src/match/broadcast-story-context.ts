import type { BroadcastStoryContext } from "@fussballmanager/shared";
import type { GameSession } from "../persistence/game-session.ts";
import { divisionStandings } from "../sim/league-standings.ts";
import type { CareerMatchSetup } from "../sim/career-match-setup.ts";

export function buildBroadcastStoryContext(
  session: GameSession,
  setup: CareerMatchSetup,
  rivalPlayers: readonly import("../types/player.ts").Player[] = session.rivalPlayers,
): BroadcastStoryContext {
  const story = session.storyState;
  const league = session.league;
  const club = session.world.clubs.find((entry) => entry.id === setup.playerClubId);
  const opponentId =
    setup.homeTeamId === setup.playerClubId ? setup.awayTeamId : setup.homeTeamId;
  const isDerby = club?.rivalry_ids.includes(opponentId) ?? false;

  const division = divisionStandings(
    league,
    league.division_id,
    session.masterSeed,
    session.season,
    rivalPlayers,
  );
  const place =
    division.table.findIndex((entry) => entry.teamId === setup.playerClubId) + 1;

  const fan = story.fan_feed[0];
  const chronicle = story.chronicle_entries[0];

  return {
    activeArc: story.active_arc,
    isDerby,
    opponentShortName: setup.opponentShortName,
    fanFeedHead: fan
      ? { speaker: fan.speaker, message: fan.message }
      : null,
    chronicleHead: chronicle ? { title: chronicle.title } : null,
    playerTable:
      place > 0
        ? { place, teams: division.clubIds.length }
        : null,
  };
}
