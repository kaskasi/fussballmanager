/** design.md §9.15 — career matchday speed control (1× / 2× / 4×). */
export const CAREER_MATCH_SPEED_OPTIONS = [1, 2, 4] as const;

export const CAREER_MATCH_MAX_SPEED = 4;

export function clampCareerMatchSpeed(speed: number): number {
  if (speed <= 1) return 1;
  if (speed <= 2) return 2;
  return CAREER_MATCH_MAX_SPEED;
}
