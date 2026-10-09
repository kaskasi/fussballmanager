import type {
  MatchClock,
  MatchEvent,
  PlayerId,
  Squad,
  TeamId,
} from "@fussballmanager/shared";
import { attackingThird } from "./pitch-thirds.ts";

export type CommentaryContext = {
  playerName: (playerId: PlayerId) => string;
  teamName: (teamId: TeamId) => string;
  homeName: string;
  awayName: string;
};

export function commentaryContextFromSquads(
  home: Squad,
  away: Squad,
): CommentaryContext {
  const players = new Map<string, string>();
  for (const squad of [home, away]) {
    for (const player of [
      ...squad.starters.map((place) => place.player),
      ...squad.bench,
    ]) {
      players.set(player.id, player.name);
    }
  }
  const teams = new Map<string, string>([
    [home.team.id, home.team.name],
    [away.team.id, away.team.name],
  ]);
  return {
    playerName: (playerId) => players.get(playerId) ?? playerId,
    teamName: (teamId) => teams.get(teamId) ?? teamId,
    homeName: home.team.name,
    awayName: away.team.name,
  };
}

export function formatClock(clock: MatchClock): string {
  const mmss = `${clock.minute}'${String(clock.second).padStart(2, "0")}`;
  const firstStoppage =
    clock.period === "first_half" &&
    clock.minute === 45 &&
    (clock.stoppageMinute > 0 || clock.second > 0);
  const secondStoppage =
    (clock.period === "second_half" || clock.period === "full_time") &&
    clock.minute === 90 &&
    (clock.stoppageMinute > 0 || clock.second > 0);
  if (firstStoppage || secondStoppage) {
    return `${clock.minute}+${clock.stoppageMinute}'${String(clock.second).padStart(2, "0")}`;
  }
  return mmss;
}

/** Template sentence for one engine event. No LLM. */
export function commentate(event: MatchEvent, ctx: CommentaryContext): string {
  switch (event.type) {
    case "kickoff": {
      const team = ctx.teamName(event.kickingTeamId);
      const kicker = event.involved[0];
      const name = kicker ? ctx.playerName(kicker.playerId) : team;
      const opening =
        event.clock.period === "first_half" &&
        event.clock.minute === 0 &&
        event.clock.stoppageMinute === 0;
      const secondHalf =
        event.clock.period === "second_half" &&
        event.clock.minute === 45 &&
        event.clock.stoppageMinute === 0 &&
        event.clock.second <= 5;
      if (opening && event.clock.second <= 5) {
        return `${team} stoßen an. ${name} nimmt den Anstoß.`;
      }
      if (secondHalf) {
        return `Die zweite Halbzeit läuft. ${name} nimmt den Anstoß.`;
      }
      return `${name} spielt von der Mittellinie an.`;
    }
    case "pass": {
      const from = ctx.playerName(event.from.playerId);
      const to = ctx.playerName(event.to.playerId);
      if (!event.complete) {
        if (event.kind === "cross") {
          return `Die Flanke von ${from} auf ${to} kommt nicht an.`;
        }
        if (event.kind === "through") {
          return `Der Steckpass von ${from} auf ${to} wird abgefangen.`;
        }
        return `Der Pass von ${from} zu ${to} geht daneben.`;
      }
      if (event.kind === "cross") {
        return `${from} flankt auf ${to}.`;
      }
      if (event.kind === "through") {
        return `${from} steckt ${to} durch.`;
      }
      if (event.kind === "switch") {
        return `${from} verlagert das Spiel auf ${to}.`;
      }
      return `${from} findet ${to}.`;
    }
    case "carry":
      return `${ctx.playerName(event.player.playerId)} geht nach vorne.`;
    case "duel": {
      const attacker = ctx.playerName(event.attacker.playerId);
      const defender = ctx.playerName(event.defender.playerId);
      const attackerWins = event.winnerId === event.attacker.playerId;
      if (event.kind === "aerial") {
        return attackerWins
          ? `${attacker} gewinnt das Kopfballduell gegen ${defender}.`
          : `${defender} setzt sich im Kopfballduell gegen ${attacker} durch.`;
      }
      if (event.kind === "dribble") {
        return attackerWins
          ? `${attacker} geht an ${defender} vorbei.`
          : `${defender} stoppt ${attacker}.`;
      }
      return attackerWins
        ? `${attacker} setzt sich gegen ${defender} durch.`
        : `${defender} gewinnt den Zweikampf gegen ${attacker}.`;
    }
    case "shot": {
      const shooter = ctx.playerName(event.shooter.playerId);
      switch (event.outcome) {
        case "goal":
          return `${shooter} zieht ab — und trifft!`;
        case "save":
          return `${shooter} zwingt den Keeper zur Parade.`;
        case "block":
          return `Der Schuss von ${shooter} wird geblockt.`;
        case "wide":
          return `${shooter} schießt vorbei.`;
        case "woodwork":
          return `${shooter} trifft den Pfosten!`;
        default: {
          const _never: never = event.outcome;
          return _never;
        }
      }
    }
    case "goal": {
      const scorer = ctx.playerName(event.scorer.playerId);
      if (event.assist) {
        return `TOR! ${scorer}, vorbereitet von ${ctx.playerName(event.assist.playerId)}.`;
      }
      return `TOR! ${scorer}!`;
    }
    case "save":
      return `${ctx.playerName(event.keeper.playerId)} hält den Versuch von ${ctx.playerName(event.shooter.playerId)}!`;
    case "turnover":
      if (event.reason === "offside") {
        return `Abseits gegen ${ctx.teamName(event.fromTeamId)}. Freistoß für ${ctx.teamName(event.toTeamId)}.`;
      }
      return `${ctx.teamName(event.fromTeamId)} verliert den Ball. ${ctx.teamName(event.toTeamId)} ist am Ball.`;
    case "foul": {
      const line = `${ctx.playerName(event.fouler.playerId)} foult ${ctx.playerName(event.fouled.playerId)}.`;
      if (event.card === "red") {
        return `${line} Das könnte Rot sein.`;
      }
      if (event.card === "second_yellow") {
        return `${line} Er hat Gelb bereits.`;
      }
      if (event.card === "yellow") {
        return `${line} Der Schiedsrichter greift zur Karte.`;
      }
      return line;
    }
    case "card": {
      const player = ctx.playerName(event.player.playerId);
      if (event.color === "red") {
        return `${player} sieht Rot.`;
      }
      if (event.color === "second_yellow") {
        return `Gelb-Rot für ${player}.`;
      }
      return `${player} sieht Gelb.`;
    }
    case "injury": {
      const player = ctx.playerName(event.player.playerId);
      if (event.severity === "stretcher") {
        return `${player} muss mit der Bahre vom Platz.`;
      }
      if (event.severity === "off") {
        return `${player} kann nicht weiterspielen.`;
      }
      return `${player} liegt am Boden, kann aber weitermachen.`;
    }
    case "substitution":
      return `${ctx.teamName(event.teamId)} wechselt: ${ctx.playerName(event.playerOff.playerId)} raus, ${ctx.playerName(event.playerOn.playerId)} rein.`;
    case "restart": {
      const taker = event.involved[0]
        ? ctx.playerName(event.involved[0].playerId)
        : ctx.teamName(event.takingTeamId);
      const phase =
        event.phase === "goal_kick"
          ? "Abschlag"
          : event.phase === "free_kick"
            ? "Freistoß"
            : event.phase === "throw_in"
              ? "Einwurf"
              : event.phase === "kickoff"
                ? "Anstoß"
                : event.phase === "corner"
                  ? "Ecke"
                  : event.phase === "penalty"
                    ? "Elfmeter"
                    : event.phase;
      return `${taker} nimmt den ${phase}.`;
    }
    case "period_end":
      return event.period === "first_half"
        ? "Das war's zur Pause."
        : "Pfiff! Spielende.";
    case "match_end":
      return `Schlusspfiff. ${ctx.homeName} ${event.homeGoals}–${event.awayGoals} ${ctx.awayName}.`;
    default: {
      const _never: never = event;
      return _never;
    }
  }
}

export function commentateLine(
  event: MatchEvent,
  ctx: CommentaryContext,
): string {
  return `${formatClock(event.clock)}  ${commentate(event, ctx)}`;
}

function passLength(event: Extract<MatchEvent, { type: "pass" }>): number {
  return Math.hypot(
    event.to.position.x - event.from.position.x,
    event.to.position.y - event.from.position.y,
  );
}

function carryLength(event: Extract<MatchEvent, { type: "carry" }>): number {
  return Math.hypot(event.to.x - event.from.x, event.to.y - event.from.y);
}

/**
 * Engine ticks stay in the event stream for the 2D view.
 * The text feed only speaks when something changes the story.
 */
export function isCommentaryWorthy(
  event: MatchEvent,
  previous: MatchEvent | undefined,
  options?: { homeTeamId?: TeamId },
): boolean {
  const homeTeamId = options?.homeTeamId;

  if (event.type === "duel") {
    return false;
  }
  if (event.type === "carry") {
    if (
      previous?.type === "carry" &&
      previous.player.playerId === event.player.playerId
    ) {
      return false;
    }
    if (carryLength(event) < 7) return false;
    if (homeTeamId && event.possessionTeamId) {
      return attackingThird(event.ball.x, event.possessionTeamId, homeTeamId);
    }
    return false;
  }
  if (event.type === "pass") {
    const teamId = event.possessionTeamId ?? event.from.teamId;
    const inAttack =
      homeTeamId && teamId
        ? attackingThird(event.ball.x, teamId, homeTeamId)
        : false;
    if (!event.complete) {
      return inAttack;
    }
    if (event.kind === "cross" || event.kind === "through" || event.kind === "switch") {
      return inAttack;
    }
    if (previous?.type === "pass" && previous.complete && passLength(event) < 14) {
      return false;
    }
    return inAttack;
  }
  if (event.type === "turnover") {
    if (event.reason === "offside") return true;
    if (homeTeamId) {
      return attackingThird(event.ball.x, event.toTeamId, homeTeamId);
    }
    return false;
  }
  if (event.type === "foul") {
    if (event.card) return true;
    if (homeTeamId && event.possessionTeamId) {
      return attackingThird(event.ball.x, event.possessionTeamId, homeTeamId);
    }
    return false;
  }
  if (event.type === "restart") {
    return true;
  }
  return true;
}
