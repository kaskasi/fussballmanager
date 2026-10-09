import type { FixtureResult } from "@fussballmanager/shared";
import type { GameSession } from "../persistence/game-session.ts";
import {
  enqueueStoryInboxItem,
  isStoryInboxKind,
  type DecisionInboxItem,
  type YouthInboxState,
} from "../youth/decision-inbox.ts";
import { applyFanFeedBeat, applyStoryChoice } from "./apply.ts";
import { detectWeeklyBeats } from "./detect.ts";
import { fanFeedMessage, storyInboxPayload } from "./render.ts";
import {
  markBeatFired,
  type FanFeedBeat,
  type StoryInboxPayload,
  type StoryState,
} from "./story-state.ts";

function fanTemplateId(beatId: string): string {
  if (beatId.startsWith("fan_home_win_")) return "fan_home_win";
  if (beatId.startsWith("fan_derby_loss_")) return "fan_derby_loss";
  if (beatId.startsWith("fan_table_worry_") || beatId.startsWith("fan_ambient_")) {
    return "fan_ambient";
  }
  if (beatId.startsWith("hospitality_wedding_s")) return beatId;
  return beatId.replace(/_s\d+$/, "");
}

export interface NarrativeWeekResult {
  storyState: StoryState;
  youthInbox: YouthInboxState;
  board: GameSession["board"];
  stadium: GameSession["stadium"];
  players: GameSession["players"];
}

export function advanceNarrativeWeek(
  session: GameSession,
  playerFixture: FixtureResult | null,
  recentSale = false,
): NarrativeWeekResult {
  let story = session.storyState;
  let inbox = session.youthInbox;
  let board = session.board;
  let stadium = session.stadium;
  let players = session.players;

  const detected = detectWeeklyBeats({
    story,
    league: session.league,
    board,
    stadium,
    players,
    clubId: session.clubId,
    season: session.season,
    week: session.week,
    masterSeed: session.masterSeed,
    world: session.world,
    playerFixture,
    recentSale,
  });

  for (const beat of detected) {
    if (beat.kind === "fan_feed") {
      const id = beat.beatId;
      if (story.beats_fired.includes(id)) continue;
      const rendered = fanFeedMessage(fanTemplateId(id), story.cast, {
        opponent: beat.context?.opponent as string | undefined,
        streak: beat.context?.streak as number | undefined,
      });
      const feedBeat: FanFeedBeat = {
        id,
        week: session.week,
        icon: rendered.icon,
        speaker: rendered.speaker,
        message: rendered.message,
      };
      const applied = applyFanFeedBeat(story, feedBeat, beat.fanbaseDelta ?? 0, stadium, {
        season: session.season,
        week: session.week,
      });
      story = markBeatFired(applied.story, id);
      if (applied.stadium) stadium = applied.stadium;
      continue;
    }

    if (story.beats_fired.includes(beat.beatId)) continue;
    const payload = storyInboxPayload(beat.beatId, story.cast, beat.context ?? {});
    inbox = enqueueStoryInboxItem(inbox, session.week, payload, beat.beatId);
    story = markBeatFired(story, beat.beatId);
  }

  return { storyState: story, youthInbox: inbox, board, stadium, players };
}

export function resolveStoryInboxDecision(
  session: GameSession,
  item: DecisionInboxItem,
  choiceId: string,
): GameSession {
  if (!item.narrative || !isStoryInboxKind(item.kind)) return session;
  const applied = applyStoryChoice(session.storyState, item.narrative.beatId, choiceId, {
    board: session.board,
    stadium: session.stadium,
    players: session.players,
    clubId: session.clubId,
    season: session.season,
    week: session.week,
  });
  return {
    ...session,
    storyState: applied.story,
    board: applied.board ?? session.board,
    stadium: applied.stadium ?? session.stadium,
    players: applied.players ?? session.players,
  };
}

export function storyPayloadFromItem(item: DecisionInboxItem): StoryInboxPayload | null {
  return item.narrative ?? null;
}
