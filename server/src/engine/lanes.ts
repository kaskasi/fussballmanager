import type { PitchPosition, PlayerMatchStatus } from "@fussballmanager/shared";
import { clamp, distance } from "./helpers.ts";

/** Distance from a point to the pass segment (the passing lane). */
export function pointToSegmentDistance(
  point: PitchPosition,
  from: PitchPosition,
  to: PitchPosition,
): { distance: number; t: number } {
  const abx = to.x - from.x;
  const aby = to.y - from.y;
  const len2 = abx * abx + aby * aby;
  if (len2 < 0.0001) {
    return { distance: distance(point, from), t: 0 };
  }
  const t = clamp(
    ((point.x - from.x) * abx + (point.y - from.y) * aby) / len2,
    0,
    1,
  );
  const projected = { x: from.x + t * abx, y: from.y + t * aby };
  return { distance: distance(point, projected), t };
}

export function laneRadius(defender: PlayerMatchStatus): number {
  return 3.2 + defender.attributes.positioning * 0.035;
}

export function coveringLane(
  defender: PlayerMatchStatus,
  from: PitchPosition,
  to: PitchPosition,
): boolean {
  if (defender.role === "GK") {
    return false;
  }
  const { distance: dist, t } = pointToSegmentDistance(
    defender.position,
    from,
    to,
  );
  return t > 0.12 && t < 0.88 && dist <= laneRadius(defender);
}

export function interceptChance(
  defender: PlayerMatchStatus,
  pressing: number,
  lostBall: boolean,
): number {
  const base =
    0.18 +
    defender.attributes.positioning / 200 +
    defender.attributes.pace / 900 +
    pressing / 400;
  const shape = lostBall ? 0.42 : 1;
  return clamp(base * shape, 0.04, 0.62);
}

export function bestLaneCover(
  defenders: readonly PlayerMatchStatus[],
  from: PitchPosition,
  to: PitchPosition,
): PlayerMatchStatus | undefined {
  let best: PlayerMatchStatus | undefined;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const defender of defenders) {
    if (!coveringLane(defender, from, to)) {
      continue;
    }
    const { distance: dist } = pointToSegmentDistance(
      defender.position,
      from,
      to,
    );
    if (dist < bestDist) {
      bestDist = dist;
      best = defender;
    }
  }
  return best;
}
