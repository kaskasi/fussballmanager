import type { BodyRegion } from "./medical-symptoms.ts";

function hashSeed(parts: readonly (string | number)[]): number {
  let hash = 0;
  for (const part of parts) {
    const text = String(part);
    for (let index = 0; index < text.length; index++) {
      hash = Math.imul(hash ^ text.charCodeAt(index), 0x9e3779b1);
    }
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type PhysioAssistMinigame = "xray_slide" | "rehab_timing";

/** 50/50 which assist minigame opens in the Mithelfen modal (stable per player/week). */
export function physioAssistMinigame(
  masterSeed: number,
  season: number,
  week: number,
  playerId: string,
): PhysioAssistMinigame {
  const roll = mulberry32(hashSeed([masterSeed, season, week, playerId, "physio-assist-game"]))();
  return roll < 0.5 ? "xray_slide" : "rehab_timing";
}

/** Horizontal table — player head-left, feet-right; lamp moves on X (0–100). */
export const BODY_REGION_LAMP_X: Record<BodyRegion, number> = {
  back: 22,
  groin: 34,
  thigh_l: 44,
  thigh_r: 50,
  knee_l: 58,
  knee_r: 64,
  ankle_l: 76,
  ankle_r: 80,
  foot_l: 88,
  foot_r: 92,
};

/** Mark on body cross-axis (vertical in side view). */
export const BODY_REGION_MARK_Y: Record<BodyRegion, number> = {
  back: 42,
  groin: 48,
  thigh_l: 58,
  thigh_r: 58,
  knee_l: 62,
  knee_r: 62,
  ankle_l: 68,
  ankle_r: 68,
  foot_l: 72,
  foot_r: 72,
};

export const XRAY_LAMP_ALIGN_THRESHOLD = 5;

export function xrayLampAligned(lampX: number, targetX: number): boolean {
  return Math.abs(lampX - targetX) <= XRAY_LAMP_ALIGN_THRESHOLD;
}
