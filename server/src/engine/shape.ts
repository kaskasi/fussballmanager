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

/** A defender this close to the ball's depth (or past it) is recovering, not holding shape. */
const RECOVERY_MARGIN = 6;
/** Recovery runs cover ground at sprint pace: a carrier must not outrun the back line every time. */
const RECOVERY_SPRINT = 2.4;

/** Late runs into the box are sprints too. */
const ARRIVAL_SPRINT = 2.2;

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

/** Formation home-lane, stretched by the width slider. 50 keeps the slot. */
export function widenedY(homeY: number, width: number): number {
  const pinch = clamp(width, 0, 100) / 50;
  return clamp(50 + (homeY - 50) * (0.72 + 0.28 * pinch), 4, 96);
}

/** Formation home-lane, not live position — otherwise the pack ratchets onto the ball. */
export function channelY(
  player: PlayerMatchStatus,
  tactics: TeamTactics,
): number {
  let home = 50;
  if (player.slot) {
    const slot = getFormation(tactics.formation).find(
      (entry) => entry.id === player.slot,
    );
    if (slot) {
      home = slot.homePosition.y;
    }
  } else if (player.role === "W" || player.role === "FB") {
    home = isRightChannel(player) ? 84 : 16;
  } else if (player.role === "CM") {
    home = isRightChannel(player) ? 68 : 32;
  } else if (player.role === "CB") {
    home = isRightChannel(player) ? 62 : 38;
  }
  if (player.role === "GK") {
    return 50;
  }
  return widenedY(home, tactics.width);
}

/** How far this player may sit off the slot before shape reels them in. */
export function strayLeash(fluidity: number, role: PlayerRole): number {
  if (role === "GK") {
    return 3.5;
  }
  return 0.45 + (clamp(fluidity, 0, 100) / 100) * 10;
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
  const flank = flankRunDepth(player, ball, ownGoal, attackSign, tactics);
  if (flank !== null && flank > depth) {
    // Wide players hold the touchline and get up it to cross.
    return atDepth(ownGoal, attackSign, flank, target.y);
  }
  const pushed = secondWaveDepth(player, ball, ownGoal, attackSign, tactics);
  if (pushed !== null) {
    // Arrive at the edge of the box, leaning toward the ball's channel.
    const inside = player.role === "W" ? 0.5 : 0.15;
    const y = clamp(target.y * (0.75 - inside) + ball.y * 0.25 + 50 * inside, 20, 80);
    return atDepth(ownGoal, attackSign, Math.max(depth, pushed), y);
  }
  return atDepth(ownGoal, attackSign, depth, target.y);
}

/**
 * Ball in the attacking half: wide wingers, wide midfielders and overlapping
 * full-backs push up the flank, so attacks reach the byline and get crossed.
 */
export function flankRunDepth(
  player: PlayerMatchStatus,
  ball: PitchPosition,
  ownGoal: PitchPosition,
  attackSign: 1 | -1,
  tactics: TeamTactics,
): number | null {
  const ballDepth = depthFromOwnGoal(ball, ownGoal, attackSign);
  if (ballDepth < 55) {
    return null;
  }
  const wideWinger = player.role === "W" && wideDutyFor(player, tactics) === "wide";
  const overlap =
    player.role === "FB" &&
    !isPyramid(tactics) &&
    fullbackDutyFor(player, tactics) === "overlap";
  if (!wideWinger && !overlap) {
    return null;
  }
  return clamp(ballDepth + (wideWinger ? 6 : -2), 50, wideWinger ? 86 : 80);
}

/**
 * Ball in the final third: box-to-box mids, mezzalas, tens and inverted
 * wingers step up behind the striker, so shots do not all come from the 9
 * (real teams: strikers take roughly a third of the shots).
 */
export function secondWaveDepth(
  player: PlayerMatchStatus,
  ball: PitchPosition,
  ownGoal: PitchPosition,
  attackSign: 1 | -1,
  tactics: TeamTactics,
): number | null {
  const ballDepth = depthFromOwnGoal(ball, ownGoal, attackSign);
  if (ballDepth < 60) {
    return null;
  }
  const arrives =
    player.role === "AM" ||
    (player.role === "CM" && cmDutyFor(player, tactics) !== "playmaker") ||
    (player.role === "W" && wideDutyFor(player, tactics) === "invert");
  if (!arrives) {
    return null;
  }
  const lag = 5;
  return clamp(ballDepth - lag, 50, player.role === "CM" ? 80 : 82);
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
      return atDepth(ownGoal, attackSign, 34, widenedY(right ? 76 : 24, tactics.width));
    }
    return atDepth(
      ownGoal,
      attackSign,
      68 + (tactics.width - 50) * 0.08,
      widenedY(right ? 90 : 10, tactics.width),
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
        widenedY(right ? 82 : 18, tactics.width),
      );
    }
    return atDepth(
      ownGoal,
      attackSign,
      wingSlot ? 54 : 72 + (tactics.width - 50) * 0.1,
      widenedY(right ? 90 : 10, tactics.width),
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
    const hug = wide
      ? widenedY(right ? 88 : 12, tactics.width)
      : widenedY(right ? 82 : 18, tactics.width);
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
          y = widenedY(y >= 50 ? 90 : 10, tactics.width);
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
        y = widenedY(y >= 50 ? 90 : 10, tactics.width);
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
    const secondWave =
      !defending &&
      secondWaveDepth(player, state.ball, ownGoal, teamSign, attackTactics) !== null;
    if (
      !occupiedBox &&
      !secondWave &&
      (player.role === "CB" ||
        player.role === "W" ||
        player.role === "FB")
    ) {
      const lane = channelY(player, teamTactics);
      const fluid = clamp(teamTactics.fluidity, 0, 100) / 100;
      const hold =
        (player.role === "CB" ||
        (player.role === "FB" && isPyramid(teamTactics))
          ? 0.7
          : 0.4) *
        (1 - fluid * 0.55);
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
    // Back line and midfield caught upfield sprint goal-side; forwards may jog.
    const recovering =
      defending &&
      lineDuty(player.role) !== "attack" &&
      player.role !== "GK" &&
      depthFromOwnGoal(state.ball, ownGoal, teamSign) <
        depthFromOwnGoal(player.position, ownGoal, teamSign) + RECOVERY_MARGIN;
    // Second-wave runners sprint to arrive while the attack is still on.
    const arriving =
      !defending &&
      secondWaveDepth(player, state.ball, ownGoal, teamSign, attackTactics) !== null &&
      depthFromOwnGoal(target, ownGoal, teamSign) >
        depthFromOwnGoal(player.position, ownGoal, teamSign) + 2;
    const maxStep =
      offBallMaxStep(player.attributes.pace) *
      (recovering ? RECOVERY_SPRINT : lost && defending ? 0.35 : 1) *
      (arriving ? ARRIVAL_SPRINT : 1) *
      (beaten ? 0.4 : 1) *
      (offside ? 2.4 : 1);
    const dist = distance(player.position, target);
    const leash =
      offside || occupiedBox ? 0 : strayLeash(teamTactics.fluidity, player.role);
    const slack = Math.max(0, dist - leash);
    if (slack < 0.35) {
      return player;
    }
    const t = Math.min(maxStep, slack) / dist;
    return { ...player, position: lerp(player.position, target, t) };
  });
}
