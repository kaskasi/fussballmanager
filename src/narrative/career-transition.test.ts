import { NORDSTERN_ID } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import { newGameSession, type GameSession } from "../persistence/game-session.ts";
import { defaultLeaguePools } from "../sim/league-divisions.ts";
import { leagueStateAfterMovement } from "../sim/promotion-relegation.ts";
import { isCareerTransitionPending, resolveCareerActSeasonEnd } from "./career-acts.ts";
import { resolveFeatureCurtain } from "./career-presentation.ts";
import { acceptStoryEmployerOffer, storyFollowerNames } from "./career-transition.ts";

function act1Ended(): GameSession {
  const session = newGameSession(new Date("2026-08-01T12:00:00Z"), { mode: "story_mode" });
  const base = defaultLeaguePools();
  const promoted = base["oberliga-nord"][0]!;
  const pools = {
    ...base,
    "regionalliga-nord": [...base["regionalliga-nord"].filter((id) => id !== NORDSTERN_ID), promoted],
    "oberliga-nord": [NORDSTERN_ID, ...base["oberliga-nord"].slice(1)],
  };
  const storyState = resolveCareerActSeasonEnd({
    story: session.storyState,
    league: session.league,
    promotionRelegation: {
      pools,
      movements: [{ teamId: NORDSTERN_ID, from: "regionalliga-nord", to: "oberliga-nord", reason: "relegated" }],
    },
    players: session.players,
    rivalPlayers: session.rivalPlayers,
    careerClubId: session.clubId,
    endingSeason: 1,
    nextSeason: 2,
    week: 34,
  })!;
  return {
    ...session,
    season: 2,
    storyState,
    league: leagueStateAfterMovement(session.league, pools, NORDSTERN_ID),
  };
}

describe("acceptStoryEmployerOffer (PRD 19 Act 1 → 2)", () => {
  const ended = act1Ended();
  const transition = ended.storyState.act_transition!;
  const offerId = transition.offer_team_ids[0]!;
  const followers = ended.players.filter((player) => transition.companion_ids.includes(player.id));
  const next = acceptStoryEmployerOffer(ended, offerId);

  it("moves the manager to the chosen Oberliga club", () => {
    expect(next.league.player_club_id).toBe(offerId);
    expect(next.league.division_id).toBe("oberliga-nord");
    expect(next.board.employer_club_id).toBe(offerId);
    expect(next.board.job_status).toBe("employed");
  });

  it("brings the followers along — youths keep their status", () => {
    expect(followers.length).toBeGreaterThan(0);
    for (const follower of followers) {
      const moved = next.players.find((player) => player.id === follower.id);
      expect(moved?.club_id).toBe(next.clubId);
      if (follower.squad_status !== "pro") expect(moved?.squad_status).toBe(follower.squad_status);
      expect(next.rivalPlayers.some((player) => player.id === follower.id)).toBe(false);
    }
    expect(next.storyState.legend_players.filter((ref) => ref.followed)).toHaveLength(followers.length);
  });

  it("opens Act 2 with only the tactics unlock and a patient chairman", () => {
    const story = next.storyState;
    expect(story.career_phase).toBe("act2_regional");
    expect(story.act_started).toEqual({ phase: "act2_regional", season: next.season, week: next.week });
    expect(story.active_arc).toBe("promotion_push");
    expect(story.curtain_unlocks).toEqual(["tactics_sliders"]);
    const curtain = resolveFeatureCurtain(story);
    expect(curtain.tactics_sliders).toBe(true);
    expect(curtain.scouting_nav).toBe(false);
    expect(curtain.auto_training).toBe(true);
    expect(story.cast.chairman_name).toBeTruthy();
    expect(story.cast.captain_player_id).toBeNull();
    const place = next.board.objectives.find((objective) => objective.id === "league_place");
    expect(place?.target).toBe(9);
    expect(place?.mandatory).toBe(true);
    expect(next.board.objectives.filter((objective) => objective.mandatory)).toHaveLength(1);
    expect(isCareerTransitionPending(story)).toBe(false);
  });

  it("chronicles the new club and names the followers", () => {
    const entry = next.storyState.chronicle_entries.find((item) => item.id.startsWith("chronicle_act2_start_"));
    expect(entry).toBeTruthy();
    for (const name of storyFollowerNames(ended)) expect(entry!.body).toContain(name);
    expect(next.storyState.chronicle_entries.some((item) => item.id === "chronicle_unlock_tactics_sliders")).toBe(true);
  });

  it("ignores a club that wasn't offered", () => {
    const notOffered = ended.league.club_ids.find((id) => !transition.offer_team_ids.includes(id))!;
    expect(acceptStoryEmployerOffer(ended, notOffered)).toBe(ended);
  });
});
