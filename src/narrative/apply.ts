import type { BoardState } from "../board/board-state.ts";
import { normalizeClubStadium, type ClubStadium } from "../stadium/club-stadium.ts";
import { applyRestaurantWeddingRepeat } from "../stadium/precinct-campus-events.ts";
import { careerWeekIndex, RESTAURANT_VIRAL_WEEKS } from "../stadium/hospitality.ts";
import { advanceClubFanbase } from "../stadium/fanbase.ts";
import type { Player } from "../types/player.ts";
import { spendClubCash, type ClubFinances } from "../economy/club-finances.ts";
import { careerWeekIndex as weekIndexOf } from "../stadium/hospitality.ts";
import { clampPressRelationship, normalizePressState } from "../press/press-state.ts";
import { applyCareerActChoice, isCareerActBeat } from "./career-act2.ts";
import { captainMoraleNeighbors } from "./captain.ts";
import {
  appendChronicle,
  appendFanFeed,
  clampMediaHype,
  markBeatFired,
  storyBeatTemplateId,
  type ChronicleEntry,
  type FanFeedBeat,
  type StoryState,
} from "./story-state.ts";

/** PRD 28 crisis costs (cash stays on the PRD 13 allow-list). */
export const MORALE_CRISIS_TRIP_COST = 60_000;
export const PRESS_EDITOR_MEETING_COST = 15_000;
export const PRESS_MEDIA_TRAINING_COST = 40_000;

export interface StoryEffectResult {
  story: StoryState;
  board?: BoardState;
  stadium?: ClubStadium;
  players?: Player[];
  finances?: ClubFinances;
}

export function applyStoryChoice(
  story: StoryState,
  beatId: string,
  choiceId: string,
  context: {
    board: BoardState;
    stadium: ClubStadium;
    players: Player[];
    finances?: ClubFinances;
    clubId: string;
    season: number;
    week: number;
    /** PRD 28 — crisis proposals scale with the assistant's skill. */
    assistantQuality?: number;
  },
): StoryEffectResult {
  if (isCareerActBeat(beatId)) return applyCareerActChoice(story, beatId, choiceId, context);
  let nextStory = markBeatFired(story, beatId);
  let board = { ...context.board };
  let stadium = context.stadium;
  let players = [...context.players];
  let finances = context.finances;

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

  const adjustRelationship = (delta: number) => {
    const press = normalizePressState(nextStory.press);
    nextStory = {
      ...nextStory,
      press: { ...press, relationship: clampPressRelationship(press.relationship + delta) },
    };
  };
  const spend = (amount: number) => {
    if (finances) finances = spendClubCash(finances, amount, context.week, "other");
  };
  const squadPros = () =>
    players.filter((player) => player.club_id === context.clubId && player.squad_status === "pro");
  const quality = context.assistantQuality ?? 55;

  switch (storyBeatTemplateId(beatId)) {
    case "morale_crisis_council":
      if (choiceId === "concede") {
        adjustSquadMorale(8);
        adjustPressure(4);
      } else if (choiceId === "stand_firm") {
        adjustSquadMorale(-3);
        adjustPressure(-2);
      } else {
        // The worst-form senior player carries the blame; the rest close ranks.
        const scapegoat = [...squadPros()].sort(
          (left, right) => left.state.form - right.state.form || right.market_value - left.market_value,
        )[0];
        adjustSquadMorale(6);
        if (scapegoat) {
          adjustSquadMorale(-26, [scapegoat.id]);
          players = players.map((player) =>
            player.id === scapegoat.id
              ? { ...player, state: { ...player.state, desire_to_leave: true } }
              : player,
          );
        }
      }
      break;
    case "morale_crisis_assistant":
      if (choiceId === "bonding_trip") {
        spend(MORALE_CRISIS_TRIP_COST);
        adjustSquadMorale(Math.min(12, Math.max(3, 6 + Math.round((quality - 50) / 6))));
      } else {
        adjustSquadMorale(Math.min(6, Math.max(1, 3 + Math.round((quality - 50) / 10))));
      }
      break;
    case "morale_crisis_leak":
      adjustRelationship(choiceId === "statement" ? 2 : -3);
      break;
    case "morale_crisis_requests": {
      const leaving = squadPros()
        .filter((player) => player.state.desire_to_leave)
        .map((player) => player.id);
      if (choiceId === "talk") {
        adjustSquadMorale(6, leaving);
        const calmed = new Set(leaving);
        players = players.map((player) =>
          calmed.has(player.id) ? { ...player, state: { ...player.state, desire_to_leave: false } } : player,
        );
      } else if (leaving.length > 0) {
        adjustSquadMorale(-4, leaving);
      }
      break;
    }
    case "press_crisis_campaign":
      if (choiceId === "editor_meeting") {
        spend(PRESS_EDITOR_MEETING_COST);
        adjustRelationship(8);
      }
      break;
    case "press_crisis_papers":
      if (choiceId === "ban_papers") {
        adjustSquadMorale(3);
        adjustRelationship(-3);
      } else {
        adjustSquadMorale(2);
      }
      break;
    case "press_crisis_ultimatum":
      if (choiceId === "apology") {
        adjustRelationship(15);
        adjustHype(-4);
        adjustSquadMorale(-2);
      } else {
        spend(PRESS_MEDIA_TRAINING_COST);
        adjustRelationship(10);
      }
      break;
    case "press_crisis_boycott":
      if (choiceId === "blackout") {
        adjustFanbase(0.4);
        adjustRelationship(-4);
        const press = normalizePressState(nextStory.press);
        const until = press.boycott_until ?? weekIndexOf(context.season, context.week);
        nextStory = { ...nextStory, press: { ...press, boycott_until: until + 2 } };
      }
      break;
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
        adjustRelationship(-1);
      } else if (choiceId === "attack_press") {
        adjustPressure(6);
        adjustHype(-4);
        adjustFanbase(0.4);
        adjustRelationship(-6);
      } else {
        adjustPressure(4);
        adjustHype(-2);
        adjustSquadMorale(-2);
        adjustRelationship(3);
      }
      break;
    case "press_ally_support":
      if (choiceId === "embrace") {
        adjustHype(8);
        adjustFanbase(0.6);
        adjustPressure(-2);
        adjustRelationship(4);
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
        adjustRelationship(1);
      } else {
        adjustPressure(-2);
        adjustHype(-3);
        adjustRelationship(2);
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
    case "empire_hotel_vs_pitch":
      if (choiceId === "expand_hotel") {
        adjustFanbase(1.4);
        adjustHype(8);
      } else if (choiceId === "expand_pitch") {
        const levels = stadium.upgrade_levels ?? {};
        if ((levels.pitch_heating ?? 0) < 1) {
          stadium = normalizeClubStadium({
            ...stadium,
            upgrade_levels: { ...levels, pitch_heating: 1 },
          });
        }
      }
      break;
    default:
      break;
  }

  return { story: nextStory, board, stadium, players, ...(finances !== context.finances ? { finances } : {}) };
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
