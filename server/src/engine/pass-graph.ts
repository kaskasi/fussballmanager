import type {
  MatchState,
  PassKind,
  PitchPosition,
  PlayerMatchStatus,
  PlayerRole,
  TeamId,
  TeamTactics,
} from "@fussballmanager/shared";
import { pickWeighted } from "@fussballmanager/shared";
import {
  attackingSign,
  clamp,
  clampPitch,
  distance,
  onPitchFor,
} from "./helpers.ts";
import { coveringLane } from "./lanes.ts";
import { isOffsideReceiver } from "./laws.ts";
import { depthFromOwnGoal } from "./shape.ts";

const ROLE_LINK: Record<PlayerRole, Partial<Record<PlayerRole, number>>> = {
  GK: { CB: 3.2, FB: 2.4, DM: 1.3, CM: 0.45, W: 0.55, ST: 0.2, AM: 0.25 },
  CB: { CB: 2.1, FB: 1.9, DM: 2.3, CM: 1.4, GK: 1.7, W: 0.55, ST: 0.22, AM: 0.4 },
  FB: { W: 2.3, CM: 1.35, DM: 1.25, CB: 1.35, ST: 0.85, GK: 0.7, FB: 0.4, AM: 0.7 },
  DM: { CB: 1.7, FB: 1.35, CM: 2.1, W: 1.25, ST: 0.7, GK: 1.15, AM: 0.9, DM: 0.8 },
  CM: { DM: 1.55, CM: 1.45, W: 1.7, ST: 1.25, FB: 1.05, CB: 0.75, AM: 1.2, GK: 0.28 },
  AM: { ST: 1.9, W: 1.5, CM: 1.3, FB: 0.7, DM: 0.9, CB: 0.25, GK: 0.1 },
  W: { ST: 2.5, AM: 1.3, CM: 1.15, W: 1.65, FB: 1.05, DM: 0.55, CB: 0.18, GK: 0.08 },
  ST: { W: 1.55, AM: 1.45, CM: 1.4, ST: 1.15, FB: 0.7, DM: 0.55, CB: 0.12, GK: 0.1 },
};

export function rolePassLink(from: PlayerRole, to: PlayerRole): number {
  return ROLE_LINK[from][to] ?? 0.35;
}

/** Wide service prefers the six-yard/box, not a striker parked on the D. */
export function widePassFeedWeight(input: {
  passerWide: boolean;
  targetRole: PlayerRole;
  targetDistGoal: number;
  targetY: number;
  /** Only dump into the box from the final third, not a 40 m hope from halfway. */
  passerInFinalThird?: boolean;
}): number {
  if (!input.passerWide || input.passerInFinalThird === false) {
    return 1;
  }
  const box =
    input.targetDistGoal < 16 && Math.abs(input.targetY - 50) < 20 ? 1 : 0;
  const close = Math.min(1, Math.max(0, (18 - input.targetDistGoal) / 18));
  const runner =
    input.targetRole === "ST" ||
    input.targetRole === "AM" ||
    input.targetRole === "W"
      ? 1.15
      : 1;
  return (1 + 2.2 * close + 1.6 * box) * runner;
}

export function isWideFinalThird(
  ball: { x: number; y: number },
  ownGoal: { x: number; y: number },
  attackSign: 1 | -1,
): boolean {
  const depth = depthFromOwnGoal(ball, ownGoal, attackSign);
  return depth >= 66 && Math.abs(ball.y - 50) >= 26;
}

export function isGoalKickSituation(
  carrier: PlayerMatchStatus,
  ownGoal: { x: number; y: number },
  attackSign: 1 | -1,
): boolean {
  return (
    carrier.role === "GK" &&
    depthFromOwnGoal(carrier.position, ownGoal, attackSign) < 18
  );
}

export function isCornerSituation(carrier: PlayerMatchStatus): boolean {
  const { x, y } = carrier.position;
  const flag = (x < 10 || x > 90) && (y < 14 || y > 86);
  return (
    flag &&
    (carrier.role === "W" ||
      carrier.role === "FB" ||
      carrier.role === "CM" ||
      carrier.role === "AM")
  );
}

function nearestOpponentGap(
  defenders: readonly PlayerMatchStatus[] | undefined,
  spot: { x: number; y: number },
): number {
  if (!defenders || defenders.length === 0) {
    return 14;
  }
  let best = 99;
  for (const defender of defenders) {
    if (defender.role === "GK") {
      continue;
    }
    const gap = distance(defender.position, spot);
    if (gap < best) {
      best = gap;
    }
  }
  return best;
}

function spaceOnReceiver(gap: number): number {
  return clamp(gap / 7, 0.22, 1.12);
}

function laneOpenFactor(
  defenders: readonly PlayerMatchStatus[] | undefined,
  from: { x: number; y: number },
  to: { x: number; y: number },
): number {
  if (!defenders) {
    return 1;
  }
  for (const defender of defenders) {
    if (coveringLane(defender, from, to)) {
      return 0.28;
    }
  }
  return 1;
}

function shortRangeFactor(dist: number): number {
  return 1 / (1 + (dist / 8) ** 1.45);
}

function runTime(
  player: PlayerMatchStatus,
  from: PitchPosition,
  to: PitchPosition,
): number {
  const speed = 14 + player.attributes.pace * 0.22;
  return distance(from, to) / speed;
}

function canRunThrough(role: PlayerRole): boolean {
  return (
    role === "ST" ||
    role === "W" ||
    role === "AM" ||
    role === "CM" ||
    role === "FB"
  );
}

/** Outfield opponents the ball goes beyond on the way to goal. */
export function playersBypassed(
  from: PitchPosition,
  to: PitchPosition,
  defenders: readonly PlayerMatchStatus[],
  ownGoal: PitchPosition,
  attackSign: 1 | -1,
): number {
  const fromDepth = depthFromOwnGoal(from, ownGoal, attackSign);
  const toDepth = depthFromOwnGoal(to, ownGoal, attackSign);
  if (toDepth <= fromDepth + 2) {
    return 0;
  }
  let beaten = 0;
  for (const defender of defenders) {
    if (defender.role === "GK") {
      continue;
    }
    const depth = depthFromOwnGoal(defender.position, ownGoal, attackSign);
    if (depth > fromDepth + 1 && depth < toDepth - 0.5) {
      beaten += 1;
    }
  }
  return beaten;
}

/** Outfield opponents still between this spot and the goal. */
export function defendersBeyond(
  from: PitchPosition,
  defenders: readonly PlayerMatchStatus[],
  ownGoal: PitchPosition,
  attackSign: 1 | -1,
): number {
  const fromDepth = depthFromOwnGoal(from, ownGoal, attackSign);
  let ahead = 0;
  for (const defender of defenders) {
    if (defender.role === "GK") {
      continue;
    }
    if (depthFromOwnGoal(defender.position, ownGoal, attackSign) > fromDepth + 1) {
      ahead += 1;
    }
  }
  return ahead;
}

/**
 * Ball to a point the runner would reach first, between him and the goal —
 * not to the shirt he is wearing now.
 */
export function throughLeadSpot(input: {
  passer: PlayerMatchStatus;
  runner: PlayerMatchStatus;
  ownGoal: PitchPosition;
  attackSign: 1 | -1;
  defenders: readonly PlayerMatchStatus[];
  homeTeamId: TeamId;
}): { spot: PitchPosition; quality: number; bypassed: number } | null {
  if (!canRunThrough(input.runner.role) || input.runner.role === "GK") {
    return null;
  }
  const mouth = {
    x: input.ownGoal.x + input.attackSign * 100,
    y: 50,
  };
  const from = input.runner.position;
  const vx = mouth.x - from.x;
  const vy = mouth.y - from.y;
  const len = Math.hypot(vx, vy);
  if (len < 6) {
    return null;
  }
  const ux = vx / len;
  const uy = vy / len;
  let best: { spot: PitchPosition; quality: number; bypassed: number } | null =
    null;
  for (const lead of [12, 9, 7]) {
    const spot = clampPitch({
      x: from.x + ux * lead,
      y: from.y + uy * lead,
    });
    const passDist = distance(input.passer.position, spot);
    if (passDist < 8 || passDist > 36) {
      continue;
    }
    const bypassed = playersBypassed(
      input.passer.position,
      spot,
      input.defenders,
      input.ownGoal,
      input.attackSign,
    );
    if (bypassed < 1) {
      continue;
    }
    if (
      isOffsideReceiver({
        receiver: from,
        ball: input.passer.position,
        defenders: input.defenders,
        attackingTeamId: input.passer.teamId,
        homeTeamId: input.homeTeamId,
      })
    ) {
      continue;
    }
    const att = runTime(input.runner, from, spot);
    let def = 99;
    for (const defender of input.defenders) {
      const t = runTime(defender, defender.position, spot);
      if (t < def) {
        def = t;
      }
    }
    if (def < att * 0.88) {
      continue;
    }
    const gap = nearestOpponentGap(input.defenders, spot);
    const lane = laneOpenFactor(
      input.defenders,
      input.passer.position,
      spot,
    );
    const race = clamp(def / Math.max(att, 0.04), 0.7, 1.8);
    const direct =
      (depthFromOwnGoal(spot, input.ownGoal, input.attackSign) -
        depthFromOwnGoal(input.passer.position, input.ownGoal, input.attackSign)) /
      Math.max(passDist, 1);
    const quality =
      spaceOnReceiver(gap) * lane * race * (0.45 + direct) * bypassed;
    if (!best || quality > best.quality) {
      best = { spot, quality, bypassed };
    }
  }
  return best;
}

export function bestThroughLead(
  passer: PlayerMatchStatus,
  teammates: readonly PlayerMatchStatus[],
  ownGoal: PitchPosition,
  attackSign: 1 | -1,
  defenders: readonly PlayerMatchStatus[],
  homeTeamId: TeamId,
): {
  runner: PlayerMatchStatus;
  spot: PitchPosition;
  quality: number;
  bypassed: number;
} | null {
  let best: {
    runner: PlayerMatchStatus;
    spot: PitchPosition;
    quality: number;
    bypassed: number;
  } | null = null;
  for (const runner of teammates) {
    const lead = throughLeadSpot({
      passer,
      runner,
      ownGoal,
      attackSign,
      defenders,
      homeTeamId,
    });
    if (!lead) {
      continue;
    }
    if (!best || lead.quality > best.quality) {
      best = {
        runner,
        spot: lead.spot,
        quality: lead.quality,
        bypassed: lead.bypassed,
      };
    }
  }
  return best;
}

function inferKind(
  passer: PlayerMatchStatus,
  target: PlayerMatchStatus,
  kind: PassKind | undefined,
): PassKind {
  if (kind) {
    return kind;
  }
  const dist = distance(passer.position, target.position);
  const dy = Math.abs(target.position.y - passer.position.y);
  if (passer.role === "GK" && dist > 28) {
    return "restart";
  }
  if (dy > 36 && dist > 26) {
    return "switch";
  }
  return "short";
}

function recyclePenalty(input: {
  passer: PlayerMatchStatus;
  target: PlayerMatchStatus;
  lastPasserId: PlayerMatchStatus["playerId"] | null | undefined;
  ownGoal: { x: number; y: number };
  attackSign: 1 | -1;
}): number {
  if (!input.lastPasserId || input.lastPasserId === input.passer.playerId) {
    return 1;
  }
  const passerDepth = depthFromOwnGoal(
    input.passer.position,
    input.ownGoal,
    input.attackSign,
  );
  const gkCbLoop =
    passerDepth < 28 &&
    ((input.passer.role === "CB" && input.target.role === "GK") ||
      (input.passer.role === "GK" && input.target.role === "CB"));
  if (!gkCbLoop) {
    return 1;
  }
  if (input.lastPasserId === input.target.playerId) {
    return 0.12;
  }
  return 1;
}

export function passTargetWeight(input: {
  passer: PlayerMatchStatus;
  target: PlayerMatchStatus;
  ownGoal: { x: number; y: number };
  attackSign: 1 | -1;
  kind: PassKind | undefined;
  offside: boolean;
  tactics: TeamTactics;
  defenders?: readonly PlayerMatchStatus[];
  /** Through-ball collection point; defaults to the runner's current feet. */
  spot?: PitchPosition;
  lastPasserId?: PlayerMatchStatus["playerId"] | null;
}): number {
  const { passer, target, kind } = input;
  const dest = input.spot ?? target.position;
  const mouth = {
    x: input.ownGoal.x + input.attackSign * 100,
    y: 50,
  };
  const dist = distance(passer.position, dest);
  const dy = Math.abs(dest.y - passer.position.y);
  const distGoal = distance(dest, mouth);
  const graph = rolePassLink(passer.role, target.role);
  const passerDepth = depthFromOwnGoal(
    passer.position,
    input.ownGoal,
    input.attackSign,
  );
  const feed = widePassFeedWeight({
    passerWide:
      passer.role === "W" ||
      passer.role === "FB" ||
      Math.abs(passer.position.y - 50) > 28,
    passerInFinalThird: passerDepth >= 62,
    targetRole: target.role,
    targetDistGoal: distGoal,
    targetY: target.position.y,
  });
  const offside = input.offside ? 0.22 : 1;
  const space = spaceOnReceiver(nearestOpponentGap(input.defenders, dest));
  const lane = laneOpenFactor(input.defenders, passer.position, dest);
  if (kind === "cross") {
    const box =
      distGoal < 18 && Math.abs(dest.y - 50) < 24 ? 3.2 : 0.35;
    const runner =
      target.role === "ST" || target.role === "AM" || target.role === "W"
        ? 1.4
        : 0.15;
    return graph * box * runner * offside * (0.55 + 0.45 * space);
  }
  if (kind === "through") {
    const targetDepth = depthFromOwnGoal(dest, input.ownGoal, input.attackSign);
    const ahead = targetDepth > passerDepth + 2 ? 1.7 : 0.15;
    const runner =
      target.role === "ST" ||
      target.role === "W" ||
      target.role === "AM" ||
      target.role === "CM"
        ? 1.45
        : target.role === "FB"
          ? 0.95
          : 0.15;
    const range = 1 / (1 + (dist / 18) ** 1.15);
    const bypassed = playersBypassed(
      passer.position,
      dest,
      input.defenders ?? [],
      input.ownGoal,
      input.attackSign,
    );
    if (bypassed < 1) {
      return 0;
    }
    return (
      graph * ahead * runner * offside * range * lane * space * bypassed
    );
  }
  if (kind === "switch") {
    const wide = target.role === "W" || target.role === "FB" ? 1.8 : 0.7;
    return graph * wide * (dy / 40) * (1 / (1 + dist / 22)) * offside * lane;
  }
  if (kind === "restart" || passer.role === "GK") {
    const short =
      target.role === "CB" || target.role === "FB" || target.role === "DM";
    const long = target.role === "W" || target.role === "ST";
    const tempo = input.tactics.tempo / 100;
    const recycle = recyclePenalty({
      passer,
      target,
      lastPasserId: input.lastPasserId,
      ownGoal: input.ownGoal,
      attackSign: input.attackSign,
    });
    return (
      graph *
      (short ? 3.2 : long ? 0.9 + tempo : 0.25) *
      (1 / (1 + dist / (short ? 10 : 22))) *
      recycle *
      space
    );
  }
  const targetDepth = depthFromOwnGoal(
    target.position,
    input.ownGoal,
    input.attackSign,
  );
  const drop = passerDepth - targetDepth;
  const passerToGoal = distance(passer.position, mouth);
  const attacker =
    passer.role === "ST" ||
    passer.role === "W" ||
    passer.role === "AM" ||
    passer.role === "CM";
  const retreat =
    attacker && passerToGoal < 28 && drop > 10
      ? clamp(1 - (drop - 10) / 22, 0.1, 1)
      : 1;
  const recycle = recyclePenalty({
    passer,
    target,
    lastPasserId: input.lastPasserId,
    ownGoal: input.ownGoal,
    attackSign: input.attackSign,
  });
  return (
    graph *
    feed *
    shortRangeFactor(dist) *
    offside *
    retreat *
    recycle *
    space *
    lane
  );
}

type PassChoice = {
  target: PlayerMatchStatus;
  kind: PassKind | undefined;
  spot: PitchPosition;
};

export function pickPassTarget(
  state: MatchState,
  passer: PlayerMatchStatus,
  kind: PassKind | undefined,
): {
  target: PlayerMatchStatus;
  kind: PassKind;
  rng: MatchState["rng"];
  spot: PitchPosition;
} {
  const teammates = onPitchFor(state.players, passer.teamId).filter(
    (player) => player.playerId !== passer.playerId,
  );
  const outfield = teammates.filter((player) => player.role !== "GK");
  const tactics =
    passer.teamId === state.homeTeamId ? state.homeTactics : state.awayTactics;
  const ownGoal =
    passer.teamId === state.homeTeamId ? { x: 0, y: 50 } : { x: 100, y: 50 };
  const attackSign = attackingSign(state.homeTeamId, passer.teamId);
  const defendId =
    passer.teamId === state.homeTeamId ? state.awayTeamId : state.homeTeamId;
  const defenders = onPitchFor(state.players, defendId);
  const pool =
    kind === "cross" || kind === "through"
      ? outfield.length > 0
        ? outfield
        : teammates
      : teammates;
  if (pool.length === 0) {
    throw new Error("No pass target on the pitch");
  }
  const options: PassChoice[] = [];
  for (const player of pool) {
    if (kind !== "through") {
      options.push({
        target: player,
        kind,
        spot: player.position,
      });
    }
    if (
      (kind === undefined || kind === "through") &&
      player.role !== "GK" &&
      passer.role !== "GK"
    ) {
      const lead = throughLeadSpot({
        passer,
        runner: player,
        ownGoal,
        attackSign,
        defenders,
        homeTeamId: state.homeTeamId,
      });
      if (lead) {
        options.push({
          target: player,
          kind: "through",
          spot: lead.spot,
        });
      }
    }
  }
  if (options.length === 0) {
    options.push({
      target: pool[0]!,
      kind,
      spot: pool[0]!.position,
    });
  }
  const scored = options.map((option) => ({
    item: option,
    weight: passTargetWeight({
      passer,
      target: option.target,
      ownGoal,
      attackSign,
      kind: option.kind,
      tactics,
      defenders,
      spot: option.spot,
      lastPasserId: state.lastPasserId,
      offside: isOffsideReceiver({
        receiver: option.target.position,
        ball: passer.position,
        defenders,
        attackingTeamId: passer.teamId,
        homeTeamId: state.homeTeamId,
      }),
    }),
  }));
  const best = scored.reduce((max, entry) => Math.max(max, entry.weight), 0);
  const picked = pickWeighted(
    state.rng,
    scored.map((entry) => ({
      item: entry.item,
      weight: entry.weight >= best * 0.42 ? entry.weight : 0,
    })),
  );
  return {
    target: picked.item.target,
    kind: inferKind(passer, picked.item.target, picked.item.kind),
    rng: picked.rng,
    spot: picked.item.spot,
  };
}

export function passKindForAction(
  action: "pass" | "cross" | "through" | "switch",
  carrier: PlayerMatchStatus,
  ownGoal: { x: number; y: number },
  attackSign: 1 | -1,
): PassKind | undefined {
  if (action === "cross") {
    return "cross";
  }
  if (action === "through") {
    return "through";
  }
  if (action === "switch") {
    return "switch";
  }
  if (isGoalKickSituation(carrier, ownGoal, attackSign)) {
    return "restart";
  }
  return undefined;
}

/** On for a pass: near enough, not offside, not a long drop to the back. */
export function countUsefulOutlets(
  passer: PlayerMatchStatus,
  teammates: readonly PlayerMatchStatus[],
  ownGoal: { x: number; y: number },
  attackSign: 1 | -1,
  defenders: readonly PlayerMatchStatus[],
  homeTeamId: TeamId,
): number {
  const passerDepth = depthFromOwnGoal(passer.position, ownGoal, attackSign);
  let count = 0;
  for (const target of teammates) {
    if (target.role === "GK") {
      continue;
    }
    if (distance(passer.position, target.position) > 24) {
      continue;
    }
    const drop =
      passerDepth - depthFromOwnGoal(target.position, ownGoal, attackSign);
    if (drop > 10) {
      continue;
    }
    if (
      isOffsideReceiver({
        receiver: target.position,
        ball: passer.position,
        defenders,
        attackingTeamId: passer.teamId,
        homeTeamId,
      })
    ) {
      continue;
    }
    count += 1;
  }
  return count;
}
