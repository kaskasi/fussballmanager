import { useMemo, useState } from "react";
import { t } from "../../i18n/index.ts";
import { pipelineStageDisplay } from "../../i18n/pipeline-display.ts";
import { useT } from "../../i18n/react.ts";
import { formatGrowthDelta } from "../../player/growth-history.ts";
import {
  heatmapCellsForStage,
  heatmapPeak,
  heatIntensity,
  PIPELINE_STAGES,
  type GrowthHeatCell,
  type HeatTone,
  type PipelineStageFill,
  type WeeklyTrainingExtremes,
} from "../../player/growth-heatmap.ts";

const HEATMAP_LEGEND_TONES: readonly HeatTone[] = ["up", "down", "flat", "pending"];

/**
 * WIREFRAME: PRD 09.2 / F2.7 — Team-Heatmap (1 Pixel = 1 Spieler)
 *
 * Desktop (Hover) — ~3×8 Raster pro Stufe, Zelle dim×dim (~8px):
 * ┌──────────────────────────────────────────────────────┐
 * │ Wochenzuwachs                                        │
 * │ U17  ████████   U19 ██████   Profi ████████         │
 * │      ████████               ████████   Hover=Name   │
 * │      ██                     ██████                  │
 * └──────────────────────────────────────────────────────┘
 *
 * Mobile (Touch): größere Zellen mit Initialen — kein Zwischenschritt.
 */

const FILL_BAR_MAX_REM = 1.55;

export function PipelineFillCard({
  fill,
  onOpenJugend,
}: {
  fill: readonly PipelineStageFill[];
  onOpenJugend?: () => void;
}) {
  useT();
  const max = Math.max(1, ...fill.map((stage) => stage.count));
  return (
    <button
      type="button"
      className="pipeline-fill-card"
      onClick={onOpenJugend}
      aria-label={t("hub.fill.aria")}
    >
      {fill.map((stage) => (
        <span key={stage.stage} className="pipeline-fill-stage">
          <span
            className="pipeline-fill-bar"
            style={{ height: `${Math.max(0.28, (stage.count / max) * FILL_BAR_MAX_REM)}rem` }}
            aria-hidden="true"
          />
          <span className="pipeline-fill-count">
            {stage.icon} {stage.count}
          </span>
          <small>{pipelineStageDisplay(stage.stage)}</small>
        </span>
      ))}
    </button>
  );
}

/** @deprecated Hub uses the team pixel bar directly; kept for tests / callers. */
export function WeeklyTrainingStrip({
  extremes,
  onSelectPlayer,
  onOpenTraining,
}: {
  extremes: WeeklyTrainingExtremes;
  onSelectPlayer: (playerId: string) => void;
  onOpenTraining?: () => void;
}) {
  if (!extremes.hasData) {
    return (
      <section className="week-train" aria-label="Training diese Woche">
        <p className="week-train-empty">Noch keine Trainingswoche</p>
        {onOpenTraining ? (
          <button type="button" className="week-train-link" onClick={onOpenTraining}>
            Heatmap im Training
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <section className="week-train" aria-label="Training diese Woche">
      <TrainingExtremeRow
        mark="▲"
        label="Beste"
        cells={extremes.best}
        onSelectPlayer={onSelectPlayer}
      />
      {extremes.worst.length > 0 ? (
        <TrainingExtremeRow
          mark="■"
          label="Schwächste"
          cells={extremes.worst}
          onSelectPlayer={onSelectPlayer}
        />
      ) : null}
      {onOpenTraining ? (
        <button type="button" className="week-train-link" onClick={onOpenTraining}>
          Heatmap
        </button>
      ) : null}
    </section>
  );
}

function TrainingExtremeRow({
  mark,
  label,
  cells,
  onSelectPlayer,
}: {
  mark: string;
  label: string;
  cells: readonly GrowthHeatCell[];
  onSelectPlayer: (playerId: string) => void;
}) {
  return (
    <div className="week-train-row">
      <p className="week-train-label">
        <span aria-hidden="true">{mark}</span> {label}
      </p>
      <div className="week-train-cells">
        {cells.map((cell) => (
          <button
            key={cell.playerId}
            type="button"
            className={`heat-cell is-${cell.tone}`}
            title={`${cell.label} · ${cell.position} · ${formatGrowthDelta(cell.growth)}`}
            aria-label={`${cell.label}, ${formatGrowthDelta(cell.growth)}`}
            onClick={() => onSelectPlayer(cell.playerId)}
          >
            {cell.initials}
            <small>{formatGrowthDelta(cell.growth)}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

export function GrowthHeatmap({
  cells,
  onSelectPlayer,
  compact = false,
}: {
  cells: readonly GrowthHeatCell[];
  onSelectPlayer: (playerId: string) => void;
  /** Hub package: one packed bar. Training keeps stage labels under the same pixels. */
  compact?: boolean;
}) {
  useT();
  const [legendOpen, setLegendOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const peak = useMemo(() => heatmapPeak(cells), [cells]);
  const hovered = useMemo(
    () => cells.find((cell) => cell.playerId === hoveredId) ?? null,
    [cells, hoveredId],
  );

  return (
    <section
      className={compact ? "training-pixel-pack is-compact" : "training-pixel-pack is-full"}
      aria-label="Team-Trainingsheatmap"
    >
      <div className="pipeline-heat-head">
        <p className="pipeline-heat-label">
          {compact ? t("hub.heat.compactTitle") : t("hub.heat.title")}
        </p>
        <button
          type="button"
          className="pipeline-legend-toggle"
          aria-label={t("hub.heat.legend.toggle")}
          aria-pressed={legendOpen}
          title={t("hub.heat.legend.toggle")}
          onClick={() => setLegendOpen((open) => !open)}
        >
          ?
        </button>
      </div>
      {legendOpen ? (
        <div className="pipeline-heat-legend pipeline-heat-legend-swatches" role="note">
          <p className="pipeline-heat-legend-lead">{t("hub.heat.legend.onePerPlayer")}</p>
          <ul className="pipeline-heat-legend-list">
            {HEATMAP_LEGEND_TONES.map((tone) => (
              <li key={tone}>
                {tone === "up" ? (
                  <span className="heat-legend-swatch-pair" aria-hidden="true">
                    <span className="heat-legend-swatch heat-pixel is-up is-legend-weak" />
                    <span className="heat-legend-swatch heat-pixel is-up is-legend-strong" />
                  </span>
                ) : (
                  <span className={`heat-legend-swatch heat-pixel is-${tone}`} aria-hidden="true" />
                )}
                <span>{t(`hub.heat.legend.${tone}`)}</span>
              </li>
            ))}
          </ul>
          <p className="pipeline-heat-legend-hint">{t("hub.heat.legend.hover")}</p>
        </div>
      ) : null}

      <div className="training-pixel-bar" role="list" aria-label="Spieler nach Trainingsleistung">
        {PIPELINE_STAGES.map((stage) => {
          const row = heatmapCellsForStage(cells, stage);
          if (row.length === 0) return null;
          return (
            <div
              key={stage}
              className="training-pixel-stage"
              role="group"
              aria-label={`${pipelineStageDisplay(stage)} · ${row.length}`}
            >
              {!compact ? (
                <p className="pipeline-heat-label training-pixel-stage-label">
                  {pipelineStageDisplay(stage)} · {row.length}
                </p>
              ) : null}
              <div className="pipeline-heat training-pixel-row">
                {row.map((cell) => (
                  <button
                    key={cell.playerId}
                    type="button"
                    role="listitem"
                    className={`heat-pixel is-${cell.tone}`}
                    style={{ opacity: heatIntensity(cell.growth, peak) }}
                    aria-label={`${cell.label}, ${cell.position}, ${formatGrowthDelta(cell.growth)}`}
                    onClick={() => onSelectPlayer(cell.playerId)}
                    onMouseEnter={() => setHoveredId(cell.playerId)}
                    onMouseLeave={() => setHoveredId((id) => (id === cell.playerId ? null : id))}
                    onFocus={() => setHoveredId(cell.playerId)}
                    onBlur={() => setHoveredId((id) => (id === cell.playerId ? null : id))}
                  >
                    <span className="heat-pixel-face">
                      {cell.initials}
                      <small>{cell.position}</small>
                      <small>{formatGrowthDelta(cell.growth)}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {hovered ? (
        <p className="training-pixel-hover" role="status">
          <strong>{hovered.label}</strong>
          <span>
            {hovered.position} · {pipelineStageDisplay(hovered.squadStatus)} ·{" "}
            {formatGrowthDelta(hovered.growth)}
          </span>
        </p>
      ) : (
        <p className="training-pixel-hover is-idle" aria-hidden="true">
          {compact ? t("hub.heat.hoverCompact") : t("hub.heat.hover")}
        </p>
      )}
    </section>
  );
}
