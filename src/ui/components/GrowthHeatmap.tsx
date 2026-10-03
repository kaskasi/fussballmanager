import { useState } from "react";
import { formatGrowthDelta } from "../../player/growth-history.ts";
import {
  heatmapCellsForStage,
  PIPELINE_STAGES,
  pipelineStageLabel,
  type GrowthHeatCell,
  type PipelineStageFill,
} from "../../player/growth-heatmap.ts";

/**
 * WIREFRAME: PRD 09.2 Screen 1 / F2.7 — Pipeline-Füllung + Wochen-Heatmap
 *
 * ┌────────────────────────────────────────────────────────┐
 * │ [Chart: U17 | U19 | Profi]                             │
 * │ 🌱 ●●  🌿 ●●●  ⭐ ●■●   (● Wachstum · ■ Rückgang)      │
 * └────────────────────────────────────────────────────────┘
 */

const BAR_MAX_REM = 6;

export function PipelineFillChart({ fill }: { fill: readonly PipelineStageFill[] }) {
  const max = Math.max(1, ...fill.map((stage) => stage.count));
  return (
    <div className="pipeline-chart" aria-label="Pipeline-Füllung nach Stufe">
      {fill.map((stage) => {
        const height = Math.max(0.45, (stage.count / max) * BAR_MAX_REM);
        return (
          <div key={stage.stage} className="pipeline-stage">
            <span
              className="pipeline-bar"
              style={{ height: `${height}rem` }}
              title={`${stage.label}: ${stage.count}`}
            />
            <span>
              {stage.icon} {stage.count}
            </span>
            <small>{stage.label}</small>
          </div>
        );
      })}
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
    <section className="pipeline-heat-block" aria-label="Wochenzuwachs">
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
            <p className="pipeline-heat-label">{pipelineStageLabel(stage)}</p>
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
