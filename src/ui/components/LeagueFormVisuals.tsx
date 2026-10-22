import type { FormResult, FormSlot } from "../../sim/league-form.ts";
import { useT } from "../../i18n/react.ts";

const SPARK_W = 52;
const SPARK_H = 22;

const RESULT_LETTER_KEY: Record<FormResult, string> = {
  W: "leagues.table.wins",
  D: "leagues.table.draws",
  L: "leagues.table.losses",
};

const RESULT_WORD_KEY: Record<FormResult, string> = {
  W: "leagues.form.win",
  D: "leagues.form.draw",
  L: "leagues.form.loss",
};

const RESULT_CLASS: Record<FormResult, string> = { W: "w", D: "d", L: "l" };

/** Last five results as tc-form squares (design.md §4.3): letter + colour, never colour alone. */
export function LeagueFormStrip({ slots }: { slots: readonly FormSlot[] }) {
  const t = useT();
  const played = slots.filter((slot): slot is FormResult => slot !== null);
  const label =
    played.length === 0
      ? t("leagues.form.none")
      : t("leagues.form.aria", {
          count: played.length,
          results: played.map((slot) => t(RESULT_WORD_KEY[slot])).join(", "),
        });
  return (
    <span className="tc-form" role="img" aria-label={label}>
      {slots.map((slot, index) => (
        <span
          key={index}
          className={`tc-form__r tc-form__r--${slot ? RESULT_CLASS[slot] : "empty"}`}
          aria-hidden
        >
          {slot ? t(RESULT_LETTER_KEY[slot]) : "·"}
        </span>
      ))}
    </span>
  );
}

export function LeaguePointsSparkline({ points }: { points: readonly (number | null)[] }) {
  const t = useT();
  const played = points.filter((value): value is number => value !== null);
  if (played.length === 0) {
    return (
      <span className="tc-caption" aria-hidden>
        —
      </span>
    );
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
      className="tc-spark"
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      role="img"
      aria-label={t("leagues.trend.aria", { count: played.length, points: played.join(", ") })}
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
