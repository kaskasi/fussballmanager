import {
  getFormation,
  type CentreMidDuty,
  type FullbackDuty,
  type HoldingDuty,
  type MatchState,
  type PitchPosition,
  type PlayerId,
  type PlayerMatchStatus,
  type PlayerRole,
  type StrikerDuty,
  type TeamTactics,
  type WideDuty,
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

function isPyramid(tactics: TeamTactics): boolean {
  return tactics.formation === "2-3-5";
}

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

/** Formation home-lane, not live position — otherwise the pack ratchets onto the ball. */
export function channelY(
  player: PlayerMatchStatus,
  tactics: TeamTactics,
): number {
  if (player.slot) {
    const home = getFormation(tactics.formation).find(
      (entry) => entry.id === player.slot,
    );
    if (home) {
      return home.homePosition.y;
    }
  }
  if (player.role === "W" || player.role === "FB") {
    return isRightChannel(player) ? 84 : 16;
  }
  if (player.role === "CM") {
    return isRightChannel(player) ? 68 : 32;
  }
  if (player.role === "CB") {
    return isRightChannel(player) ? 62 : 38;
  }
  return 50;
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

/** Sit behind the second-last man. Laws flag offside past line + 1.2. */
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
  const shoulder = line - 1.8;
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
    if (tactics && isPyramid(tactics)) {
      return clamp(0.26 - height * 0.12, 0.12, 0.28);
    }
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
  const lane = tactics ? channelY(player, tactics) : player.position.y;
  const yMix = lerp(along, { x: along.x, y: lane }, 0.92);
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
  const spread = 18 + (width / 100) * 10;
  const ahead = gainedBall ? 14 : 11;
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
      x: ball.x - attackSign * 14,
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
  const drop = teammates.filter((player) => offersBackTriangle(player, tactics));
  const backId = assignClosest(drop, spots.back, used);
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
    return atDepth(ownGoal, attackSign, 22, channelY(player, tactics));
  }
  if (player.role === "FB") {
    if (isPyramid(tactics)) {
      return atDepth(ownGoal, attackSign, 20, channelY(player, tactics));
    }
    const job = fullbackDutyFor(player, tactics);
    const right = isRightChannel(player);
    if (job === "inside") {
      return atDepth(ownGoal, attackSign, 34, right ? 76 : 24);
    }
    return atDepth(
      ownGoal,
      attackSign,
      68 + (tactics.width - 50) * 0.08,
      right ? 90 : 10,
    );
  }
  if (player.role === "DM") {
    const depth = isPyramid(tactics)
      ? 32
      : dmDutyFor(tactics) === "regista"
        ? 40
        : 30;
    return atDepth(ownGoal, attackSign, depth, 50 * 0.85 + ball.y * 0.15);
  }
  if (player.role === "CM") {
    const job = cmDutyFor(player, tactics);
    const lane = channelY(player, tactics);
    if (isPyramid(tactics)) {
      return atDepth(
        ownGoal,
        attackSign,
        38,
        lerp({ x: 50, y: lane }, ball, 0.06).y,
      );
    }
    if (job === "playmaker") {
      return atDepth(ownGoal, attackSign, 44, lerp({ x: 50, y: lane }, ball, 0.06).y);
    }
    if (job === "mezzala") {
      return atDepth(ownGoal, attackSign, 64, lane);
    }
    return atDepth(
      ownGoal,
      attackSign,
      52,
      lerp({ x: 50, y: lane }, ball, 0.08).y,
    );
  }
  if (player.role === "W" || player.role === "AM") {
    const right = isRightChannel(player);
    const wideJob = wideDutyFor(player, tactics);
    const wingSlot = player.slot === "LM" || player.slot === "RM";
    const lane = channelY(player, tactics);
    if (player.role === "AM") {
      return atDepth(
        ownGoal,
        attackSign,
        62,
        lerp({ x: 50, y: lane }, ball, 0.14).y,
      );
    }
    if (wideJob === "invert") {
      return atDepth(
        ownGoal,
        attackSign,
        wingSlot ? 52 : 74,
        right ? 82 : 18,
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
  const lane = channelY(player, tactics);
  const inside = player.slot === "LST" || player.slot === "RST";
  if (job === "false_nine") {
    const ballDepth = depthFromOwnGoal(ball, ownGoal, attackSign);
    return atDepth(
      ownGoal,
      attackSign,
      clamp(46 + ballDepth * 0.45, 48, 84),
      lerp({ x: 50, y: inside ? lane : 50 }, ball, 0.08).y,
    );
  }
  if (job === "target") {
    return atDepth(ownGoal, attackSign, 72, inside ? lane : 50);
  }
  return atDepth(
    ownGoal,
    attackSign,
    86,
    inside
      ? lane
      : clamp(ball.y * 0.22 + lane * 0.78, 38, 62),
  );
}

/** Ball wide in the final third: crash the box instead of parking on the D. */
export function occupyBoxTarget(
  player: PlayerMatchStatus,
  ball: PitchPosition,
  ownGoal: PitchPosition,
  attackSign: 1 | -1,
  tactics: TeamTactics,
): PitchPosition | null {
  const depth = depthFromOwnGoal(ball, ownGoal, attackSign);
  if (depth < 66 || Math.abs(ball.y - 50) < 26) {
    return null;
  }
  if (player.role === "ST") {
    const job = strikerDutyFor(player, tactics);
    const sit = job === "false_nine" ? 80 : job === "target" ? 86 : 90;
    const lane = channelY(player, tactics);
    return atDepth(
      ownGoal,
      attackSign,
      sit,
      clamp(lane * 0.82 + ball.y * 0.18, 22, 78),
    );
  }
  if (player.role === "AM") {
    return atDepth(ownGoal, attackSign, 82, 50);
  }
  if (player.role === "W") {
    const right = isRightChannel(player);
    const ballRight = ball.y >= 50;
    if (right === ballRight) {
      return null;
    }
    return atDepth(ownGoal, attackSign, 84, ballRight ? 42 : 58);
  }
  if (player.role === "CM" && cmDutyFor(player, tactics) === "mezzala") {
    return atDepth(ownGoal, attackSign, 76, clamp(ball.y * 0.3 + 50 * 0.7, 40, 60));
  }
  return null;
}

/** Outfield attackers defend in lanes, not by collapsing onto the ball. */
export function restDefendTarget(
  player: PlayerMatchStatus,
  ball: PitchPosition,
  ownGoal: PitchPosition,
  attackSign: 1 | -1,
  tactics: TeamTactics,
): PitchPosition {
  const lane = channelY(player, tactics);
  const y = lerp({ x: 50, y: lane }, ball, 0.06).y;
  const line = isPyramid(tactics)
    ? lineDepthBias(tactics) * 0.45
    : lineDepthBias(tactics);
  if (player.role === "W") {
    const right = isRightChannel(player);
    const wide = wideDutyFor(player, tactics) === "wide";
    const hug = wide ? (right ? 88 : 12) : (right ? 82 : 18);
    return atDepth(
      ownGoal,
      attackSign,
      50 + line,
      lerp({ x: 50, y: hug }, ball, 0.08).y,
    );
  }
  if (player.role === "AM") {
    return atDepth(ownGoal, attackSign, 48 + line, y);
  }
  if (player.role === "ST") {
    return atDepth(ownGoal, attackSign, 56 + line, y);
  }
  if (player.role === "CM") {
    return atDepth(ownGoal, attackSign, 40 + line, y);
  }
  return atDepth(ownGoal, attackSign, 34 + line, y);
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
    if (isPyramid(tactics)) {
      depth = clamp(depth, 8, HALF_WAY + (tactics.lineHeight - 50) * 0.35);
      y = clamp(y, 28, 72);
    } else {
      const job = fullbackDutyFor(player, tactics);
      const line = lineDepthBias(tactics);
      if (job === "inside") {
        depth = clamp(depth, 10, 48 + line);
        y = clamp(y, 20, 80);
      } else {
        depth = Math.min(depth, 78 + Math.max(0, line));
        if (depth > OPP_BOX_DEPTH - 8) {
          y = y >= 50 ? 90 : 10;
        }
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
      y = clamp(y, 12, 88);
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
  const trianglePool = attackers.filter(
    (player) => distance(player.position, state.ball) <= 16,
  );
  const triangle = carrier
    ? triangleAssignments(carrier.playerId, trianglePool, spots, attackTactics)
    : new Map<PlayerId, PitchPosition>();

  return state.players.map((player) => {
    if (!player.onPitch || player.sentOff) {
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
    const involved = locked.has(player.playerId);
    const carrierLocked =
      involved && player.playerId === state.ballCarrierId;
    if (carrierLocked) {
      return player;
    }
    let occupiedBox = false;
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
          : player.role === "CB" ||
              player.role === "FB" ||
              player.role === "DM"
            ? zonalCoverTarget(player, state.ball, ownGoal, defendTactics)
            : restDefendTarget(
                player,
                state.ball,
                ownGoal,
                teamSign,
                defendTactics,
              );
    } else {
      const box = occupyBoxTarget(
        player,
        state.ball,
        ownGoal,
        teamSign,
        attackTactics,
      );
      occupiedBox = box !== null;
      target =
        box ??
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
    if (
      !occupiedBox &&
      (player.role === "CB" ||
        player.role === "W" ||
        player.role === "FB")
    ) {
      const lane = channelY(player, teamTactics);
      const hold =
        player.role === "CB" ||
        (player.role === "FB" && isPyramid(teamTactics))
          ? 0.7
          : 0.4;
      target = {
        ...target,
        y: lerp(target, { x: target.x, y: lane }, hold).y,
      };
    }
    if (involved) {
      target = { x: player.position.x, y: target.y };
    }
    if (!defending && !carrierLocked) {
      target = stayOnside(player, target, ownGoal, teamSign, defenders);
    }
    const lost = inLostBall(state, player.teamId);
    const beaten =
      defending &&
      lineDuty(player.role) === "attack" &&
      depthFromOwnGoal(player.position, ownGoal, teamSign) >
        depthFromOwnGoal(state.ball, ownGoal, teamSign) + 10;
    const offside =
      !defending &&
      player.role !== "GK" &&
      depthFromOwnGoal(player.position, ownGoal, teamSign) >
        offsideLineDepth(defenders, ownGoal, teamSign) - 1.2;
    const maxStep =
      offBallMaxStep(player.attributes.pace) *
      (lost && defending ? 0.35 : 1) *
      (beaten ? 0.4 : 1) *
      (offside ? 2.4 : 1);
    const dist = distance(player.position, target);
    if (dist < 0.4) {
      return player;
    }
    const t = Math.min(1, maxStep / dist);
    return { ...player, position: lerp(player.position, target, t) };
  });
}
