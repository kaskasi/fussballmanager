/** Simple rehab timing minigame — deterministic windows, one bonus per player per game week. */

export const REHAB_MINIGAME_WEEKLY_CAP = 1;
export const REHAB_MINIGAME_DIAGNOSIS_DAY_BONUS = 1;
export const REHAB_MINIGAME_RECOVERY_WEEK_BONUS = 0.25;

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

export interface RehabTimingWindow {
  /** 0–100 position where hit is valid */
  center: number;
  width: number;
}

export function rehabTimingWindows(
  masterSeed: number,
  season: number,
  week: number,
  playerId: string,
): RehabTimingWindow[] {
  const rng = mulberry32(hashSeed([masterSeed, season, week, playerId, "rehab-timing"]));
  return [0, 1, 2].map(() => ({
    center: Math.round(20 + rng() * 60),
    width: 12 + Math.floor(rng() * 8),
  }));
}

export function rehabHitScore(
  windows: readonly RehabTimingWindow[],
  hits: readonly number[],
): number {
  let score = 0;
  for (let i = 0; i < windows.length; i++) {
    const window = windows[i];
    const hit = hits[i];
    if (window == null || hit == null) continue;
    const dist = Math.abs(hit - window.center);
    if (dist <= window.width / 2) score += 1;
  }
  return score;
}

export function rehabMinigameSuccess(score: number): boolean {
  return score >= 2;
}

/** Physio Mithelfen — all three taps must land in the green zones. */
export function rehabPhysioAssistSuccess(score: number, hitCount = 3): boolean {
  return score >= hitCount;
}

export function canUseRehabMinigame(
  usedIds: readonly string[] | undefined,
  season: number,
  week: number,
  storedWeek: { season: number; week: number } | undefined,
  playerId: string,
): boolean {
  const weekMatch = storedWeek?.season === season && storedWeek?.week === week;
  const used = weekMatch ? (usedIds ?? []) : [];
  if (used.includes(playerId)) return false;
  return used.length < REHAB_MINIGAME_WEEKLY_CAP;
}
