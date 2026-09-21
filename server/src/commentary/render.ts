import type {
  MatchClock,
  MatchEvent,
  PlayerId,
  Squad,
  TeamId,
} from "@fussballmanager/shared";

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
        return `${team} get the match underway. ${name} takes kickoff.`;
      }
      if (secondHalf) {
        return `The second half is underway. ${name} takes kickoff.`;
      }
      return `${name} restarts from the centre spot.`;
    }
    case "pass": {
      const from = ctx.playerName(event.from.playerId);
      const to = ctx.playerName(event.to.playerId);
      return event.complete
        ? `${from} finds ${to}.`
        : `${from}'s pass towards ${to} doesn't come off.`;
    }
    case "carry":
      return `${ctx.playerName(event.player.playerId)} drives forward.`;
    case "duel": {
      const attacker = ctx.playerName(event.attacker.playerId);
      const defender = ctx.playerName(event.defender.playerId);
      const attackerWins = event.winnerId === event.attacker.playerId;
      if (event.kind === "aerial") {
        return attackerWins
          ? `${attacker} wins the header against ${defender}.`
          : `${defender} wins the aerial duel with ${attacker}.`;
      }
      if (event.kind === "dribble") {
        return attackerWins
          ? `${attacker} takes ${defender} on and gets past.`
          : `${defender} stands ${attacker} up and wins the ball.`;
      }
      return attackerWins
        ? `${attacker} rides the challenge from ${defender}.`
        : `${defender} wins the tackle on ${attacker}.`;
    }
    case "shot": {
      const shooter = ctx.playerName(event.shooter.playerId);
      switch (event.outcome) {
        case "goal":
          return `${shooter} has a go — it's in!`;
        case "save":
          return `${shooter} forces a save.`;
        case "block":
          return `${shooter}'s shot is blocked.`;
        case "wide":
          return `${shooter} fires wide.`;
        case "woodwork":
          return `${shooter} rattles the woodwork.`;
        default: {
          const _never: never = event.outcome;
          return _never;
        }
      }
    }
    case "goal": {
      const scorer = ctx.playerName(event.scorer.playerId);
      if (event.assist) {
        return `GOAL! ${scorer}, assisted by ${ctx.playerName(event.assist.playerId)}.`;
      }
      return `GOAL! ${scorer}!`;
    }
    case "save":
      return `${ctx.playerName(event.keeper.playerId)} keeps out ${ctx.playerName(event.shooter.playerId)}.`;
    case "turnover":
      if (event.reason === "offside") {
        return `Offside against ${ctx.teamName(event.fromTeamId)}. ${ctx.teamName(event.toTeamId)} will take the free kick.`;
      }
      return `${ctx.teamName(event.fromTeamId)} give it away. ${ctx.teamName(event.toTeamId)} are on the ball.`;
    case "foul": {
      const line = `${ctx.playerName(event.fouler.playerId)} fouls ${ctx.playerName(event.fouled.playerId)}.`;
      if (event.card === "red") {
        return `${line} That could be a red.`;
      }
      if (event.card === "second_yellow") {
        return `${line} He's already on a yellow.`;
      }
      if (event.card === "yellow") {
        return `${line} The referee reaches for a card.`;
      }
      return line;
    }
    case "card": {
      const player = ctx.playerName(event.player.playerId);
      if (event.color === "red") {
        return `${player} is sent off.`;
      }
      if (event.color === "second_yellow") {
        return `Second yellow for ${player} — he's off.`;
      }
      return `${player} is booked.`;
    }
    case "injury": {
      const player = ctx.playerName(event.player.playerId);
      if (event.severity === "stretcher") {
        return `${player} is carried off on a stretcher.`;
      }
      if (event.severity === "off") {
        return `${player} can't continue.`;
      }
      return `${player} is down, but looks able to play on.`;
    }
    case "substitution":
      return `${ctx.teamName(event.teamId)} replace ${ctx.playerName(event.playerOff.playerId)} with ${ctx.playerName(event.playerOn.playerId)}.`;
    case "restart": {
      const taker = event.involved[0]
        ? ctx.playerName(event.involved[0].playerId)
        : ctx.teamName(event.takingTeamId);
      const phase =
        event.phase === "goal_kick"
          ? "goal kick"
          : event.phase === "free_kick"
            ? "free kick"
            : event.phase === "throw_in"
              ? "throw-in"
              : event.phase === "kickoff"
                ? "kickoff"
                : event.phase;
      return `${taker} takes the ${phase}.`;
    }
    case "period_end":
      return event.period === "first_half"
        ? "That's half-time."
        : "The referee blows for full time.";
    case "match_end":
      return `Full time. ${ctx.homeName} ${event.homeGoals}–${event.awayGoals} ${ctx.awayName}.`;
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
): boolean {
  if (event.type === "carry") {
    if (
      previous?.type === "carry" &&
      previous.player.playerId === event.player.playerId
    ) {
      return false;
    }
    return carryLength(event) >= 7;
  }
  if (event.type === "pass" && event.complete) {
    if (previous?.type === "pass" && previous.complete && passLength(event) < 14) {
      return false;
    }
    return true;
  }
  return true;
}
