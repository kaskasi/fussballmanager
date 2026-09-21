/**
 * Normalized pitch coordinates shared by commentary and the future SVG view.
 * Origin is the home goal-line, left:
 * - x: 0 = home goal, 100 = away goal (length)
 * - y: 0 = left touchline, 100 = right touchline (from home's perspective)
 */
export type PitchPosition = {
  x: number;
  y: number;
};

export const PITCH_MIN = 0;
export const PITCH_MAX = 100;

export function isOnPitch(position: PitchPosition): boolean {
  return (
    position.x >= PITCH_MIN &&
    position.x <= PITCH_MAX &&
    position.y >= PITCH_MIN &&
    position.y <= PITCH_MAX
  );
}
