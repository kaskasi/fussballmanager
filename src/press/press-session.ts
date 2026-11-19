/**
 * PRD 28 — press conferences against the game session.
 *
 * Match flow: Lineup → pre-match presser → kickoff → report → post-match presser. Unwatched
 * matches (simulate week / simulate until) hand both pressers to the assistant inside the week
 * pipeline, so a presser never blocks a skip and never fires twice.
 */

import type { FixtureResult, TeamId } from "@fussballmanager/shared";
import type { GameSession } from "../persistence/game-session.ts";
import { clampMediaHype } from "../narrative/story-state.ts";
import { assistantQuality } from "../staff/assistant-delegation.ts";
import { advanceClubFanbase } from "../stadium/fanbase.ts";
import { careerWeekIndex } from "../stadium/hospitality.ts";
import type { CareerMatchSetup } from "../sim/career-match-setup.ts";
import { prepareCareerMatch } from "../sim/career-match-setup.ts";
import { clubShortName } from "../sim/league-week.ts";
import {
  assistantPressTones,
  buildPressConference,
  isKeyMatchKind,
  PRESS_GAFFE,
  pressConferenceEffects,
  pressSeed,
  type PressConference,
  type PressMatchResult,
} from "./press-conference.ts";
import {
  addPressEffects,
  clampPressRelationship,
  isPressBoycott,
  normalizePressState,
  PRESS_HISTORY_MAX,
  type PressConferenceRecord,
  type PressEffects,
  type PressPhase,
  type PressState,
  type PressTone,
} from "./press-state.ts";
import { keyMatchTopic, pendingPressTopics, seedKnownTopicIds } from "./press-triggers.ts";

export function pressFixtureKey(season: number, matchday: number): string {
  return `${season}:${matchday}`;
}

/** PRD 36 — a cup tie's conference key, apart from the league matchdays. */
export function pressConferenceKey(season: number, context: Pick<PressMatchContext, "matchday" | "cup">): string {
  return context.cup ? `${season}:cup-${context.cup.id}-${context.cup.round}` : pressFixtureKey(season, context.matchday);
}

/** Seed component of a conference: the matchday, or a value above any matchday for a cup round. */
function pressFixtureOrdinal(context: Pick<PressMatchContext, "matchday" | "cup">): number {
  if (!context.cup) return context.matchday;
  return 1000 + context.cup.round * 10 + (context.cup.id === "national" ? 1 : 0);
}

export interface PressMatchContext {
  matchday: number;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  opponentName: string;
  /** Pre-match: the confirmed XI. */
  starterIds?: readonly string[];
  /** Post-match. */
  homeGoals?: number;
  awayGoals?: number;
  standoutPlayerId?: string;
  /** PRD 36 — set for a cup tie. */
  cup?: { id: string; round: number };
}

export function pressMatchContext(
  setup: Pick<CareerMatchSetup, "matchday" | "homeTeamId" | "awayTeamId" | "opponentShortName" | "cup">,
  extra: Partial<PressMatchContext> = {},
): PressMatchContext {
  return {
    ...(setup.cup ? { cup: { id: setup.cup.id, round: setup.cup.round } } : {}),
    matchday: setup.matchday,
    homeTeamId: setup.homeTeamId,
    awayTeamId: setup.awayTeamId,
    opponentName: setup.opponentShortName,
    ...extra,
  };
}

export function sessionPressState(session: Pick<GameSession, "storyState">): PressState {
  return normalizePressState(session.storyState.press);
}

function matchResult(session: GameSession, context: PressMatchContext): PressMatchResult | undefined {
  if (context.homeGoals == null || context.awayGoals == null) return undefined;
  const home = context.homeTeamId === session.league.player_club_id;
  const goalsFor = home ? context.homeGoals : context.awayGoals;
  const goalsAgainst = home ? context.awayGoals : context.homeGoals;
  if (goalsFor > goalsAgainst) return "win";
  if (goalsFor < goalsAgainst) return "loss";
  return "draw";
}

/** The conference due at this point of the match flow, or null when the press stays home. */
export function pressConferenceFor(
  session: GameSession,
  phase: PressPhase,
  context: PressMatchContext,
): PressConference | null {
  const press = sessionPressState(session);
  const key = pressConferenceKey(session.season, context);
  const current = press.conference?.fixture_key === key ? press.conference : null;
  const weekIndex = careerWeekIndex(session.season, session.week);

  let topics = current?.topics ?? [];
  if (phase === "pre") {
    if (current?.pre_done) return null;
    if (!current) {
      // The key-match topic talks about the table and derbies: league matches only.
      const keyMatch = context.cup ? null : keyMatchTopic({
        league: session.league,
        world: session.world,
        homeTeamId: context.homeTeamId,
        awayTeamId: context.awayTeamId,
        opponentName: context.opponentName,
        matchday: context.matchday,
      });
      topics = [...pendingPressTopics(session, press.known_topic_ids), ...(keyMatch ? [keyMatch] : [])];
    }
    if (topics.length === 0 && !press.leak_pending) return null;
  } else if (!current?.pre_done || current.post_done) {
    return null;
  }

  const home = context.homeTeamId === session.league.player_club_id;
  const opponentId = home ? context.awayTeamId : context.homeTeamId;
  // Journalists say the club's name, not the three-letter table code.
  const opponentName = session.world.clubs.find((club) => club.id === opponentId)?.name ?? context.opponentName;
  topics = topics.map((topic) =>
    topic.params.opponent != null ? { ...topic, params: { ...topic.params, opponent: opponentName } } : topic,
  );
  return buildPressConference({
    phase,
    fixtureKey: key,
    seed: pressSeed([session.masterSeed, session.season, pressFixtureOrdinal(context), phase]),
    relationship: press.relationship,
    boycott: isPressBoycott(press, weekIndex),
    topics,
    leakPending: phase === "pre" && Boolean(press.leak_pending),
    players: session.players,
    clubId: session.clubId,
    starterIds: context.starterIds,
    result: phase === "post" ? matchResult(session, context) : undefined,
    goalsFor: home ? context.homeGoals : context.awayGoals,
    goalsAgainst: home ? context.awayGoals : context.homeGoals,
    opponentName,
    standoutPlayerId: context.standoutPlayerId,
    boardPressure: session.board.pressure,
  });
}

/** Morale, hype, press goodwill, board pressure and fanbase — nothing else (PRD 13 allow-list). */
export function applyPressEffects(session: GameSession, effects: PressEffects): GameSession {
  const players = session.players.map((player) => {
    const squadDelta =
      player.club_id === session.clubId && player.squad_status === "pro" ? effects.squad : 0;
    const total = squadDelta + (effects.players[player.id] ?? 0);
    if (total === 0) return player;
    return {
      ...player,
      state: { ...player.state, morale: Math.min(100, Math.max(0, player.state.morale + total)) },
    };
  });
  const press = sessionPressState(session);
  return {
    ...session,
    players,
    board: {
      ...session.board,
      pressure: Math.min(100, Math.max(0, session.board.pressure + effects.pressure)),
    },
    stadium: effects.fanbase !== 0 ? advanceClubFanbase(session.stadium, effects.fanbase) : session.stadium,
    storyState: {
      ...session.storyState,
      media_hype: clampMediaHype(session.storyState.media_hype + effects.hype),
      press: { ...press, relationship: clampPressRelationship(press.relationship + effects.relationship) },
    },
  };
}

export type PressAnswer = readonly PressTone[] | "delegate";

export interface PressResolution {
  session: GameSession;
  record: PressConferenceRecord;
}

export function resolvePressConference(
  session: GameSession,
  conference: PressConference,
  answer: PressAnswer,
): PressResolution {
  const context = { players: session.players, clubId: session.clubId };
  const delegated = answer === "delegate";
  let tones: PressTone[];
  let effects: PressEffects;
  if (delegated) {
    const delegation = assistantPressTones(
      conference,
      assistantQuality(session.coachingStaff),
      context,
      pressSeed([session.masterSeed, conference.fixtureKey, conference.phase, "assistant"]),
    );
    tones = delegation.tones;
    effects = pressConferenceEffects(conference, tones, context);
    if (delegation.gaffe) effects = addPressEffects(effects, PRESS_GAFFE);
  } else {
    tones = conference.questions.map((_, index) => answer[index] ?? "calm");
    effects = pressConferenceEffects(conference, tones, context);
  }

  const applied = applyPressEffects(session, effects);
  const press = sessionPressState(applied);
  const record: PressConferenceRecord = {
    fixture_key: conference.fixtureKey,
    phase: conference.phase,
    season: session.season,
    week: session.week,
    delegated,
    tones,
    effects,
  };

  let next: PressState = { ...press, history: [record, ...press.history].slice(0, PRESS_HISTORY_MAX) };
  if (conference.phase === "pre") {
    const covered = conference.topics.filter((topic) => !isKeyMatchKind(topic.kind)).map((topic) => topic.id);
    const known = press.known_topic_ids ?? seedKnownTopicIds(session);
    next = {
      ...next,
      known_topic_ids: [...new Set([...known, ...covered])],
      conference: {
        fixture_key: conference.fixtureKey,
        topics: conference.topics,
        pre_done: true,
        post_done: false,
      },
      leak_pending: false,
    };
  } else if (next.conference) {
    // Keep the finished pair: it marks this fixture as covered until the next match's presser.
    next = { ...next, conference: { ...next.conference, post_done: true } };
  }

  return {
    session: { ...applied, storyState: { ...applied.storyState, press: next } },
    record,
  };
}

/** Pipeline: the assistant answers whatever the manager did not (unwatched or abandoned match). */
export function autoResolvePress(
  session: GameSession,
  phase: PressPhase,
  context: PressMatchContext,
): GameSession {
  const conference = pressConferenceFor(session, phase, context);
  if (!conference) return session;
  return resolvePressConference(session, conference, "delegate").session;
}

export function autoPreMatchPress(session: GameSession): GameSession {
  const setup = prepareCareerMatch(session);
  // PRD 36: the assistant holds league pressers only; a cup presser is the manager's (watched tie).
  if (!setup || setup.cup) return session;
  return autoResolvePress(session, "pre", pressMatchContext(setup));
}

/** Pipeline, after the player's fixture: closes the conference pair the pre-match presser opened. */
export function autoPostMatchPress(
  session: GameSession,
  fixture: FixtureResult | null,
  playedSeason: number,
  playedMatchday: number,
): GameSession {
  if (!fixture) return session;
  const press = sessionPressState(session);
  if (press.conference?.fixture_key !== pressFixtureKey(playedSeason, playedMatchday)) return session;
  const clubId = session.league.player_club_id;
  const opponentId = fixture.homeTeamId === clubId ? fixture.awayTeamId : fixture.homeTeamId;
  // The fixture key belongs to the season the match was played in, even across a season rollover.
  const resolved = autoResolvePress({ ...session, season: playedSeason }, "post", {
    matchday: playedMatchday,
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
    opponentName: clubShortName(opponentId, session.world.clubs),
    homeGoals: fixture.homeGoals,
    awayGoals: fixture.awayGoals,
  });
  return { ...resolved, season: session.season };
}
