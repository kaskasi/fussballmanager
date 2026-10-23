/** Story Mode helpers for the headless career playtest (PRD 24, ADR 0005). */

import { isCareerActBeat } from "../narrative/career-act2.ts";
import type { StoryState } from "../narrative/story-state.ts";
import { resolveStoryInboxDecision } from "../narrative/pipeline-week.ts";
import type { GameSession } from "../persistence/game-session.ts";
import type { CareerPlaytestAnomaly, CareerPlaytestWeek } from "./career-playtest.ts";

/** Answer every Act 2 unlock beat with its first choice — what a player does when NEXT blocks. */
export function autoResolveCareerActBeats(session: GameSession): GameSession {
  let next = session;
  const pending = [...session.youthInbox.items, ...session.youthInbox.queue].filter(
    (item) => item.narrative && isCareerActBeat(item.narrative.beatId),
  );
  for (const item of pending) {
    const choiceId = item.narrative!.choices[0]?.id;
    if (!choiceId) continue;
    next = {
      ...next,
      youthInbox: {
        ...next.youthInbox,
        items: next.youthInbox.items.filter((entry) => entry.id !== item.id),
        queue: next.youthInbox.queue.filter((entry) => entry.id !== item.id),
        resolvedIds: [...next.youthInbox.resolvedIds, item.id],
      },
    };
    next = resolveStoryInboxDecision(next, item, choiceId);
  }
  return next;
}

export function detectStoryAnomalies(input: {
  weeks: readonly CareerPlaytestWeek[];
  story: StoryState;
  seasons: number;
}): CareerPlaytestAnomaly[] {
  const anomalies: CareerPlaytestAnomaly[] = [];
  const act1Sacked = input.weeks.find(
    (row) => row.phase === "act1_nordstern" && row.jobStatus === "dismissed",
  );
  if (act1Sacked) {
    anomalies.push({
      id: "story_act1_dismissal",
      severity: "high",
      message: `Manager dismissed in Act 1 (season ${act1Sacked.season}, week ${act1Sacked.week}).`,
    });
  }
  if (input.seasons > 1 && input.story.career_phase === "act1_nordstern") {
    anomalies.push({
      id: "story_no_transition",
      severity: "high",
      message: "Story Mode never left Act 1 after the first season end.",
    });
  }
  const chronicled = new Set(input.story.chronicle_entries.map((entry) => entry.id));
  const silent = input.story.curtain_unlocks.filter((id) => !chronicled.has(`chronicle_unlock_${id}`));
  if (silent.length > 0) {
    anomalies.push({
      id: "story_unlock_without_chronicle",
      severity: "high",
      message: `Curtain unlocks without a chronicle line: ${silent.join(", ")}.`,
    });
  }
  return anomalies;
}
