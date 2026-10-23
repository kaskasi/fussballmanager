/**
 * ADR 0003 — target bands for one simulated match, averaged over many seeds.
 * Real-football anchors (top leagues, rounded): ~2.8 goals, ~25 shots,
 * ~80 % passes, ~22 fouls, ~4 yellows, ~10 corners, hat-trick in ~3 % of games.
 * Bands are wider than reality on purpose: amateur and elite worlds share them.
 */
export type CalibrationMetricId =
  | "goals"
  | "shots"
  | "onTarget"
  | "conversion"
  | "topShooterShare"
  | "hatTrickRate"
  | "passCompletion"
  | "fouls"
  | "yellows"
  | "reds"
  | "corners"
  | "drawRate";

export type Band = { min: number; max: number };

export const CALIBRATION_BANDS: Record<CalibrationMetricId, Band> = {
  goals: { min: 2.4, max: 3.6 },
  shots: { min: 20, max: 30 },
  onTarget: { min: 7, max: 11.5 },
  conversion: { min: 0.08, max: 0.14 },
  topShooterShare: { min: 0, max: 0.45 },
  hatTrickRate: { min: 0, max: 0.06 },
  passCompletion: { min: 0.65, max: 0.82 },
  fouls: { min: 16, max: 26 },
  yellows: { min: 2.5, max: 5 },
  reds: { min: 0, max: 0.3 },
  corners: { min: 8, max: 12 },
  drawRate: { min: 0.15, max: 0.35 },
};
