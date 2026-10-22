/** WIREFRAME: PRD 09 Screen 1a — Positionsumschulung minigame preview (F2.3 / 07.7) */
import type { Player, PositionPrimary } from "../../types/player.ts";
import {
  previewSuccessPercent,
  retrainDurationFactor,
  retrainLaneSkillForTarget,
  retrainLaneTone,
  RETRAIN_DURATION_CAP_WEEKS,
} from "../../development/position-retrain-roll.ts";
import {
  positionLane,
  staerkeLaneLabel,
  type StaerkeLane,
} from "../../development/position-lanes.ts";

function mentalBar(value: number): string {
  const filled = Math.round((value / 199) * 8);
  return `${"▮".repeat(filled)}${"▯".repeat(8 - filled)}`;
}

function laneToneClass(tone: "good" | "mid" | "low"): string {
  if (tone === "good") return "is-good";
  if (tone === "mid") return "is-mid";
  return "is-low";
}

export function RetrainPreviewPanel({
  player,
  targetPosition,
  weeks,
}: {
  player: Player;
  targetPosition: PositionPrimary;
  weeks: number;
}) {
  const slot = player.flexibility.find((entry) => entry.trained_as === targetPosition);
  const currentProficiency = slot?.proficiency ?? 0;
  const percent = previewSuccessPercent({
    plannedWeeks: weeks,
    from: player.position,
    to: targetPosition,
    attrs: player.attributes,
    currentProficiency,
    flexibility: player.flexibility,
  });
  const laneSkill = retrainLaneSkillForTarget(
    player.position,
    player.flexibility,
    targetPosition,
  );
  const fromLane = positionLane(player.position);
  const toLane = positionLane(targetPosition);
  const tone = retrainLaneTone(player.position, targetPosition);
  const duration = retrainDurationFactor(weeks);

  let durationHint: string | null = null;
  if (weeks < 6) {
    durationHint = "Kurz — Abschluss-Check ist riskant.";
  } else if (weeks > RETRAIN_DURATION_CAP_WEEKS) {
    durationHint = "Lang — Erfolgs-Chance ist gedeckelt, der Slot bleibt länger gebunden.";
  }

  return (
    <section className="training-retrain-preview" aria-label="Umbau-Vorschau">
      <div className="training-retrain-chance">
        <span className="training-retrain-chance-label">Erfolgs-Chance</span>
        <strong className="training-retrain-chance-value">{percent} %</strong>
        <meter
          className="training-retrain-chance-meter"
          min={0}
          max={100}
          low={35}
          high={65}
          optimum={80}
          value={percent}
        />
      </div>

      <div className={`training-retrain-lanes ${laneToneClass(tone)}`}>
        <LaneChip lane={fromLane} />
        <span className="training-retrain-lanes-arrow" aria-hidden="true">
          →
        </span>
        <LaneChip lane={toLane} />
      </div>

      <ul className="training-retrain-mental" aria-label="Mental">
        <li>
          <span title="Composure">C</span>
          <span className="training-retrain-mental-bar">{mentalBar(player.attributes.composure)}</span>
        </li>
        <li>
          <span title="Concentration">K</span>
          <span className="training-retrain-mental-bar">{mentalBar(player.attributes.concentration)}</span>
        </li>
        <li>
          <span title="Teamwork">T</span>
          <span className="training-retrain-mental-bar">{mentalBar(player.attributes.teamwork)}</span>
        </li>
      </ul>

      {durationHint ? (
        <p className="training-retrain-hint" role="status">
          {durationHint}
        </p>
      ) : null}
      {duration >= 1 && weeks <= RETRAIN_DURATION_CAP_WEEKS ? (
        <p className="training-retrain-hint is-muted">Dauer wirkt bis etwa {RETRAIN_DURATION_CAP_WEEKS} Wochen auf die Chance.</p>
      ) : null}
      {laneSkill > 0 ? (
        <p className="training-retrain-hint is-muted">
          Stärke in der Ziel-Linie: {Math.round(laneSkill * 100)} % — erhöht die Erfolgs-Chance.
        </p>
      ) : null}
    </section>
  );
}

function LaneChip({ lane }: { lane: StaerkeLane }) {
  return (
    <span className="training-retrain-lane-chip">
      <span className="training-retrain-lane-code">{lane}</span>
      <span className="training-retrain-lane-name">{staerkeLaneLabel(lane)}</span>
    </span>
  );
}
