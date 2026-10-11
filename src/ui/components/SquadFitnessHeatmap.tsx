import { useMemo, useState } from "react";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import type { HubFitnessCell } from "../../hub/hub-heatmaps.ts";

/**
 * WIREFRAME: PRD 14.15 — Squad fitness raster (same pixel band language as training heatmaps).
 */
export function SquadFitnessHeatmap({
  cells,
  onSelectPlayer,
  compact = true,
}: {
  cells: readonly HubFitnessCell[];
  onSelectPlayer: (playerId: string) => void;
  compact?: boolean;
}) {
  useT();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hovered = useMemo(
    () => cells.find((cell) => cell.playerId === hoveredId) ?? null,
    [cells, hoveredId],
  );

  return (
    <section
      className={`squad-fitness-heat training-pixel-pack ${compact ? "is-compact" : "is-full"}`}
      aria-label={t("training.fitnessHeat.aria")}
    >
      <div className="pipeline-heat-head">
        <p className="pipeline-heat-label">{t("training.fitnessHeat.title")}</p>
      </div>
      <div className="pipeline-heat training-pixel-row" role="list">
        {cells.map((cell) => (
          <button
            key={cell.playerId}
            type="button"
            role="listitem"
            className={`heat-pixel is-${cell.tone}`}
            aria-label={`${cell.initials}, ${cell.fitness}%`}
            title={`${cell.initials} · ${cell.fitness}%`}
            onClick={() => onSelectPlayer(cell.playerId)}
            onMouseEnter={() => setHoveredId(cell.playerId)}
            onMouseLeave={() => setHoveredId((id) => (id === cell.playerId ? null : id))}
            onFocus={() => setHoveredId(cell.playerId)}
            onBlur={() => setHoveredId((id) => (id === cell.playerId ? null : id))}
          >
            <span className="heat-pixel-face">
              {cell.initials}
              <small>{cell.fitness}</small>
            </span>
          </button>
        ))}
      </div>
      {hovered ? (
        <p className="training-pixel-hover" role="status">
          <strong>{hovered.initials}</strong>
          <span>{t("training.fitnessHeat.hover", { fitness: String(hovered.fitness) })}</span>
        </p>
      ) : (
        <p className="training-pixel-hover is-idle" aria-hidden="true">
          {t("training.fitnessHeat.hoverCompact")}
        </p>
      )}
    </section>
  );
}
