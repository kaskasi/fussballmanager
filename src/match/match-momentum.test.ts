import { describe, expect, it } from "vitest";
import type { MatchPairStats, MatchSideStats, MatchViewFrame } from "@fussballmanager/shared";
import {
  MOMENTUM_WEIGHTS,
  momentumBuckets,
  momentumSeries,
  recentMomentumShare,
  smoothMomentum,
} from "./match-momentum.ts";

const HOME = "home-fc";
const AWAY = "away-fc";

function side(partial: Partial<MatchSideStats> = {}): MatchSideStats {
  return { goals: 0, shots: 0, shotsOnTarget: 0, corners: 0, passes: 0, passesComplete: 0, ...partial } as MatchSideStats;
}

function frame(
  seq: number,
  minute: number,
  opts: {
    x?: number;
    y?: number;
    team?: string | null;
    period?: "first_half" | "second_half" | "full_time";
    stoppage?: number;
    home?: Partial<MatchSideStats>;
    away?: Partial<MatchSideStats>;
  } = {},
): MatchViewFrame {
  const stats: MatchPairStats = { home: side(opts.home), away: side(opts.away) } as MatchPairStats;
  return {
    seq,
    ball: { x: opts.x ?? 50, y: opts.y ?? 50 },
    score: { home: stats.home.goals, away: stats.away.goals },
    possessionTeamId: opts.team === undefined ? HOME : opts.team,
    ballCarrierId: null,
    clock: { period: opts.period ?? "first_half", minute, second: 0, stoppageMinute: opts.stoppage ?? 0 },
    dots: [],
    ballInAir: false,
    cue: null,
    stats,
  } as MatchViewFrame;
}

describe("momentumBuckets", () => {
  it("counts attacking-third possession once per engine tick and per side", () => {
    const { buckets } = momentumBuckets(
      [
        frame(1, 1, { x: 80 }),
        frame(1, 1, { x: 82 }), // synthetic presentation frame, same tick
        frame(2, 1, { x: 50 }),
        frame(3, 1, { x: 20, team: AWAY }), // away attacks towards x = 0
      ],
      HOME,
    );
    expect(buckets).toEqual([{ label: "1", home: 1, away: 1 }]);
  });

  it("weights shots in the box higher, and adds corners and goals from stat deltas", () => {
    const { buckets } = momentumBuckets(
      [
        frame(1, 10, { team: null }),
        frame(2, 10, { team: null, x: 90, home: { shots: 1 } }),
        frame(3, 11, { team: null, x: 60, home: { shots: 2 } }),
        frame(4, 12, { team: null, x: 5, away: { shots: 1, goals: 1, corners: 1 } }),
      ],
      HOME,
    );
    expect(buckets.map((bucket) => bucket.home)).toEqual([MOMENTUM_WEIGHTS.shotInBox, MOMENTUM_WEIGHTS.shot, 0]);
    expect(buckets[2]!.away).toBe(MOMENTUM_WEIGHTS.shotInBox + MOMENTUM_WEIGHTS.goal + MOMENTUM_WEIGHTS.corner);
  });

  it("keeps stoppage time apart and marks the second half", () => {
    const { buckets, secondHalfStart } = momentumBuckets(
      [
        frame(1, 45, { team: null }),
        frame(2, 45, { team: null, stoppage: 1 }),
        frame(3, 45, { team: null, period: "second_half" }),
        frame(4, 90, { team: null, period: "full_time" }),
      ],
      HOME,
    );
    expect(buckets.map((bucket) => bucket.label)).toEqual(["45", "45+1", "45"]);
    expect(secondHalfStart).toBe(2);
  });
});

describe("smoothMomentum", () => {
  it("fades a spike instead of dropping it", () => {
    const smooth = smoothMomentum(
      [
        { label: "1", home: 4, away: 0 },
        { label: "2", home: 0, away: 0 },
      ],
      0.5,
    );
    expect(smooth[0]!.home).toBe(2);
    expect(smooth[1]!.home).toBe(1);
  });
});

describe("momentumSeries", () => {
  const frames = [
    frame(1, 1, { team: null }),
    frame(2, 2, { team: null, x: 95, home: { shots: 1 } }),
    frame(3, 3, { team: null }),
  ];

  it("never reads frames after the current one", () => {
    const series = momentumSeries(frames, HOME, 0);
    expect(series.buckets).toHaveLength(1);
    expect(series.buckets[0]!.home).toBe(0);
    expect(series.totalBuckets).toBe(3);
  });

  it("is empty before kick-off", () => {
    expect(momentumSeries(frames, HOME, -1).buckets).toEqual([]);
  });

  it("reports the recent share of threat", () => {
    const series = momentumSeries(frames, HOME, 2);
    expect(recentMomentumShare(series.buckets)).toBe(1);
    expect(recentMomentumShare([])).toBeNull();
  });
});
