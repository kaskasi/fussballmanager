/** Top-down pitch lines — engine coords 0–100 map to 105×68 m viewBox (see Pitch.tsx). */
export const PITCH_W = 105;
export const PITCH_H = 68;

const LINE = "#ecfdf5";
const GRASS = "#15803d";
const GRASS_EDGE = "#166534";

export function mapBallToPitch(ball: { x: number; y: number }): { cx: number; cy: number } {
  return {
    cx: (ball.x / 100) * PITCH_W,
    cy: (ball.y / 100) * PITCH_H,
  };
}

/** Simple outline: halfway line + 16-yard boxes (no players). */
export function SimplePitchMarkings() {
  return (
    <>
      <rect x={0} y={0} width={PITCH_W} height={PITCH_H} fill={GRASS_EDGE} />
      <rect
        x={0}
        y={0}
        width={PITCH_W}
        height={PITCH_H}
        fill={GRASS}
        stroke={LINE}
        strokeWidth={0.45}
      />
      <line
        x1={PITCH_W / 2}
        y1={0}
        x2={PITCH_W / 2}
        y2={PITCH_H}
        stroke={LINE}
        strokeWidth={0.35}
      />
      <rect
        x={0}
        y={13.84}
        width={16.5}
        height={40.32}
        fill="none"
        stroke={LINE}
        strokeWidth={0.3}
      />
      <rect
        x={PITCH_W - 16.5}
        y={13.84}
        width={16.5}
        height={40.32}
        fill="none"
        stroke={LINE}
        strokeWidth={0.3}
      />
    </>
  );
}
