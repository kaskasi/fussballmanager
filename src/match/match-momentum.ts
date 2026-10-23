/** Live momentum (design.md §9.15): threat per team and game minute, read from frames, not positions. */
import type { MatchClock, MatchSideStats, MatchViewFrame } from "@fussballmanager/shared";
import { ballZone } from "./pitch-zone.ts";

export const MOMENTUM_WEIGHTS = {
  /** One engine tick in possession with the ball in the attacking third. */
  attackingPossession: 1,
  shot: 3,
  shotInBox: 5,
  corner: 2,
  goal: 6,
} as const;

/** EWMA weight of the newest minute; the rest carries over. */
export const MOMENTUM_SMOOTHING = 0.5;

export type MomentumBucket = {
  /** Display label, e.g. "45+2" or "67". */
  label: string;
  home: number;
  away: number;
};

export type MomentumSeries = {
  /** Smoothed threat per minute, from kick-off up to the current minute. */
  buckets: MomentumBucket[];
  /** Minutes of the whole match, so the chart's width never rescales. */
  totalBuckets: number;
  /** Index of the first second-half minute, or null if the match has not reached it. */
  secondHalfStart: number | null;
};

type Side = "home" | "away";
type Bucket = { label: string; home: number; away: number };

/** Penalty box: 16.5 m deep and 40.3 m wide on a 105 × 68 m pitch, in 0–100 pitch units. */
function inPenaltyBox(frame: MatchViewFrame, side: Side): boolean {
  const depth = side === "home" ? frame.ball.x : 100 - frame.ball.x;
  return depth >= 84.3 && frame.ball.y >= 20.4 && frame.ball.y <= 79.6;
}

function minuteKey(clock: MatchClock): string {
  return `${clock.period}:${clock.minute}:${clock.stoppageMinute}`;
}

function minuteLabel(clock: MatchClock): string {
  return clock.stoppageMinute > 0 ? `${clock.minute}+${clock.stoppageMinute}` : `${clock.minute}`;
}

function delta(now: MatchSideStats, before: MatchSideStats | undefined, key: "shots" | "corners" | "goals"): number {
  return Math.max(0, now[key] - (before?.[key] ?? 0));
}

/** Raw threat per minute bucket for every frame of the match, plus each frame's bucket index. */
export function momentumBuckets(
  frames: readonly MatchViewFrame[],
  homeTeamId: string,
): { buckets: Bucket[]; frameBucket: number[]; secondHalfStart: number | null } {
  const buckets: Bucket[] = [];
  const frameBucket: number[] = [];
  let secondHalfStart: number | null = null;
  let lastKey = "";
  let previous: MatchViewFrame | undefined;

  for (const frame of frames) {
    const key = minuteKey(frame.clock);
    if (key !== lastKey && frame.clock.period !== "full_time") {
      buckets.push({ label: minuteLabel(frame.clock), home: 0, away: 0 });
      if (secondHalfStart === null && frame.clock.period === "second_half") {
        secondHalfStart = buckets.length - 1;
      }
      lastKey = key;
    }
    const index = Math.max(0, buckets.length - 1);
    frameBucket.push(index);
    const bucket = buckets[index];

    if (bucket) {
      const newTick = !previous || previous.seq !== frame.seq;
      if (newTick && frame.possessionTeamId) {
        const side: Side = frame.possessionTeamId === homeTeamId ? "home" : "away";
        const { third } = ballZone(frame.ball, frame.possessionTeamId, homeTeamId);
        if (third === "attacking") bucket[side] += MOMENTUM_WEIGHTS.attackingPossession;
      }
      for (const side of ["home", "away"] as const) {
        const now = frame.stats[side];
        const before = previous?.stats[side];
        const shots = delta(now, before, "shots");
        if (shots > 0) {
          const weight = inPenaltyBox(frame, side) ? MOMENTUM_WEIGHTS.shotInBox : MOMENTUM_WEIGHTS.shot;
          bucket[side] += shots * weight;
        }
        bucket[side] += delta(now, before, "corners") * MOMENTUM_WEIGHTS.corner;
        bucket[side] += delta(now, before, "goals") * MOMENTUM_WEIGHTS.goal;
      }
    }
    previous = frame;
  }

  return { buckets, frameBucket, secondHalfStart };
}

/** EWMA over minutes; a minute without threat lets the bar fade instead of dropping to zero. */
export function smoothMomentum(buckets: readonly Bucket[], alpha = MOMENTUM_SMOOTHING): MomentumBucket[] {
  let home = 0;
  let away = 0;
  return buckets.map((bucket) => {
    home = alpha * bucket.home + (1 - alpha) * home;
    away = alpha * bucket.away + (1 - alpha) * away;
    return { label: bucket.label, home, away };
  });
}

/**
 * Momentum up to and including `frameIndex`. Frames after it never count, also within the
 * current minute, so the bars only show what the stream has already told.
 */
export function momentumSeries(
  frames: readonly MatchViewFrame[],
  homeTeamId: string,
  frameIndex: number,
): MomentumSeries {
  const whole = momentumBuckets(frames, homeTeamId);
  if (frameIndex < 0 || frames.length === 0) {
    return { buckets: [], totalBuckets: whole.buckets.length, secondHalfStart: null };
  }
  const upto = Math.min(frameIndex, frames.length - 1);
  const sofar = momentumBuckets(frames.slice(0, upto + 1), homeTeamId);
  return {
    buckets: smoothMomentum(sofar.buckets),
    totalBuckets: whole.buckets.length,
    secondHalfStart: sofar.secondHalfStart,
  };
}

/** Share of threat in the last `window` minutes (0–1 for home), or null when nobody attacked. */
export function recentMomentumShare(buckets: readonly MomentumBucket[], window = 10): number | null {
  const recent = buckets.slice(-window);
  const home = recent.reduce((sum, bucket) => sum + bucket.home, 0);
  const away = recent.reduce((sum, bucket) => sum + bucket.away, 0);
  return home + away > 0 ? home / (home + away) : null;
}
