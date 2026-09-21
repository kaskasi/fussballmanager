import type {
  CentreMidDuty,
  FullbackDuty,
  HoldingDuty,
  MatchState,
  PitchPosition,
  PlayerId,
  PlayerMatchStatus,
  PlayerRole,
  StrikerDuty,
  TeamTactics,
  WideDuty,
} from "@fussballmanager/shared";
import {
  attackingSign,
  clamp,
  clampPitch,
  distance,
  goalMouth,
  lerp,
  onPitchFor,
} from "./helpers.ts";
import { inGainedBall, inLostBall } from "./moments.ts";

export type LineDuty = "gk" | "defend" | "mid" | "attack";

/** Opposing 18-yard box starts here, measured from own goal (pitch units). */
const OPP_BOX_DEPTH = 83;
const HALF_WAY = 50;

/** Pace is a nudge, not a 2× first-to-the-ball cheat. */
export function offBallMaxStep(pace: number): number {
  return 3.45 + (clamp(pace, 0, 100) / 100) * 1.1;
}

export function lineDuty(role: PlayerRole): LineDuty {
  switch (role) {
    case "GK":
      return "gk";
    case "CB":
    case "FB":
      return "defend";
    case "DM":
    case "CM":
      return "mid";
    case "AM":
    case "W":
    case "ST":
      return "attack";
    default: {
      const _never: never = role;
      return _never;
    }
  }
}

export function fullbackDutyFor(
  player: PlayerMatchStatus,
  tactics: TeamTactics,
): FullbackDuty {
  if (player.slot === "RB") {
    return tactics.fullbackDuty.RB;
  }
  if (player.slot === "LB") {
    return tactics.fullbackDuty.LB;
  }
  return player.position.y >= 50
    ? tactics.fullbackDuty.RB
    : tactics.fullbackDuty.LB;
}

function isRightChannel(player: PlayerMatchStatus): boolean {
  return (
    player.slot === "RB" ||
    player.slot === "RCB" ||
    player.slot === "RCM" ||
    player.slot === "RW" ||
    player.slot === "RM" ||
    player.slot === "RST" ||
    (!player.slot && player.position.y >= 50)
  );
}

export function dmDutyFor(tactics: TeamTactics): HoldingDuty {
  return tactics.dmDuty;
}

export function cmDutyFor(
  player: PlayerMatchStatus,
  tactics: TeamTactics,
): CentreMidDuty {
  if (player.slot === "RCM") {
    return tactics.cmDuty.RCM;
  }
  if (player.slot === "LCM") {
    return tactics.cmDuty.LCM;
  }
  return isRightChannel(player) ? tactics.cmDuty.RCM : tactics.cmDuty.LCM;
}

export function wideDutyFor(
  player: PlayerMatchStatus,
  tactics: TeamTactics,
): WideDuty {
  if (
    player.slot === "RW" ||
    player.slot === "RM" ||
    player.slot === "RB"
  ) {
    return tactics.wideDuty.right;
  }
  if (
    player.slot === "LW" ||
    player.slot === "LM" ||
    player.slot === "LB"
  ) {
    return tactics.wideDuty.left;
  }
  return isRightChannel(player) ? tactics.wideDuty.right : tactics.wideDuty.left;
}

export function strikerDutyFor(
  player: PlayerMatchStatus,
  tactics: TeamTactics,
): StrikerDuty {
  if (player.slot === "LST") {
    return tactics.strikerDuty.LST;
  }
  if (player.slot === "RST") {
    return tactics.strikerDuty.RST;
  }
  return tactics.strikerDuty.ST;
}

export function depthFromOwnGoal(
  position: PitchPosition,
  ownGoal: PitchPosition,
  attackSign: 1 | -1,
): number {
  return (position.x - ownGoal.x) * attackSign;
}

/** Depth of the second-last defender from the attacking team's own goal. */
export function offsideLineDepth(
  defenders: readonly PlayerMatchStatus[],
  attackOwnGoal: PitchPosition,
  attackSign: 1 | -1,
): number {
  const depths = defenders
    .map((player) => depthFromOwnGoal(player.position, attackOwnGoal, attackSign))
    .sort((a, b) => b - a);
  return depths[1] ?? depths[0] ?? 100;
}

function stayOnside(
  player: PlayerMatchStatus,
  target: PitchPosition,
  ownGoal: PitchPosition,
  attackSign: 1 | -1,
  defenders: readonly PlayerMatchStatus[],
): PitchPosition {
  if (player.role === "GK") {
    return target;
  }
  const line = offsideLineDepth(defenders, ownGoal, attackSign);
  const depth = depthFromOwnGoal(target, ownGoal, attackSign);
  const shoulder = line + 2.4;
  if (depth <= shoulder) {
    return target;
  }
  return atDepth(ownGoal, attackSign, Math.max(8, shoulder), target.y);
}

export function atDepth(
  ownGoal: PitchPosition,
  attackSign: 1 | -1,
  depth: number,
  y: number,
): PitchPosition {
  return clampPitch({ x: ownGoal.x + attackSign * depth, y });
}

function coverFraction(player: PlayerMatchStatus, tactics?: TeamTactics): number {
  const press = tactics
    ? (tactics.pressing / 100) * (tactics.intensity / 100)
    : 0.5;
  const height = tactics ? tactics.lineHeight / 100 : 0.5;
  const duty = lineDuty(player.role);
  if (duty === "gk") {
    return 0.08;
  }
  if (player.role === "CB") {
    return clamp(0.26 - height * 0.12, 0.12, 0.28);
  }
  if (player.role === "FB") {
    const tucked = tactics && fullbackDutyFor(player, tactics) === "inside";
    return clamp((tucked ? 0.28 : 0.32) - height * 0.1 * press, 0.14, 0.34);
  }
  if (player.role === "DM") {
    return clamp(0.34 - height * 0.1 * press, 0.16, 0.36);
  }
  if (player.role === "CM" && tactics) {
    const job = cmDutyFor(player, tactics);
    const base = job === "playmaker" ? 0.38 : job === "mezzala" ? 0.3 : 0.34;
    return clamp(base - height * 0.12 * press, 0.14, 0.42);
  }
  if (duty === "attack") {
    return clamp(0.05 + (1 - press) * 0.36 + (1 - height) * 0.1, 0.05, 0.48);
  }
  return 0.42;
}

/** Zonal: sit on the ball–goal corridor at your line (def/mid/att). */
export function zonalCoverTarget(
  player: PlayerMatchStatus,
  ball: PitchPosition,
  ownGoal: PitchPosition,
  tactics?: TeamTactics,
): PitchPosition {
  const along = lerp(ball, ownGoal, coverFraction(player, tactics));
  const yMix = lerp(along, { x: along.x, y: player.position.y }, 0.35);
  return clampPitch(yMix);
}

/** Man-mark: stay goal-side of the assigned opponent. */
export function manMarkTarget(
  attacker: PitchPosition,
  ownGoal: PitchPosition,
): PitchPosition {
  return clampPitch(lerp(attacker, ownGoal, 0.18));
}

export function manMarkAssignments(
  defenders: readonly PlayerMatchStatus[],
  attackers: readonly PlayerMatchStatus[],
): Map<PlayerId, PlayerId> {
  const assigned = new Map<PlayerId, PlayerId>();
  const taken = new Set<PlayerId>();
  const outfield = defenders.filter((player) => player.role !== "GK");
  const marks = [...attackers].filter((player) => player.role !== "GK");
  for (const defender of outfield) {
    let best: PlayerMatchStatus | undefined;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const attacker of marks) {
      if (taken.has(attacker.playerId)) {
        continue;
      }
      const dist = distance(defender.position, attacker.position);
      if (dist < bestDist) {
        bestDist = dist;
        best = attacker;
      }
    }
    if (best) {
      assigned.set(defender.playerId, best.playerId);
      taken.add(best.playerId);
    }
  }
  return assigned;
}

export type TriangleSpots = {
  left: PitchPosition;
  right: PitchPosition;
  back: PitchPosition;
};

/** Two forward options + one safe drop: Spanish triangulo around the carrier. */
export function triangleSpots(
  ball: PitchPosition,
  attackSign: 1 | -1,
  width: number,
  gainedBall: boolean,
): TriangleSpots {
  const spread = 7 + (width / 100) * 7;
  const ahead = gainedBall ? 11 : 8;
  return {
    left: clampPitch({
      x: ball.x + attackSign * ahead,
      y: ball.y - spread,
    }),
    right: clampPitch({
      x: ball.x + attackSign * ahead,
      y: ball.y + spread,
    }),
    back: clampPitch({
      x: ball.x - attackSign * 8,
      y: ball.y,
    }),
  };
}

function assignClosest(
  pool: PlayerMatchStatus[],
  spot: PitchPosition,
  used: Set<PlayerId>,
): PlayerId | undefined {
  let best: PlayerMatchStatus | undefined;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const player of pool) {
    if (used.has(player.playerId)) {
      continue;
    }
    const dist = distance(player.position, spot);
    if (dist < bestDist) {
      bestDist = dist;
      best = player;
    }
  }
  if (!best) {
    return undefined;
  }
  used.add(best.playerId);
  return best.playerId;
}

function offersForwardTriangle(
  player: PlayerMatchStatus,
  tactics: TeamTactics,
): boolean {
  if (player.role === "FB") {
    return fullbackDutyFor(player, tactics) === "overlap";
  }
  if (player.role === "CM") {
    return cmDutyFor(player, tactics) !== "playmaker";
  }
  if (player.role === "W" || player.role === "AM") {
    return true;
  }
  if (player.role === "ST") {
    return strikerDutyFor(player, tactics) !== "false_nine";
  }
  return false;
}

function offersBackTriangle(
  player: PlayerMatchStatus,
  tactics: TeamTactics,
): boolean {
  if (player.role === "CB") {
    return true;
  }
  if (player.role === "FB") {
    return fullbackDutyFor(player, tactics) === "inside";
  }
  if (player.role === "DM") {
    return true;
  }
  if (player.role === "CM") {
    return cmDutyFor(player, tactics) === "playmaker";
  }
  if (player.role === "ST") {
    return strikerDutyFor(player, tactics) !== "poacher";
  }
  return false;
}

export function triangleAssignments(
  carrierId: PlayerId,
  teammates: readonly PlayerMatchStatus[],
  spots: TriangleSpots,
  tactics: TeamTactics,
): Map<PlayerId, PitchPosition> {
  const used = new Set<PlayerId>([carrierId]);
  const assigned = new Map<PlayerId, PitchPosition>();
  const forward = teammates.filter((player) => offersForwardTriangle(player, tactics));
  const drop = teammates.filter((player) => offersBackTriangle(player, tactics));
  const leftId = assignClosest(forward, spots.left, used);
  const rightId = assignClosest(forward, spots.right, used);
  const backId = assignClosest(drop, spots.back, used);
  if (leftId) {
    assigned.set(leftId, spots.left);
  }
  if (rightId) {
    assigned.set(rightId, spots.right);
  }
  if (backId) {
    assigned.set(backId, spots.back);
  }
  return assigned;
}

export function keeperTarget(input: {
  duty: TeamTactics["keeperDuty"];
  defending: boolean;
  ball: PitchPosition;
  ownGoal: PitchPosition;
  attackSign: 1 | -1;
  teammates: readonly PlayerMatchStatus[];
}): PitchPosition {
  const ballDepth = depthFromOwnGoal(input.ball, input.ownGoal, input.attackSign);
  const y = clamp(50 * 0.65 + input.ball.y * 0.35, 38, 62);
  if (input.duty === "stay") {
    return atDepth(input.ownGoal, input.attackSign, 7, y);
  }
  if (!input.defending) {
    return atDepth(input.ownGoal, input.attackSign, 14, y);
  }
  const cover = lerp(input.ball, input.ownGoal, 0.12);
  const coverers = input.teammates.filter(
    (player) => player.role === "CB" || player.role === "FB",
  );
  const nearestCover = coverers.reduce((best, player) => {
    const dist = distance(player.position, cover);
    return dist < best ? dist : best;
  }, Number.POSITIVE_INFINITY);
  const throughBall =
    ballDepth < HALF_WAY && nearestCover > 12 && ballDepth > 10;
  const depth = throughBall ? clamp(ballDepth - 3, 12, 46) : 12;
  return atDepth(
    input.ownGoal,
    input.attackSign,
    depth,
    throughBall ? clamp(input.ball.y, 28, 72) : y,
  );
}

function lineDepthBias(tactics: TeamTactics): number {
  return (clamp(tactics.lineHeight, 25, 90) - 50) * 0.32;
}

export function restAttackTarget(
  player: PlayerMatchStatus,
  ball: PitchPosition,
  ownGoal: PitchPosition,
  attackSign: 1 | -1,
  tactics: TeamTactics,
): PitchPosition {
  const target = restAttackTargetAtBase(player, ball, ownGoal, attackSign, tactics);
  if (player.role === "GK") {
    return target;
  }
  const depth =
    depthFromOwnGoal(target, ownGoal, attackSign) + lineDepthBias(tactics);
  return atDepth(ownGoal, attackSign, depth, target.y);
}

function restAttackTargetAtBase(
  player: PlayerMatchStatus,
  ball: PitchPosition,
  ownGoal: PitchPosition,
  attackSign: 1 | -1,
  tactics: TeamTactics,
): PitchPosition {
  const duty = lineDuty(player.role);
  if (duty === "gk") {
    return keeperTarget({
      duty: tactics.keeperDuty,
      defending: false,
      ball,
      ownGoal,
      attackSign,
      teammates: [],
    });
  }
  if (player.role === "CB") {
    return atDepth(ownGoal, attackSign, 22, player.position.y);
  }
  if (player.role === "FB") {
    const job = fullbackDutyFor(player, tactics);
    const right = isRightChannel(player);
    if (job === "inside") {
      return atDepth(ownGoal, attackSign, 34, right ? 62 : 38);
    }
    return atDepth(
      ownGoal,
      attackSign,
      68 + (tactics.width - 50) * 0.08,
      right ? 90 : 10,
    );
  }
  if (player.role === "DM") {
    const depth = dmDutyFor(tactics) === "regista" ? 40 : 30;
    return atDepth(ownGoal, attackSign, depth, 50 * 0.7 + ball.y * 0.3);
  }
  if (player.role === "CM") {
    const job = cmDutyFor(player, tactics);
    const right = isRightChannel(player);
    if (job === "playmaker") {
      return clampPitch({
        x: ball.x - attackSign * 8,
        y: lerp(player.position, ball, 0.45).y,
      });
    }
    if (job === "mezzala") {
      return atDepth(
        ownGoal,
        attackSign,
        depthFromOwnGoal(ball, ownGoal, attackSign) + 6,
        right ? 66 : 34,
      );
    }
    return atDepth(
      ownGoal,
      attackSign,
      depthFromOwnGoal(ball, ownGoal, attackSign) + 2,
      lerp(player.position, ball, 0.3).y,
    );
  }
  if (player.role === "W" || player.role === "AM") {
    const right = isRightChannel(player);
    const wideJob = wideDutyFor(player, tactics);
    const wingSlot = player.slot === "LM" || player.slot === "RM";
    if (player.role === "AM") {
      return atDepth(ownGoal, attackSign, 62, lerp(player.position, ball, 0.4).y);
    }
    if (wideJob === "invert") {
      return atDepth(
        ownGoal,
        attackSign,
        wingSlot ? 52 : 74,
        right ? 64 : 36,
      );
    }
    return atDepth(
      ownGoal,
      attackSign,
      wingSlot ? 54 : 72 + (tactics.width - 50) * 0.1,
      right ? 90 : 10,
    );
  }
  const job = strikerDutyFor(player, tactics);
  if (job === "false_nine") {
    const ballDepth = depthFromOwnGoal(ball, ownGoal, attackSign);
    return atDepth(
      ownGoal,
      attackSign,
      clamp(46 + ballDepth * 0.45, 48, 84),
      lerp({ x: 50, y: 50 }, ball, 0.55).y,
    );
  }
  if (job === "target") {
    return atDepth(ownGoal, attackSign, 72, 50);
  }
  return atDepth(
    ownGoal,
    attackSign,
    86,
    clamp(ball.y * 0.4 + 50 * 0.6, 38, 62),
  );
}

/** CBs and stay-GKs never visit the far box; overlap FBs hug the touchline instead. */
export function clampBackLine(
  player: PlayerMatchStatus,
  target: PitchPosition,
  ownGoal: PitchPosition,
  attackSign: 1 | -1,
  tactics: TeamTactics,
): PitchPosition {
  let depth = depthFromOwnGoal(target, ownGoal, attackSign);
  let y = target.y;
  if (player.role === "GK") {
    const max = tactics.keeperDuty === "sweeper" ? 46 : 12;
    depth = clamp(depth, 4, max);
    y = clamp(y, 28, 72);
  } else if (player.role === "CB") {
    depth = clamp(depth, 8, HALF_WAY + (tactics.lineHeight - 50) * 0.35);
  } else if (player.role === "FB") {
    const job = fullbackDutyFor(player, tactics);
    const line = lineDepthBias(tactics);
    if (job === "inside") {
      depth = clamp(depth, 10, 48 + line);
      y = clamp(y, 28, 72);
    } else {
      depth = Math.min(depth, 78 + Math.max(0, line));
      if (depth > OPP_BOX_DEPTH - 8) {
        y = y >= 50 ? 90 : 10;
      }
    }
  } else if (player.role === "DM") {
    depth = clamp(depth, 18, dmDutyFor(tactics) === "regista" ? 55 : 42);
    y = clamp(y, 32, 68);
  } else if (player.role === "CM") {
    const job = cmDutyFor(player, tactics);
    const max = job === "playmaker" ? 62 : job === "mezzala" ? 80 : 78;
    depth = clamp(depth, 22, max);
  } else if (player.role === "W") {
    const job = wideDutyFor(player, tactics);
    if (job === "wide") {
      depth = Math.min(depth, 80);
      if (depth > OPP_BOX_DEPTH - 8) {
        y = y >= 50 ? 90 : 10;
      }
    } else {
      depth = clamp(depth, 28, 88);
      y = clamp(y, 28, 72);
    }
  } else if (player.role === "ST") {
    const job = strikerDutyFor(player, tactics);
    if (job === "false_nine") {
      depth = clamp(depth, 36, 86);
    } else if (job === "target") {
      depth = clamp(depth, 48, 86);
    } else {
      depth = clamp(depth, 58, 94);
    }
  }
  return atDepth(ownGoal, attackSign, depth, y);
}

function defendingTactics(state: MatchState, teamId: PlayerMatchStatus["teamId"]) {
  return teamId === state.homeTeamId ? state.homeTactics : state.awayTactics;
}

export function applyShape(
  state: MatchState,
  locked: ReadonlySet<PlayerId>,
): PlayerMatchStatus[] {
  if (!state.possessionTeamId) {
    return [...state.players];
  }
  const attackId = state.possessionTeamId;
  const defendId =
    attackId === state.homeTeamId ? state.awayTeamId : state.homeTeamId;
  const attackers = onPitchFor(state.players, attackId);
  const defenders = onPitchFor(state.players, defendId);
  const attackTactics =
    attackId === state.homeTeamId ? state.homeTactics : state.awayTactics;
  const defendTactics = defendingTactics(state, defendId);
  const marks =
    defendTactics.marking === "man"
      ? manMarkAssignments(defenders, attackers)
      : new Map<PlayerId, PlayerId>();
  const sign = attackingSign(state.homeTeamId, attackId);
  const carrier = state.ballCarrierId
    ? attackers.find((player) => player.playerId === state.ballCarrierId)
    : undefined;
  const spots = triangleSpots(
    state.ball,
    sign,
    attackTactics.width,
    inGainedBall(state),
  );
  const triangle = carrier
    ? triangleAssignments(carrier.playerId, attackers, spots, attackTactics)
    : new Map<PlayerId, PitchPosition>();

  return state.players.map((player) => {
    if (!player.onPitch || player.sentOff || locked.has(player.playerId)) {
      return player;
    }
    const defending = player.teamId !== attackId;
    const ownGoal = goalMouth(
      state.homeTeamId,
      player.teamId === state.homeTeamId
        ? state.awayTeamId
        : state.homeTeamId,
    );
    const teamTactics = defending ? defendTactics : attackTactics;
    const teamSign = attackingSign(state.homeTeamId, player.teamId);
    let target: PitchPosition;
    if (player.role === "GK") {
      target = keeperTarget({
        duty: teamTactics.keeperDuty,
        defending,
        ball: state.ball,
        ownGoal,
        attackSign: teamSign,
        teammates: defending ? defenders : attackers,
      });
    } else if (defending) {
      const markedId = marks.get(player.playerId);
      const marked = markedId
        ? state.players.find((candidate) => candidate.playerId === markedId)
        : undefined;
      target =
        defendTactics.marking === "man" && marked
          ? manMarkTarget(marked.position, ownGoal)
          : zonalCoverTarget(player, state.ball, ownGoal, defendTactics);
    } else {
      target =
        triangle.get(player.playerId) ??
        restAttackTarget(
          player,
          state.ball,
          ownGoal,
          teamSign,
          attackTactics,
        );
    }
    target = clampBackLine(player, target, ownGoal, teamSign, teamTactics);
    if (!defending) {
      target = stayOnside(player, target, ownGoal, teamSign, defenders);
    }
    const lost = inLostBall(state, player.teamId);
    const beaten =
      defending &&
      lineDuty(player.role) === "attack" &&
      depthFromOwnGoal(player.position, ownGoal, teamSign) >
        depthFromOwnGoal(state.ball, ownGoal, teamSign) + 10;
    const maxStep =
      offBallMaxStep(player.attributes.pace) *
      (lost && defending ? 0.35 : 1) *
      (beaten ? 0.4 : 1);
    const dist = distance(player.position, target);
    if (dist < 0.4) {
      return player;
    }
    const t = Math.min(1, maxStep / dist);
    return { ...player, position: lerp(player.position, target, t) };
  });
}
