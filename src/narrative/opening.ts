import type { BoardState } from "../board/board-state.ts";
import type { GameSession } from "../persistence/game-session.ts";
import { defaultLeagueState } from "../persistence/league-state.ts";
import { startBoardSeason } from "../board/season-objectives.ts";
import { generateStoryCast } from "./cast.ts";
import { applyChronicleEntry } from "./apply.ts";
import { act1AssistantTrainingPlan } from "./career-presentation.ts";
import { STORY_MODE_PICKER_ENABLED, type ProductGameMode } from "./game-mode.ts";
import {
  regionalligaManagerStoryState,
  storyModeAct1StoryState,
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
  mode: ProductGameMode = "regionalliga_manager",
): StoryState {
  const cast = generateStoryCast(masterSeed);
  const base =
    mode === "story_mode" ? storyModeAct1StoryState(week) : regionalligaManagerStoryState(week);
  return {
    ...base,
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
  const started = startBoardSeason(
    board,
    board.employer_club_id,
    season,
    defaultLeagueState(),
  );
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

  // Survival framing only for the relegation story; picked stronger clubs keep their tier goals.
  const survivalArc = story.active_arc === "relegation_battle";
  const board = survivalArc ? boardWithSurvivalArc(session.board, session.season) : session.board;
  if (survivalArc) story = markBeatFired(story, "board_survival_intro");
  const youthInbox = survivalArc
    ? enqueueStoryInboxItem(
        session.youthInbox,
        session.week,
        storyInboxPayload("board_survival_intro", story.cast),
        "board_survival_intro",
      )
    : session.youthInbox;

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

/** PRD 24 — fresh save waits for the mode card (saves without the field count as confirmed). */
export function modePickPending(
  session: Pick<GameSession, "storyState">,
  pickerEnabled = STORY_MODE_PICKER_ENABLED,
): boolean {
  return (
    pickerEnabled &&
    !session.storyState.opening_complete &&
    session.storyState.game_mode_confirmed === false
  );
}

/** PRD 24 — apply the mode card choice to a fresh save before the opening runs. */
export function chooseNewCareerMode(session: GameSession, mode: ProductGameMode): GameSession {
  const story = session.storyState;
  if (mode !== "story_mode") {
    return { ...session, storyState: { ...story, game_mode_confirmed: true } };
  }
  return {
    ...session,
    storyState: {
      ...storyModeAct1StoryState(session.week),
      cast: story.cast,
      fan_feed: story.fan_feed,
      tutorial: story.tutorial,
      game_mode_confirmed: true,
    },
    trainingPlan: act1AssistantTrainingPlan(),
    trainingCalendarGateDone: true,
  };
}

export function openingBlocked(session: GameSession): boolean {
  return !session.storyState.opening_complete;
}
