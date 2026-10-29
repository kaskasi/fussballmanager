import { describe, expect, it } from "vitest";
import { newGameSession, type GameSession } from "../persistence/game-session.ts";
import { prepareUpcomingCareerMatch } from "../sim/career-match-setup.ts";
import { careerWeekIndex } from "../stadium/hospitality.ts";
import {
  assistantPressTones,
  buildPressConference,
  pressAnswerEffects,
  pressConferenceEffects,
  type PressConference,
} from "./press-conference.ts";
import {
  autoPostMatchPress,
  autoResolvePress,
  pressConferenceFor,
  pressFixtureKey,
  pressMatchContext,
  resolvePressConference,
  sessionPressState,
} from "./press-session.ts";
import { normalizePressState, PRESS_TONES } from "./press-state.ts";
import { keyMatchTopic, pendingPressTopics, seedKnownTopicIds } from "./press-triggers.ts";

function seeded(session: GameSession): GameSession {
  const press = sessionPressState(session);
  return {
    ...session,
    storyState: {
      ...session.storyState,
      press: { ...press, known_topic_ids: seedKnownTopicIds(session) },
    },
  };
}

function proSquad(session: GameSession) {
  return session.players.filter(
    (player) => player.club_id === session.clubId && player.squad_status === "pro",
  );
}

function withBigSigning(session: GameSession): { session: GameSession; playerId: string } {
  const signing = proSquad(session)[0]!;
  const record = {
    id: `tr_${session.season}_${session.week}_in_${signing.id}`,
    season: session.season,
    week: session.week,
    kind: "in" as const,
    player_id: signing.id,
    player_name: "Signing",
    other_club_id: "cl_other",
    other_club_name: "Other FC",
    fee: 50_000_000,
  };
  return {
    session: {
      ...session,
      transferState: { ...session.transferState, history: [record, ...session.transferState.history] },
    },
    playerId: signing.id,
  };
}

function matchContext(session: GameSession) {
  const setup = prepareUpcomingCareerMatch(session);
  if (!setup) throw new Error("no upcoming match");
  return pressMatchContext(setup);
}

function avgMorale(session: GameSession): number {
  const pros = proSquad(session);
  return pros.reduce((sum, player) => sum + player.state.morale, 0) / pros.length;
}

describe("press triggers", () => {
  it("only seeds on the first scan, so assets the club already owns never trigger", () => {
    const { session } = withBigSigning(newGameSession());
    expect(pendingPressTopics(session, undefined)).toEqual([]);
    expect(pendingPressTopics(seeded(session), seeded(session).storyState.press?.known_topic_ids)).toEqual([]);
  });

  it("turns a new marquee signing into a topic", () => {
    const base = seeded(newGameSession());
    const { session, playerId } = withBigSigning(base);
    const topics = pendingPressTopics(session, sessionPressState(session).known_topic_ids);
    expect(topics).toHaveLength(1);
    expect(topics[0]).toMatchObject({ kind: "transfer_in", playerId });
  });

  it("ignores small fees and old transfers", () => {
    const base = seeded(newGameSession());
    const { session } = withBigSigning(base);
    const small = {
      ...session,
      transferState: {
        ...session.transferState,
        history: session.transferState.history.map((record, index) =>
          index === 0 ? { ...record, fee: 10_000 } : record,
        ),
      },
    };
    expect(pendingPressTopics(small, sessionPressState(small).known_topic_ids)).toEqual([]);
    const later = { ...session, week: session.week + 10 };
    expect(pendingPressTopics(later, sessionPressState(later).known_topic_ids)).toEqual([]);
  });

  it("flags a derby as a key match", () => {
    const session = newGameSession();
    const context = matchContext(session);
    const clubId = session.league.player_club_id;
    const opponentId = context.homeTeamId === clubId ? context.awayTeamId : context.homeTeamId;
    const world = {
      ...session.world,
      clubs: session.world.clubs.map((club) =>
        club.id === clubId ? { ...club, rivalry_ids: [opponentId] } : { ...club, rivalry_ids: [] },
      ),
    };
    const topic = keyMatchTopic({ ...context, league: session.league, world });
    expect(topic?.kind).toBe("derby");
  });
});

describe("press conference flow", () => {
  it("stays home for an ordinary match", () => {
    const session = seeded(newGameSession());
    const plain = {
      ...session,
      world: { ...session.world, clubs: session.world.clubs.map((club) => ({ ...club, rivalry_ids: [] })) },
    };
    expect(pressConferenceFor(plain, "pre", matchContext(plain))).toBeNull();
  });

  it("asks about the signing before the match and closes the pair after it", () => {
    const { session, playerId } = withBigSigning(seeded(newGameSession()));
    const context = matchContext(session);
    const pre = pressConferenceFor(session, "pre", context);
    expect(pre).not.toBeNull();
    expect(pre!.questions.length).toBeGreaterThanOrEqual(2);
    expect(pre!.questions.length).toBeLessThanOrEqual(3);
    const signingQuestion = pre!.questions.find((question) => question.kind === "transfer_in");
    expect(signingQuestion?.playerId).toBe(playerId);

    const moraleBefore = session.players.find((player) => player.id === playerId)!.state.morale;
    const afterPre = resolvePressConference(
      session,
      pre!,
      pre!.questions.map(() => "confident"),
    ).session;
    const moraleAfter = afterPre.players.find((player) => player.id === playerId)!.state.morale;
    expect(moraleAfter).toBeGreaterThan(moraleBefore);

    const press = sessionPressState(afterPre);
    expect(press.conference).toMatchObject({ pre_done: true, post_done: false });
    expect(press.known_topic_ids?.some((id) => id.startsWith("transfer:"))).toBe(true);
    expect(pressConferenceFor(afterPre, "pre", context)).toBeNull();

    const post = pressConferenceFor(afterPre, "post", { ...context, homeGoals: 2, awayGoals: 0 });
    expect(post).not.toBeNull();
    expect(post!.questions[0]!.kind).toMatch(/^result_/);
    const done = resolvePressConference(afterPre, post!, "delegate").session;
    expect(sessionPressState(done).conference).toMatchObject({ pre_done: true, post_done: true });
    expect(pressConferenceFor(done, "pre", context)).toBeNull();
    expect(sessionPressState(done).history).toHaveLength(2);
    expect(pressConferenceFor(done, "post", { ...context, homeGoals: 2, awayGoals: 0 })).toBeNull();
  });

  it("the pipeline hands an unanswered pair to the assistant exactly once", () => {
    const { session } = withBigSigning(seeded(newGameSession()));
    const context = matchContext(session);
    const afterPre = autoResolvePress(session, "pre", context);
    expect(sessionPressState(afterPre).conference?.pre_done).toBe(true);
    expect(autoResolvePress(afterPre, "pre", context)).toBe(afterPre);

    const fixture = { homeTeamId: context.homeTeamId, awayTeamId: context.awayTeamId, homeGoals: 1, awayGoals: 1 };
    const done = autoPostMatchPress(afterPre, fixture, afterPre.season, context.matchday);
    expect(sessionPressState(done).conference?.post_done).toBe(true);
    expect(done.season).toBe(afterPre.season);
    expect(sessionPressState(done).history.every((record) => record.delegated)).toBe(true);
  });

  it("calm answers win the press over, combative ones cost goodwill but rally the squad", () => {
    const { session } = withBigSigning(seeded(newGameSession()));
    const pre = pressConferenceFor(session, "pre", matchContext(session))!;
    const calm = resolvePressConference(session, pre, pre.questions.map(() => "calm")).session;
    const combative = resolvePressConference(session, pre, pre.questions.map(() => "combative")).session;
    expect(sessionPressState(calm).relationship).toBeGreaterThan(sessionPressState(combative).relationship);
    expect(avgMorale(combative)).toBeGreaterThan(avgMorale(session));
  });

  it("praise makes positional rivals jealous", () => {
    const session = newGameSession();
    const subject = proSquad(session).find((player) => player.position === "CB")!;
    const conference = buildPressConference({
      phase: "pre",
      fixtureKey: pressFixtureKey(1, 1),
      seed: 7,
      relationship: 55,
      boycott: false,
      topics: [{ id: "transfer:x", kind: "transfer_in", playerId: subject.id, params: { player: "X" } }],
      leakPending: false,
      players: session.players,
      clubId: session.clubId,
    });
    const effects = pressAnswerEffects(conference.questions[0]!, "confident", {
      players: session.players,
      clubId: session.clubId,
    });
    expect(effects.players[subject.id]).toBeGreaterThan(0);
    const rivals = Object.entries(effects.players).filter(([id]) => id !== subject.id);
    expect(rivals.length).toBeGreaterThan(0);
    expect(rivals.every(([, delta]) => delta < 0)).toBe(true);
  });

  it("during a boycott only the ally journalist asks, once", () => {
    const { session } = withBigSigning(seeded(newGameSession()));
    const press = sessionPressState(session);
    const boycotted = {
      ...session,
      storyState: {
        ...session.storyState,
        press: { ...press, boycott_until: careerWeekIndex(session.season, session.week) + 2 },
      },
    };
    const pre = pressConferenceFor(boycotted, "pre", matchContext(boycotted))!;
    expect(pre.boycott).toBe(true);
    expect(pre.questions).toHaveLength(1);
    expect(pre.questions[0]!.journalist).toBe("ally");
  });
});

describe("press delegation follows assistant skill", () => {
  function sample(): { conference: PressConference; context: { players: GameSession["players"]; clubId: string } } {
    const session = newGameSession();
    const context = { players: session.players, clubId: session.clubId };
    const conference = buildPressConference({
      phase: "post",
      fixtureKey: "1:5",
      seed: 11,
      relationship: 40,
      boycott: false,
      topics: [],
      leakPending: false,
      players: session.players,
      clubId: session.clubId,
      result: "loss",
      goalsFor: 0,
      goalsAgainst: 3,
      boardPressure: 70,
    });
    return { conference, context };
  }

  function value(effects: ReturnType<typeof pressConferenceEffects>): number {
    return effects.squad * 1.5 + effects.relationship * 0.6 + effects.hype * 0.3 - effects.pressure * 0.8 + effects.fanbase * 4;
  }

  it("a sharp assistant always finds the best line; an unsure one does worse on average", () => {
    const { conference, context } = sample();
    let sharp = 0;
    let unsure = 0;
    for (let seed = 1; seed <= 40; seed += 1) {
      sharp += value(pressConferenceEffects(conference, assistantPressTones(conference, 85, context, seed).tones, context));
      unsure += value(pressConferenceEffects(conference, assistantPressTones(conference, 40, context, seed).tones, context));
    }
    expect(sharp).toBeGreaterThan(unsure);
    const best = conference.questions.map((question) =>
      Math.max(...PRESS_TONES.map((tone) => value({ ...pressAnswerEffects(question, tone, context) }))),
    );
    expect(sharp / 40).toBeCloseTo(best.reduce((sum, item) => sum + item, 0), 5);
  });
});

describe("press state", () => {
  it("normalizes legacy saves without press data", () => {
    const press = normalizePressState(undefined);
    expect(press.relationship).toBe(55);
    expect(press.known_topic_ids).toBeUndefined();
    expect(press.conference).toBeNull();
  });
});

describe("press in the week pipeline", () => {
  async function derbyWeek(): Promise<GameSession> {
    const { newGameSession: create } = await import("../persistence/game-session.ts");
    const { defaultTrainingPlan } = await import("../development/training-units.ts");
    const { prepareCareerMatch } = await import("../sim/career-match-setup.ts");
    let session = create(new Date("2026-08-01T12:00:00Z"));
    session = { ...session, week: 1, weekday: 7, trainingPlan: defaultTrainingPlan() };
    const setup = prepareCareerMatch(session)!;
    const clubId = session.league.player_club_id;
    const opponentId = setup.homeTeamId === clubId ? setup.awayTeamId : setup.homeTeamId;
    return {
      ...session,
      world: {
        ...session.world,
        clubs: session.world.clubs.map((club) =>
          club.id === clubId ? { ...club, rivalry_ids: [opponentId] } : club,
        ),
      },
    };
  }

  it("delegates both pressers of an unwatched key match", async () => {
    const { simulateGameWeek } = await import("../sim/week-pipeline.ts");
    const result = await simulateGameWeek(await derbyWeek());
    const press = sessionPressState(result.session);
    expect(press.conference?.post_done).toBe(true);
    expect(press.history.map((record) => record.phase).sort()).toEqual(["post", "pre"]);
    expect(press.history.every((record) => record.delegated)).toBe(true);
  });

  it("leaves pressers the manager held alone", async () => {
    const { simulateGameWeek } = await import("../sim/week-pipeline.ts");
    const { prepareCareerMatch } = await import("../sim/career-match-setup.ts");
    let session = await derbyWeek();
    const context = pressMatchContext(prepareCareerMatch(session)!);
    const pre = pressConferenceFor(session, "pre", context)!;
    session = resolvePressConference(session, pre, pre.questions.map(() => "calm")).session;
    const post = pressConferenceFor(session, "post", { ...context, homeGoals: 1, awayGoals: 0 })!;
    session = resolvePressConference(session, post, post.questions.map(() => "calm")).session;

    const result = await simulateGameWeek(session);
    const press = sessionPressState(result.session);
    expect(press.history).toHaveLength(2);
    expect(press.history.some((record) => record.delegated)).toBe(false);
  });
});
