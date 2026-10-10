import { lineupFatigueFromFitness } from "./lineup-player-status.ts";
import { useT } from "../i18n/react.ts";

export function LineupFatigueBars({
  fitness,
  compact = false,
}: {
  fitness: number;
  compact?: boolean;
}) {
  const t = useT();
  const { filled, tone } = lineupFatigueFromFitness(fitness);
  const aria =
    filled === 0
      ? t("match.lineup.fatigue.empty")
      : t("match.lineup.fatigue.bars", { count: filled, fitness: Math.round(fitness) });

  return (
    <span
      className={`lineup-fatigue${compact ? " is-compact" : ""}`}
      role="img"
      aria-label={aria}
      title={aria}
    >
      <span className={`lineup-fatigue-bars is-${tone}`}>
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            className={`lineup-fatigue-bar${index < filled ? " is-on" : ""}`}
            aria-hidden
          />
        ))}
      </span>
    </span>
  );
}
