import type { MatchEvent } from "@fussballmanager/shared";
import { hashPickVariant } from "./chain-copy.ts";
import type { CommentaryI18n } from "./i18n-keys.ts";
import type { CommentaryContext } from "./render.ts";

/**
 * ADR 0004 — the text match carries the whole game, so play-by-play needs
 * more than one sentence per situation. Each copy group has N variants in
 * every locale pack (`match.line.<id>.<n>`); the pick is deterministic per
 * match seed and event seq. Params come from the event only (Weizenbaum).
 */
export const LINE_COPY_VARIANTS = {
  shot_on_target: 5,
  save: 5,
  shot_wide: 6,
  shot_blocked: 5,
  shot_woodwork: 4,
  goal_assist: 5,
  goal_plain: 5,
  card_yellow: 4,
  card_second_yellow: 2,
  card_red: 3,
  foul: 5,
  injury_knock: 2,
  injury_off: 3,
  substitution: 3,
  half_time: 3,
  final_whistle: 2,
  cross: 5,
  through: 5,
  switch: 4,
  pass_incomplete: 4,
  carry: 6,
  dribble_won: 5,
  tackle_won: 5,
  header_won: 4,
  interception: 4,
} as const;

export type LineCopyId = keyof typeof LINE_COPY_VARIANTS;

type Copy = { id: LineCopyId; params: Record<string, string> };

function copyFor(event: MatchEvent, ctx: CommentaryContext): Copy | null {
  const name = (playerId: Parameters<CommentaryContext["playerName"]>[0]) =>
    ctx.playerName(playerId);
  switch (event.type) {
    case "shot": {
      const shooter = name(event.shooter.playerId);
      switch (event.outcome) {
        case "save":
          return { id: "shot_on_target", params: { shooter } };
        case "wide":
          return { id: "shot_wide", params: { shooter } };
        case "block":
          return { id: "shot_blocked", params: { shooter } };
        case "woodwork":
          return { id: "shot_woodwork", params: { shooter } };
        default:
          return null;
      }
    }
    case "save":
      return {
        id: "save",
        params: { keeper: name(event.keeper.playerId), shooter: name(event.shooter.playerId) },
      };
    case "goal":
      return event.assist
        ? {
            id: "goal_assist",
            params: { scorer: name(event.scorer.playerId), assist: name(event.assist.playerId) },
          }
        : { id: "goal_plain", params: { scorer: name(event.scorer.playerId) } };
    case "card": {
      const player = name(event.player.playerId);
      const id =
        event.color === "yellow"
          ? "card_yellow"
          : event.color === "second_yellow"
            ? "card_second_yellow"
            : "card_red";
      return { id, params: { player } };
    }
    case "foul":
      return {
        id: "foul",
        params: { fouler: name(event.fouler.playerId), fouled: name(event.fouled.playerId) },
      };
    case "injury":
      return {
        id: event.severity === "knock" ? "injury_knock" : "injury_off",
        params: { player: name(event.player.playerId) },
      };
    case "substitution":
      return {
        id: "substitution",
        params: {
          team: ctx.teamName(event.teamId),
          off: name(event.playerOff.playerId),
          on: name(event.playerOn.playerId),
        },
      };
    case "period_end":
      return { id: event.period === "first_half" ? "half_time" : "final_whistle", params: {} };
    case "pass": {
      const passer = name(event.from.playerId);
      const receiver = name(event.to.playerId);
      if (!event.complete) {
        return { id: "pass_incomplete", params: { passer, receiver } };
      }
      if (event.kind === "cross") return { id: "cross", params: { passer, receiver } };
      if (event.kind === "through") return { id: "through", params: { passer, receiver } };
      if (event.kind === "switch") return { id: "switch", params: { passer, receiver } };
      return null;
    }
    case "carry":
      return { id: "carry", params: { player: name(event.player.playerId) } };
    case "duel": {
      const attackerWon = event.winnerId === event.attacker.playerId;
      const winner = name(attackerWon ? event.attacker.playerId : event.defender.playerId);
      const loser = name(attackerWon ? event.defender.playerId : event.attacker.playerId);
      const id =
        event.kind === "aerial" ? "header_won" : attackerWon ? "dribble_won" : "tackle_won";
      return { id, params: { winner, loser } };
    }
    case "turnover": {
      if (event.reason === "offside") return null;
      const winner = event.involved.at(-1);
      if (!winner) return null;
      return {
        id: "interception",
        params: { player: name(winner.playerId), team: ctx.teamName(event.toTeamId) },
      };
    }
    default:
      return null;
  }
}

/** Locale key and params for one play-by-play line, or null when the event has no copy group. */
export function lineCopyI18n(
  event: MatchEvent,
  ctx: CommentaryContext,
  seed: number,
): CommentaryI18n | null {
  const copy = copyFor(event, ctx);
  if (!copy) return null;
  const variant = hashPickVariant(seed, event.seq, copy.id, LINE_COPY_VARIANTS[copy.id]);
  return { key: `match.line.${copy.id}.${variant}`, params: copy.params };
}
