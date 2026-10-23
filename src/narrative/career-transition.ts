/** Story Mode Act 1 → Act 2 employer switch (PRD 19 §Employer transition, ADR 0005). */

import type { TeamId } from "@fussballmanager/shared";
import { acceptJobOffer } from "../board/accept-job-offer.ts";
import { movePlayerToClub } from "../board/companion-pick.ts";
import { jobOfferForTeam } from "../board/job-offers.ts";
import { t } from "../i18n/index.ts";
import type { GameSession } from "../persistence/game-session.ts";
import { clubShortName } from "../sim/league-week.ts";
import { formatPlayerName } from "../types/player-display.ts";
import { applyChronicleEntry } from "./apply.ts";
import { act1AssistantTrainingPlan } from "./career-presentation.ts";
import { generateChairmanName } from "./cast.ts";
import { applyPatientChairmanObjectives } from "./season-objectives.ts";
import { grantStoryUnlock } from "./career-act2.ts";
import type { StoryState } from "./story-state.ts";

/** Act 2 opens with the first unlock: presets and sliders on the lineup screen. */
function openAct2(story: StoryState, session: GameSession, teamId: TeamId): StoryState {
  const club = clubShortName(teamId);
  const chairman = generateChairmanName(session.masterSeed, teamId);
  const followerIds = new Set(story.act_transition?.companion_ids ?? []);
  const followers = story.legend_players.filter((ref) => followerIds.has(ref.player_id));
  const names = followers.map((ref) => ref.name).join(", ");
  let next: StoryState = {
    ...story,
    career_phase: "act2_regional",
    act_started: { phase: "act2_regional", season: session.season, week: session.week },
    active_arc: "promotion_push",
    arc_started_week: session.week,
    act_transition: null,
    cast: { ...story.cast, chairman_name: chairman, captain_player_id: null },
    legend_players: story.legend_players.map((ref) =>
      followerIds.has(ref.player_id) ? { ...ref, followed: true } : ref,
    ),
  };
  next = applyChronicleEntry(next, {
    id: `chronicle_act2_start_${session.season}`,
    season: session.season,
    week: session.week,
    icon: "🤝",
    title: t("story.act2Start.title", { club }),
    body: names
      ? t("story.act2Start.bodyWithFollowers", { club, chairman, names })
      : t("story.act2Start.body", { club, chairman }),
  });
  return grantStoryUnlock(next, "tactics_sliders", session.season, session.week);
}

/**
 * Accept one of the frozen Act 1 offers: switch club, bring the followers along, start Act 2
 * under a patient chairman. Returns the session unchanged for an offer that wasn't made.
 */
export function acceptStoryEmployerOffer(session: GameSession, teamId: TeamId): GameSession {
  const transition = session.storyState.act_transition;
  if (!transition || !transition.offer_team_ids.includes(teamId)) return session;

  // switchManagerClub regenerates the youth squad — capture followers first.
  const followerIds = new Set(transition.companion_ids);
  const followers = session.players.filter((player) => followerIds.has(player.id));
  const offer = jobOfferForTeam(teamId, session.season, session.league);
  let next = acceptJobOffer(session, teamId, { companions: "none", offer });
  for (const follower of followers) {
    next = movePlayerToClub(next, follower);
  }
  return {
    ...next,
    board: {
      ...next.board,
      objectives: applyPatientChairmanObjectives(next.board.objectives, next.season),
    },
    trainingPlan: act1AssistantTrainingPlan(),
    trainingCalendarGateDone: true,
    storyState: openAct2(next.storyState, next, teamId),
  };
}

/** Display names of the frozen followers, for the transition modal. */
export function storyFollowerNames(session: GameSession): string[] {
  const ids = new Set(session.storyState.act_transition?.companion_ids ?? []);
  return session.players.filter((player) => ids.has(player.id)).map(formatPlayerName);
}
