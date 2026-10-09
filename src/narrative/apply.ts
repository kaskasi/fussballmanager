import type { BoardState } from "../board/board-state.ts";
import type { ClubStadium } from "../stadium/club-stadium.ts";
import { applyRestaurantWeddingRepeat } from "../stadium/precinct-campus-events.ts";
import { careerWeekIndex, RESTAURANT_VIRAL_WEEKS } from "../stadium/hospitality.ts";
import { advanceClubFanbase } from "../stadium/fanbase.ts";
import type { Player } from "../types/player.ts";
import { captainMoraleNeighbors } from "./captain.ts";
import {
  appendChronicle,
  appendFanFeed,
  clampMediaHype,
  markBeatFired,
  type ChronicleEntry,
  type FanFeedBeat,
  type StoryState,
} from "./story-state.ts";

export interface StoryEffectResult {
  story: StoryState;
  board?: BoardState;
  stadium?: ClubStadium;
  players?: Player[];
}

export function applyStoryChoice(
  story: StoryState,
  beatId: string,
  choiceId: string,
  context: {
    board: BoardState;
    stadium: ClubStadium;
    players: Player[];
    clubId: string;
    season: number;
    week: number;
  },
): StoryEffectResult {
  let nextStory = markBeatFired(story, beatId);
  let board = { ...context.board };
  let stadium = context.stadium;
  let players = [...context.players];

  const adjustPressure = (delta: number) => {
    board = {
      ...board,
      pressure: Math.min(100, Math.max(0, board.pressure + delta)),
    };
  };
  const adjustHype = (delta: number) => {
    nextStory = {
      ...nextStory,
      media_hype: clampMediaHype(nextStory.media_hype + delta),
    };
  };
  const adjustFanbase = (delta: number) => {
    stadium = advanceClubFanbase(stadium, delta);
  };
  const adjustSquadMorale = (delta: number, playerIds?: string[]) => {
    const targets = playerIds?.length
      ? new Set(playerIds)
      : new Set(
          players
            .filter((player) => player.club_id === context.clubId && player.squad_status === "pro")
            .map((player) => player.id),
        );
    players = players.map((player) => {
      if (!targets.has(player.id)) return player;
      return {
        ...player,
        state: {
          ...player.state,
          morale: Math.min(100, Math.max(0, player.state.morale + delta)),
        },
      };
    });
  };

  switch (beatId) {
    case "board_survival_intro":
      if (choiceId === "ambitious") {
        adjustPressure(5);
        adjustHype(4);
        adjustSquadMorale(2);
      } else {
        adjustPressure(-2);
      }
      break;
    case "press_hostile_bad_week":
      if (choiceId === "deflect") {
        adjustPressure(-3);
        adjustHype(2);
        adjustSquadMorale(3);
      } else if (choiceId === "attack_press") {
        adjustPressure(6);
        adjustHype(-4);
        adjustFanbase(0.4);
      } else {
        adjustPressure(4);
        adjustHype(-2);
        adjustSquadMorale(-2);
      }
      break;
    case "press_ally_support":
      if (choiceId === "embrace") {
        adjustHype(8);
        adjustFanbase(0.6);
        adjustPressure(-2);
      } else {
        adjustHype(2);
      }
      break;
    case "assistant_low_morale":
      if (choiceId === "rally") {
        adjustSquadMorale(5);
        adjustPressure(-1);
      } else {
        adjustSquadMorale(3);
      }
      break;
    case "captain_speak": {
      const captainId = story.cast.captain_player_id;
      if (choiceId === "back_players") {
        adjustSquadMorale(4, captainId ? [captainId, ...captainMoraleNeighbors(players, captainId, context.clubId)] : undefined);
      } else {
        adjustSquadMorale(2, captainId ? [captainId] : undefined);
        adjustPressure(3);
      }
      break;
    }
    case "sell_star_press":
      if (choiceId === "project") {
        adjustHype(3);
        adjustFanbase(0.3);
      } else {
        adjustPressure(-2);
        adjustHype(-3);
      }
      break;
    case "arc_climax_week30":
      adjustSquadMorale(3);
      adjustPressure(5);
      break;
    case "derby_week":
      if (choiceId === "embrace") {
        adjustSquadMorale(2);
        adjustHype(4);
      } else {
        adjustPressure(-2);
      }
      break;
    default:
      break;
  }

  return { story: nextStory, board, stadium, players };
}

export function applyFanFeedBeat(
  story: StoryState,
  beat: FanFeedBeat,
  fanbaseDelta = 0,
  stadium?: ClubStadium,
  calendar?: { season: number; week: number },
): { story: StoryState; stadium?: ClubStadium } {
  let nextStory = appendFanFeed(story, beat);
  let nextStadium = stadium;
  if (nextStadium && fanbaseDelta !== 0) {
    nextStadium = advanceClubFanbase(nextStadium, fanbaseDelta);
  }
  if (nextStadium && calendar) {
    const now = careerWeekIndex(calendar.season, calendar.week);
    if (beat.id === "hospitality_engagement") {
      nextStadium = {
        ...nextStadium,
        restaurant_viral_until_week: now + RESTAURANT_VIRAL_WEEKS,
      };
    }
    if (beat.id === "hospitality_overtime") {
      nextStadium = {
        ...nextStadium,
        restaurant_overtime_week: now + 1,
      };
    }
    if (beat.id.startsWith("hospitality_wedding_s")) {
      nextStadium = applyRestaurantWeddingRepeat(nextStadium, calendar.season, calendar.week);
    }
  }
  return { story: nextStory, stadium: nextStadium };
}

export function applyChronicleEntry(story: StoryState, entry: ChronicleEntry): StoryState {
  return appendChronicle(story, entry);
}
