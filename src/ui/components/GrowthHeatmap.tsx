import { useState } from "react";
import { formatGrowthDelta } from "../../player/growth-history.ts";
import {
  heatmapCellsForStage,
  PIPELINE_STAGES,
  pipelineStageLabel,
  type GrowthHeatCell,
  type PipelineStageFill,
  type WeeklyTrainingExtremes,
} from "../../player/growth-heatmap.ts";

/**
 * WIREFRAME: PRD 14 / F2.7 — Hub Mini-Pipeline + 3▲/3▼, volle Heatmap im Training
 *
 * ┌──────────┐  ┌──────────────────────────────────────────┐
 * │ 🌱16 🌿4 │  │ ▲ Beste ●●●   ■ Schwächste ■■■          │
 * │ ⭐22     │  │ Heatmap im Training                      │
 * └──────────┘  └──────────────────────────────────────────┘
 */

const FILL_BAR_MAX_REM = 1.55;

export function PipelineFillCard({
  fill,
  onOpenJugend,
}: {
  fill: readonly PipelineStageFill[];
  onOpenJugend?: () => void;
}) {
  const max = Math.max(1, ...fill.map((stage) => stage.count));
  return (
    <button
      type="button"
      className="pipeline-fill-card"
      onClick={onOpenJugend}
      aria-label="Pipeline-Füllung nach Stufe"
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
          <small>{stage.label}</small>
        </span>
      ))}
    </button>
  );
}

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
}: {
  cells: readonly GrowthHeatCell[];
  onSelectPlayer: (playerId: string) => void;
}) {
  const [legendOpen, setLegendOpen] = useState(false);

  return (
    <section className="pipeline-heat-block is-full" aria-label="Wochenzuwachs">
      <div className="pipeline-heat-head">
        <p className="pipeline-heat-label">Wochenzuwachs</p>
        <button
          type="button"
          className="pipeline-legend-toggle"
          aria-label="Bedeutungen"
          aria-pressed={legendOpen}
          title="Bedeutungen"
          onClick={() => setLegendOpen((open) => !open)}
        >
          ?
        </button>
      </div>
      {legendOpen ? (
        <p className="pipeline-heat-legend" role="note">
          ● Wachstum · ● gleich · ■ Rückgang · graue Zelle = noch keine Woche
        </p>
      ) : null}
      {PIPELINE_STAGES.map((stage) => {
        const row = heatmapCellsForStage(cells, stage);
        return (
          <div key={stage} className="pipeline-heat-group">
            <p className="pipeline-heat-label">
              {pipelineStageLabel(stage)} · {row.length}
            </p>
            <div className="pipeline-heat">
              {row.length === 0 ? (
                <span className="heat-cell is-empty" aria-hidden="true">
                  ·
                </span>
              ) : (
                row.map((cell) => (
                  <button
                    key={cell.playerId}
                    type="button"
                    className={`heat-cell is-${cell.tone}`}
                    title={`${cell.label} · ${cell.position} · ${formatGrowthDelta(cell.growth)}`}
                    aria-label={`${cell.label}, ${formatGrowthDelta(cell.growth)}`}
                    onClick={() => onSelectPlayer(cell.playerId)}
                  >
                    {cell.initials}
                    <small>{cell.position}</small>
                    <small>{formatGrowthDelta(cell.growth)}</small>
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
