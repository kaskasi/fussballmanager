import type {
  InvolvedPlayer,
  PitchPosition,
  PlayerId,
  PlayerMatchStatus,
  TeamId,
} from "@fussballmanager/shared";
import { PITCH_MAX, PITCH_MIN } from "@fussballmanager/shared";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampPitch(position: PitchPosition): PitchPosition {
  return {
    x: clamp(position.x, PITCH_MIN, PITCH_MAX),
    y: clamp(position.y, PITCH_MIN, PITCH_MAX),
  };
}

export function lerp(
  from: PitchPosition,
  to: PitchPosition,
  t: number,
): PitchPosition {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
}

export function distance(a: PitchPosition, b: PitchPosition): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function asInvolved(player: PlayerMatchStatus): InvolvedPlayer {
  return {
    playerId: player.playerId,
    teamId: player.teamId,
    position: player.position,
  };
}

export function requirePlayer(
  players: ReadonlyArray<PlayerMatchStatus>,
  playerId: PlayerId,
): PlayerMatchStatus {
  const found = players.find((player) => player.playerId === playerId);
  if (!found) {
    throw new Error(`Unknown player ${playerId}`);
  }
  return found;
}

export function onPitchFor(
  players: ReadonlyArray<PlayerMatchStatus>,
  teamId: TeamId,
): PlayerMatchStatus[] {
  return players.filter(
    (player) => player.teamId === teamId && player.onPitch && !player.sentOff,
  );
}

export function nearest(
  players: ReadonlyArray<PlayerMatchStatus>,
  point: PitchPosition,
): PlayerMatchStatus | undefined {
  let best: PlayerMatchStatus | undefined;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const player of players) {
    const d = distance(player.position, point);
    if (d < bestDist) {
      bestDist = d;
      best = player;
    }
  }
  return best;
}

export function patchPlayers(
  players: ReadonlyArray<PlayerMatchStatus>,
  updates: ReadonlyArray<{ playerId: PlayerId; position: PitchPosition }>,
): PlayerMatchStatus[] {
  const byId = new Map(
    updates.map((update) => [update.playerId, update.position]),
  );
  return players.map((player) => {
    const position = byId.get(player.playerId);
    return position ? { ...player, position } : player;
  });
}

export function movePlayer(
  players: ReadonlyArray<PlayerMatchStatus>,
  playerId: PlayerId,
  position: PitchPosition,
): PlayerMatchStatus[] {
  return patchPlayers(players, [{ playerId, position }]);
}

export function attackingSign(
  homeTeamId: TeamId,
  teamId: TeamId,
): 1 | -1 {
  return teamId === homeTeamId ? 1 : -1;
}

export function oppositionTeamId(
  homeTeamId: TeamId,
  teamId: TeamId,
  awayTeamId: TeamId,
): TeamId {
  return teamId === homeTeamId ? awayTeamId : homeTeamId;
}

export function goalMouth(homeTeamId: TeamId, attackingTeamId: TeamId): PitchPosition {
  return attackingTeamId === homeTeamId ? { x: 100, y: 50 } : { x: 0, y: 50 };
}
