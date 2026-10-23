import { NORDSTERN_ID, asTeamId } from "@fussballmanager/shared";
import { describe, expect, it } from "vitest";
import type { BoardState, SeasonObjectiveEvaluation } from "../board/board-state.ts";
import type { InSeasonPressureStep } from "../board/season-objectives.ts";
import { newGameSession, type GameSession } from "../persistence/game-session.ts";
import { defaultLeaguePools } from "../sim/league-divisions.ts";
import type { PromotionRelegationResult } from "../sim/promotion-relegation.ts";
import { fullFeatureCurtain, resolveFeatureCurtain, resolvePresentationMode } from "./career-presentation.ts";
import {
  act1OutcomeFromMovements,
  careerActBoardObjectives,
  careerDismissalPolicy,
  guardInSeasonDismissal,
  guardSeasonEndEvaluation,
  isCareerTransitionPending,
  resolveCareerActSeasonEnd,
} from "./career-acts.ts";
import { normalizeStoryState, type StoryState } from "./story-state.ts";

const NOW = new Date("2026-08-01T12:00:00Z");
const story = newGameSession(NOW, { mode: "story_mode" });
const regionalliga = newGameSession(NOW, { mode: "regionalliga_manager" });
const OBER_TEAM = asTeamId("ober-champion");

function relegatedPools() {
  const pools = defaultLeaguePools();
  const promoted = pools["oberliga-nord"][0]!;
  return {
    "regionalliga-nord": [...pools["regionalliga-nord"].filter((id) => id !== NORDSTERN_ID), promoted],
    "oberliga-nord": [NORDSTERN_ID, ...pools["oberliga-nord"].slice(1)],
  };
}

function seasonEnd(session: GameSession, pr: Pick<PromotionRelegationResult, "pools" | "movements" | "playoff">) {
  return resolveCareerActSeasonEnd({
    story: session.storyState,
    league: session.league,
    promotionRelegation: pr,
    players: session.players,
    rivalPlayers: session.rivalPlayers,
    careerClubId: session.clubId,
    endingSeason: 1,
    nextSeason: 2,
    week: 34,
  });
}

const pressureStep = (board: BoardState): InSeasonPressureStep => ({
  board: { ...board, job_status: "dismissed" },
  warning: false,
  dismissed: true,
  place: 18,
  placeTarget: 16,
  matchdaysPlayed: 20,
});

const evaluationStep = (board: BoardState) => {
  const evaluation: SeasonObjectiveEvaluation = {
    season: 1,
    metIds: [],
    failedIds: ["league_place"],
    bonusPaid: 0,
    dismissed: true,
    summary: "Vorstand entlässt dich",
  };
  return { board: { ...board, job_status: "dismissed" as const }, evaluation };
};

describe("act 1 outcome from sim movements (PRD 19 — no forced loss)", () => {
  it("direct relegation and a lost playoff both relegate", () => {
    expect(
      act1OutcomeFromMovements(NORDSTERN_ID, {
        movements: [{ teamId: NORDSTERN_ID, from: "regionalliga-nord", to: "oberliga-nord", reason: "relegated" }],
      }),
    ).toEqual({ outcome: "relegated", viaPlayoff: false });
    expect(
      act1OutcomeFromMovements(NORDSTERN_ID, {
        movements: [{ teamId: NORDSTERN_ID, from: "regionalliga-nord", to: "oberliga-nord", reason: "playoff_lost" }],
      }),
    ).toEqual({ outcome: "relegated", viaPlayoff: true });
  });

  it("no movement is survival; a won playoff is flagged", () => {
    expect(act1OutcomeFromMovements(NORDSTERN_ID, { movements: [] })).toEqual({
      outcome: "survived",
      viaPlayoff: false,
    });
    expect(
      act1OutcomeFromMovements(NORDSTERN_ID, {
        movements: [],
        playoff: { homeTeamId: NORDSTERN_ID, awayTeamId: OBER_TEAM, homeGoals: 2, awayGoals: 1, winnerId: NORDSTERN_ID },
      }),
    ).toEqual({ outcome: "survived", viaPlayoff: true });
  });
});

describe("Act 1 season end transition", () => {
  it("freezes 3 Oberliga offers without the old club, up to 2 followers and legends", () => {
    const pools = relegatedPools();
    const next = seasonEnd(story, {
      pools,
      movements: [{ teamId: NORDSTERN_ID, from: "regionalliga-nord", to: "oberliga-nord", reason: "relegated" }],
    })!;
    const transition = next.act_transition!;
    expect(transition.outcome).toBe("relegated");
    expect(transition.offer_team_ids).toHaveLength(3);
    expect(transition.offer_team_ids).not.toContain(NORDSTERN_ID);
    expect(transition.offer_team_ids.every((id) => pools["oberliga-nord"].includes(id))).toBe(true);
    expect(transition.companion_ids.length).toBeGreaterThan(0);
    expect(transition.companion_ids.length).toBeLessThanOrEqual(2);
    expect(next.legend_players.map((ref) => ref.player_id)).toEqual(
      expect.arrayContaining(transition.companion_ids),
    );
    expect(next.chronicle_entries[0]?.id).toBe("chronicle_act1_end_1");
    expect(next.chronicle_entries[0]?.body).toContain(next.legend_players[0]!.name);
    expect(next.active_arc).toBeNull();
    expect(isCareerTransitionPending(next)).toBe(true);
  });

  it("survival still ends Act 1 with Oberliga offers", () => {
    const next = seasonEnd(story, { pools: defaultLeaguePools(), movements: [] })!;
    expect(next.act_transition?.outcome).toBe("survived");
    expect(next.act_transition?.offer_team_ids).toHaveLength(3);
    expect(
      next.act_transition?.offer_team_ids.every((id) => defaultLeaguePools()["oberliga-nord"].includes(id)),
    ).toBe(true);
  });

  it("survives a save round-trip through normalizeStoryState", () => {
    const next = seasonEnd(story, { pools: defaultLeaguePools(), movements: [] })!;
    expect(normalizeStoryState(next).act_transition).toEqual(next.act_transition);
  });

  it("does nothing for Regionalliga Manager (regular coda runs)", () => {
    expect(seasonEnd(regionalliga, { pools: defaultLeaguePools(), movements: [] })).toBeNull();
  });
});

describe("dismissal guards", () => {
  const act2: StoryState = { ...story.storyState, career_phase: "act2_regional" };

  it("Act 1 is never dismissed, mid-season or at season end", () => {
    expect(careerDismissalPolicy(story.storyState)).toBe("none");
    const inSeason = guardInSeasonDismissal(pressureStep(story.board), story.storyState);
    expect(inSeason.dismissed).toBe(false);
    expect(inSeason.board.job_status).toBe("employed");
    const end = guardSeasonEndEvaluation(evaluationStep(story.board), story.storyState);
    expect(end.evaluation.dismissed).toBe(false);
    expect(end.board.job_status).toBe("employed");
  });

  it("Act 2 suppresses only the mid-season sacking", () => {
    expect(guardInSeasonDismissal(pressureStep(story.board), act2).dismissed).toBe(false);
    expect(guardSeasonEndEvaluation(evaluationStep(story.board), act2).evaluation.dismissed).toBe(true);
  });

  it("Regionalliga Manager keeps the standard rules", () => {
    const state = regionalliga.storyState;
    expect(careerDismissalPolicy(state)).toBe("standard");
    expect(guardInSeasonDismissal(pressureStep(regionalliga.board), state).dismissed).toBe(true);
    expect(guardSeasonEndEvaluation(evaluationStep(regionalliga.board), state).evaluation.dismissed).toBe(true);
  });
});

describe("Act 2 season end (PRD 19 — promotion opens Act 3)", () => {
  const act2Story: StoryState = {
    ...story.storyState,
    career_phase: "act2_regional",
    active_arc: "promotion_push",
    act_started: { phase: "act2_regional", season: 2, week: 1 },
    curtain_unlocks: ["tactics_sliders", "stadium"],
    legend_players: [
      { player_id: "pl_1", name: "Jonas Petersen", position: "ST", from_team_id: NORDSTERN_ID, followed: true },
    ],
  };
  const act2Session = { ...story, storyState: act2Story };

  for (const reason of ["promoted", "playoff_won"] as const) {
    it(`${reason} into the Regionalliga opens Act 3 with the full curtain`, () => {
      const next = seasonEnd(act2Session, {
        pools: defaultLeaguePools(),
        movements: [{ teamId: NORDSTERN_ID, from: "oberliga-nord", to: "regionalliga-nord", reason }],
      })!;
      expect(next.career_phase).toBe("act3_empire");
      expect(resolveFeatureCurtain(next)).toEqual(fullFeatureCurtain());
      expect(resolvePresentationMode(next)).toBe("manager_desk");
      expect(next.chronicle_entries[0]?.body).toContain("Jonas Petersen");
      expect(careerDismissalPolicy(next)).toBe("standard");
    });
  }

  it("without promotion Act 2 continues under the patient chairman", () => {
    const next = seasonEnd(act2Session, { pools: defaultLeaguePools(), movements: [] })!;
    expect(next.career_phase).toBe("act2_regional");
    expect(next.curtain_unlocks).toEqual(act2Story.curtain_unlocks);
    const objectives = careerActBoardObjectives(story.board.objectives, next, 3);
    expect(objectives.filter((objective) => objective.mandatory).map((objective) => objective.id)).toEqual([
      "league_place",
    ]);
  });

  it("leaves Regionalliga Manager objectives untouched", () => {
    expect(careerActBoardObjectives(regionalliga.board.objectives, regionalliga.storyState, 2)).toEqual(
      regionalliga.board.objectives,
    );
  });
});
