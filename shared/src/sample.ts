import { asMatchId, asPlayerId, asTeamId } from "./ids.ts";
import { createRng } from "./rng.ts";
import type { InvolvedPlayer, MatchEvent, MatchClock } from "./match-event.ts";
import type { MatchState } from "./match-state.ts";
import { isOnPitch } from "./pitch.ts";
import type { TeamTactics } from "./tactics.ts";
import { DIRECT_LINE_DUTIES, POSSESSION_LINE_DUTIES } from "./tactics.ts";

const matchId = asMatchId("match-sample");
const homeId = asTeamId("fc-nordstern");
const awayId = asTeamId("sv-rheinwacht");
const passerId = asPlayerId("nord-8");
const receiverId = asPlayerId("nord-9");
const defenderId = asPlayerId("rhein-5");
const keeperId = asPlayerId("rhein-1");

const clock: MatchClock = {
  period: "first_half",
  minute: 12,
  second: 18,
  stoppageMinute: 0,
};

const passer: InvolvedPlayer = {
  playerId: passerId,
  teamId: homeId,
  position: { x: 48, y: 52 },
};

const receiver: InvolvedPlayer = {
  playerId: receiverId,
  teamId: homeId,
  position: { x: 62, y: 40 },
};

const defender: InvolvedPlayer = {
  playerId: defenderId,
  teamId: awayId,
  position: { x: 64, y: 42 },
};

const keeper: InvolvedPlayer = {
  playerId: keeperId,
  teamId: awayId,
  position: { x: 96, y: 50 },
};

const homeTactics: TeamTactics = {
  teamId: homeId,
  formation: "4-3-3",
  mentality: 55,
  pressing: 60,
  width: 58,
  tempo: 52,
  marking: "zonal",
  lineHeight: 56,
  intensity: 105,
  ...POSSESSION_LINE_DUTIES,
};

const awayTactics: TeamTactics = {
  teamId: awayId,
  formation: "4-4-2",
  mentality: 48,
  pressing: 45,
  width: 50,
  tempo: 44,
  marking: "man",
  lineHeight: 48,
  intensity: 95,
  ...DIRECT_LINE_DUTIES,
};

const sampleAttributes = {
  passing: 60,
  tackling: 55,
  shooting: 50,
  pace: 60,
  stamina: 65,
  positioning: 58,
  aerial: 52,
  dribbling: 54,
  goalkeeping: 8,
  heightCm: 180,
};

export const sampleState: MatchState = {
  matchId,
  homeTeamId: homeId,
  awayTeamId: awayId,
  clock,
  phase: "open_play",
  score: { home: 0, away: 0 },
  ball: { x: 62, y: 40 },
  ballCarrierId: passerId,
  possessionTeamId: homeId,
  players: [
    {
      playerId: passerId,
      teamId: homeId,
      role: "CM",
      position: passer.position,
      onPitch: true,
      attributes: { ...sampleAttributes, passing: 76 },
      fatigue: 12,
      form: 61,
      yellowCards: 0,
      sentOff: false,
    },
    {
      playerId: receiverId,
      teamId: homeId,
      role: "ST",
      position: receiver.position,
      onPitch: true,
      attributes: { ...sampleAttributes, shooting: 80 },
      fatigue: 18,
      form: 70,
      yellowCards: 0,
      sentOff: false,
    },
    {
      playerId: defenderId,
      teamId: awayId,
      role: "CB",
      position: defender.position,
      onPitch: true,
      attributes: { ...sampleAttributes, tackling: 76 },
      fatigue: 15,
      form: 54,
      yellowCards: 0,
      sentOff: false,
    },
    {
      playerId: keeperId,
      teamId: awayId,
      role: "GK",
      position: keeper.position,
      onPitch: true,
      attributes: { ...sampleAttributes, goalkeeping: 74 },
      fatigue: 4,
      form: 58,
      yellowCards: 0,
      sentOff: false,
    },
  ],
  homeTactics,
  awayTactics,
  rng: createRng(1),
  lastPasserId: passerId,
  pending: null,
  periodElapsedSeconds: 12 * 60 + 18,
  stoppageAllowanceSeconds: 0,
  firstKickoffTeamId: homeId,
  substitutionsUsed: { home: 0, away: 0 },
  humanTeamId: homeId,
  transitionGainedTeamId: null,
  transitionUntilElapsed: null,
  nextSeq: 14,
};

export const samplePass: MatchEvent = {
  type: "pass",
  seq: 13,
  matchId,
  clock,
  ball: { x: 62, y: 40 },
  involved: [passer, receiver],
  possessionTeamId: homeId,
  from: passer,
  to: receiver,
  complete: true,
};

export const sampleShot: MatchEvent = {
  type: "shot",
  seq: 14,
  matchId,
  clock: { ...clock, second: 22 },
  ball: { x: 94, y: 50 },
  involved: [receiver, keeper],
  possessionTeamId: homeId,
  shooter: receiver,
  target: { x: 100, y: 48 },
  outcome: "save",
};

/** Both a text line and a pitch update can be derived without extra lookups. */
export function eventHasVizPayload(event: MatchEvent): boolean {
  if (!isOnPitch(event.ball)) {
    return false;
  }
  return event.involved.every((player) => isOnPitch(player.position));
}

export function eventTypeLabel(event: MatchEvent): string {
  switch (event.type) {
    case "kickoff":
      return "Kickoff";
    case "pass":
      return event.complete ? "Pass" : "Incomplete pass";
    case "carry":
      return "Carry";
    case "duel":
      return "Duel";
    case "shot":
      return "Shot";
    case "goal":
      return "Goal";
    case "save":
      return "Save";
    case "turnover":
      return "Turnover";
    case "foul":
      return "Foul";
    case "card":
      return "Card";
    case "injury":
      return "Injury";
    case "substitution":
      return "Substitution";
    case "restart":
      return "Restart";
    case "period_end":
      return "Period end";
    case "match_end":
      return "Full time";
    default: {
      const _never: never = event;
      return _never;
    }
  }
}
