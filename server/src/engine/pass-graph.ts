import type {
  MatchState,
  PassKind,
  PlayerMatchStatus,
  PlayerRole,
  TeamId,
  TeamTactics,
} from "@fussballmanager/shared";
import { pickWeighted } from "@fussballmanager/shared";
import {
  attackingSign,
  distance,
  onPitchFor,
} from "./helpers.ts";
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
}): number {
  if (!input.passerWide) {
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

export function passTargetWeight(input: {
  passer: PlayerMatchStatus;
  target: PlayerMatchStatus;
  ownGoal: { x: number; y: number };
  attackSign: 1 | -1;
  kind: PassKind | undefined;
  offside: boolean;
  tactics: TeamTactics;
}): number {
  const { passer, target, kind } = input;
  const mouth = {
    x: input.ownGoal.x + input.attackSign * 100,
    y: 50,
  };
  const dist = distance(passer.position, target.position);
  const dy = Math.abs(target.position.y - passer.position.y);
  const distGoal = distance(target.position, mouth);
  const graph = rolePassLink(passer.role, target.role);
  const feed = widePassFeedWeight({
    passerWide:
      passer.role === "W" ||
      passer.role === "FB" ||
      Math.abs(passer.position.y - 50) > 28,
    targetRole: target.role,
    targetDistGoal: distGoal,
    targetY: target.position.y,
  });
  const offside = input.offside ? 0.22 : 1;
  if (kind === "cross") {
    const box =
      distGoal < 18 && Math.abs(target.position.y - 50) < 24 ? 3.2 : 0.35;
    const runner =
      target.role === "ST" || target.role === "AM" || target.role === "W"
        ? 1.4
        : 0.15;
    return graph * box * runner * offside;
  }
  if (kind === "through") {
    const passerDepth = depthFromOwnGoal(
      passer.position,
      input.ownGoal,
      input.attackSign,
    );
    const targetDepth = depthFromOwnGoal(
      target.position,
      input.ownGoal,
      input.attackSign,
    );
    const ahead = targetDepth > passerDepth + 4 ? 1.6 : 0.2;
    const runner =
      target.role === "ST" ||
      target.role === "W" ||
      target.role === "AM" ||
      target.role === "CM"
        ? 1.3
        : 0.2;
    return graph * ahead * runner * offside * (1 / (1 + dist / 14));
  }
  if (kind === "switch") {
    const wide = target.role === "W" || target.role === "FB" ? 1.8 : 0.7;
    return graph * wide * (dy / 40) * (1 / (1 + dist / 22)) * offside;
  }
  if (kind === "restart" || passer.role === "GK") {
    const short =
      target.role === "CB" || target.role === "FB" || target.role === "DM";
    const long = target.role === "W" || target.role === "ST";
    const tempo = input.tactics.tempo / 100;
    return (
      graph *
      (short ? 3.2 : long ? 0.9 + tempo : 0.25) *
      (1 / (1 + dist / (short ? 10 : 22)))
    );
  }
  const passerDepth = depthFromOwnGoal(
    passer.position,
    input.ownGoal,
    input.attackSign,
  );
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
  return graph * feed * (1 / (1 + dist / 8)) * offside * (dy > 34 ? 1.25 : 1) * retreat;
}

export function pickPassTarget(
  state: MatchState,
  passer: PlayerMatchStatus,
  kind: PassKind | undefined,
): { target: PlayerMatchStatus; kind: PassKind; rng: MatchState["rng"] } {
  const teammates = onPitchFor(state.players, passer.teamId).filter(
    (player) => player.playerId !== passer.playerId,
  );
  const outfield = teammates.filter((player) => player.role !== "GK");
  const pool =
    kind === "restart" || passer.role === "GK"
      ? teammates
      : outfield.length > 0
        ? outfield
        : teammates;
  if (pool.length === 0) {
    throw new Error("No pass target on the pitch");
  }
  const tactics =
    passer.teamId === state.homeTeamId ? state.homeTactics : state.awayTactics;
  const ownGoal =
    passer.teamId === state.homeTeamId ? { x: 0, y: 50 } : { x: 100, y: 50 };
  const attackSign = attackingSign(state.homeTeamId, passer.teamId);
  const defendId =
    passer.teamId === state.homeTeamId ? state.awayTeamId : state.homeTeamId;
  const defenders = onPitchFor(state.players, defendId);
  const picked = pickWeighted(
    state.rng,
    pool.map((player) => ({
      item: player,
      weight: Math.max(
        0.01,
        passTargetWeight({
          passer,
          target: player,
          ownGoal,
          attackSign,
          kind,
          tactics,
          offside: isOffsideReceiver({
            receiver: player.position,
            ball: passer.position,
            defenders,
            attackingTeamId: passer.teamId,
            homeTeamId: state.homeTeamId,
          }),
        }),
      ),
    })),
  );
  return {
    target: picked.item,
    kind: inferKind(passer, picked.item, kind),
    rng: picked.rng,
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
