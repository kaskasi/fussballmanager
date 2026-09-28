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

export function updatePlayer(
  players: ReadonlyArray<PlayerMatchStatus>,
  playerId: PlayerId,
  patch: Partial<PlayerMatchStatus>,
): PlayerMatchStatus[] {
  return players.map((player) =>
    player.playerId === playerId ? { ...player, ...patch } : player,
  );
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

/**
 * How well the keeper covers the shot line at the goal mouth (0 = open goal, 1 = set).
 * Sweeper keepers caught upfield should score near zero even though they are on the pitch.
 */
export function keeperShotCoverage(
  keeper: PitchPosition,
  shooter: PitchPosition,
  mouth: PitchPosition,
): number {
  const shotLength = distance(shooter, mouth);
  if (shotLength < 0.5) {
    return 1;
  }
  const toMouthX = mouth.x - shooter.x;
  const toMouthY = mouth.y - shooter.y;
  const along =
    (toMouthX * (keeper.x - shooter.x) + toMouthY * (keeper.y - shooter.y)) /
    (shotLength * shotLength);
  if (along < 0.1) {
    return 0;
  }
  const closest = {
    x: shooter.x + clamp(along, 0, 1.12) * toMouthX,
    y: shooter.y + clamp(along, 0, 1.12) * toMouthY,
  };
  const lineDist = distance(keeper, closest);
  const mouthDist = distance(keeper, mouth);
  const reach = shotLength < 14 ? 5.5 : shotLength < 24 ? 8 : 11;
  const lineFactor = clamp(1 - lineDist / reach, 0, 1);
  const mouthFactor = clamp(1 - (mouthDist - reach * 0.35) / (reach + 3), 0, 1);
  return lineFactor * mouthFactor;
}
