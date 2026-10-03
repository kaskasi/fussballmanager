import { formSlotsAriaLabel, type FormSlot } from "../../sim/league-form.ts";

const SPARK_W = 52;
const SPARK_H = 22;

export function LeagueFormStrip({ slots }: { slots: readonly FormSlot[] }) {
  return (
    <span className="league-form-strip" role="img" aria-label={formSlotsAriaLabel(slots)}>
      {slots.map((slot, index) => (
        <span
          key={index}
          className={
            slot === "W"
              ? "league-form-slot is-win"
              : slot === "D"
                ? "league-form-slot is-draw"
                : slot === "L"
                  ? "league-form-slot is-loss"
                  : "league-form-slot is-empty"
          }
          aria-hidden
        >
          {slot === "W" ? "▲" : slot === "D" ? "■" : slot === "L" ? "▼" : "●"}
        </span>
      ))}
    </span>
  );
}

export function LeaguePointsSparkline({ points }: { points: readonly (number | null)[] }) {
  const played = points.some((value) => value !== null);
  if (!played) {
    return <span className="league-points-spark is-empty" aria-hidden>—</span>;
  }

  const padding = 3;
  const step = points.length > 1 ? (SPARK_W - padding * 2) / (points.length - 1) : 0;
  const coords: { x: number; y: number }[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const value = points[index];
    if (value == null) continue;
    const x = padding + index * step;
    const y = SPARK_H - padding - (value / 3) * (SPARK_H - padding * 2);
    coords.push({ x, y });
  }

  const polyline = coords.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <svg
      className="league-points-spark"
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      role="img"
      aria-label={`Punkte letzte Spiele: ${coords.length} ausgewertet`}
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={polyline}
      />
      {coords.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r="2.2" fill="currentColor" />
      ))}
    </svg>
  );
}
