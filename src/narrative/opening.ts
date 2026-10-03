import type { BoardState } from "../board/board-state.ts";
import type { GameSession } from "../persistence/game-session.ts";
import { startBoardSeason } from "../board/season-objectives.ts";
import { generateStoryCast } from "./cast.ts";
import { applyChronicleEntry } from "./apply.ts";
import {
  defaultStoryState,
  type CareerOrigin,
  type ChronicleEntry,
  type StoryState,
} from "./story-state.ts";
import {
  originChronicleTitle,
  originOpeningBody,
  captainPickBody,
  storyInboxPayload,
} from "./render.ts";
import { applySurvivalObjectivesToBoard } from "./season-objectives.ts";
import { enqueueStoryInboxItem } from "../youth/decision-inbox.ts";
import { markBeatFired } from "./story-state.ts";

export const MANAGER_NAME_MIN = 2;
export const MANAGER_NAME_MAX = 24;

/** Bootstrap/test fallback — never prefill this in the onboarding field. */
export const PLACEHOLDER_MANAGER_NAMES = new Set(["Jan", "Trainer"]);

export function normalizeManagerName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, MANAGER_NAME_MAX);
}

export function isManagerNameReady(raw: string): boolean {
  return normalizeManagerName(raw).length >= MANAGER_NAME_MIN;
}

export function initializeStoryForNewGame(
  masterSeed: number,
  managerName: string,
  week = 1,
): StoryState {
  const cast = generateStoryCast(masterSeed);
  return {
    ...defaultStoryState(week),
    cast,
    fan_feed: [
      {
        id: "opening_ambient",
        week,
        icon: "🏟️",
        speaker: cast.fan_rep_label,
        message: "Niemand wollte den Job — und jetzt steht der Verein wieder im Fokus.",
      },
    ],
  };
}

export function boardWithSurvivalArc(board: BoardState, season: number): BoardState {
  const started = startBoardSeason(board, board.employer_club_id, season);
  return {
    ...started,
    objectives: applySurvivalObjectivesToBoard(started.objectives, season, board.employer_club_id),
  };
}

export function completeOpening(
  session: GameSession,
  origin: CareerOrigin,
  captainPlayerId: string,
  managerName = session.managerName,
): GameSession {
  const name = isManagerNameReady(managerName)
    ? normalizeManagerName(managerName)
    : session.managerName;
  const captain = session.players.find((player) => player.id === captainPlayerId);
  let story: StoryState = {
    ...session.storyState,
    career_origin: origin,
    opening_complete: true,
    cast: {
      ...session.storyState.cast,
      captain_player_id: captainPlayerId,
    },
  };

  const originEntry: ChronicleEntry = {
    id: `chronicle_origin_${session.season}`,
    season: session.season,
    week: session.week,
    icon: origin === "raffle" ? "🎟️" : origin === "passionate_letter" ? "✉️" : "🏘️",
    title: originChronicleTitle(origin),
    body: originOpeningBody(origin, name),
  };
  story = applyChronicleEntry(story, originEntry);

  if (captain) {
    story = applyChronicleEntry(story, {
      id: `chronicle_captain_${session.season}`,
      season: session.season,
      week: session.week,
      icon: "©️",
      title: "Kapitän gewählt",
      body: captainPickBody(captain),
    });
  }

  const board = boardWithSurvivalArc(session.board, session.season);
  story = markBeatFired(story, "board_survival_intro");
  const youthInbox = enqueueStoryInboxItem(
    session.youthInbox,
    session.week,
    storyInboxPayload("board_survival_intro", story.cast),
    "board_survival_intro",
  );

  const players = session.players.map((player) => {
    if (player.id !== captainPlayerId) return player;
    return {
      ...player,
      state: {
        ...player.state,
        morale: Math.min(100, player.state.morale + 4),
      },
    };
  });

  return {
    ...session,
    managerName: name,
    storyState: story,
    board,
    players,
    youthInbox,
  };
}

export function openingBlocked(session: GameSession): boolean {
  return session.storyState.active_arc === "relegation_battle" && !session.storyState.opening_complete;
}
