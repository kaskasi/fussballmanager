import { useMemo } from "react";
import type { Player } from "../../types/player.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import {
  isPlayerTired,
  playerInjuryRisk,
} from "../../development/fitness-management.ts";
import { fatigueAmpelClassName } from "../../development/training-load.ts";
import { stateMark } from "../player-profile.ts";
import { Hint } from "./Hint.tsx";

/**
 * WIREFRAME: PRD F1.4 — Fitness / Belastung
 *
 * ┌────────────────────────────────────────────────────┐
 * │ Spieler · Fitness ● 82 · Min 74 · Risiko ▲ 48    │
 * └────────────────────────────────────────────────────┘
 */

export function FitnessManagementPanel({
  players,
  clubId,
  intensity,
}: {
  players: readonly Player[];
  clubId: string;
  intensity: number;
}) {
  const rows = useMemo(() => {
    return players
      .filter((player) => player.club_id === clubId && player.squad_status === "pro")
      .map((player) => {
        const fitness = stateMark(player.state.fitness, 75, 50);
        const risk = playerInjuryRisk(player, intensity);
        return {
          playerId: player.id,
          name: formatPlayerName(player),
          position: player.position,
          fitness,
          fitnessValue: player.state.fitness,
          weeklyMinutes: player.state.weekly_minutes,
          tired: isPlayerTired(player),
          injured: player.state.injury !== null,
          risk,
        };
      })
      .sort((left, right) => right.risk.score - left.risk.score || left.name.localeCompare(right.name, "de"));
  }, [players, clubId, intensity]);

  const tiredCount = rows.filter((row) => row.tired).length;
  const avgFitness =
    rows.length > 0
      ? Math.round(rows.reduce((sum, row) => sum + row.fitnessValue, 0) / rows.length)
      : 0;

  return (
    <section className="fitness-panel" aria-label="Fitness und Belastung">
      <Hint
        text="Einsatzzeiten senken die Fitness. Leichte Wochen und ein Fitness-Coach helfen bei der Regeneration. Risiko steigt bei hoher Intensität und Müdigkeit."
        block
      >
        <p className="fitness-summary">
          {rows.length} Profis · Ø Fitness {avgFitness} · {tiredCount} müde · Intensität {intensity}
        </p>
      </Hint>

      {rows.length === 0 ? (
        <p className="fitness-empty">Kein Profikader.</p>
      ) : (
        <div className="fitness-table-wrap">
          <table className="fitness-table">
            <thead>
              <tr>
                <th scope="col">Spieler</th>
                <th scope="col">Pos</th>
                <th scope="col">Fitness</th>
                <th scope="col">Min/Wo</th>
                <th scope="col">Status</th>
                <th scope="col">Verletzungsrisiko</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.playerId} className={row.tired ? "fitness-row is-tired" : "fitness-row"}>
                  <td className="fitness-col-name">{row.name}</td>
                  <td>{row.position}</td>
                  <td className={`fitness-col-mark is-${row.fitness.tone}`} title={`Fitness ${row.fitnessValue}%`}>
                    <span className="fitness-mark" aria-hidden="true">{row.fitness.mark}</span>
                    {row.fitnessValue}
                  </td>
                  <td>{row.weeklyMinutes}</td>
                  <td>
                    {row.injured ? (
                      <span className="fitness-status is-risk" title="Verletzt">🩹 Verletzt</span>
                    ) : row.tired ? (
                      <span className="fitness-status is-watch" title="Hohe Belastung">
                        <span aria-hidden="true">▲</span> Müde
                      </span>
                    ) : (
                      <span className="fitness-status is-good" title="Belastung im Rahmen">
                        <span aria-hidden="true">●</span> Fit
                      </span>
                    )}
                  </td>
                  <td className={`fitness-col-risk is-${row.risk.ampel}`} title={row.risk.label}>
                    <span className={`pipeline-light ${fatigueAmpelClassName(row.risk.ampel)}`} aria-hidden="true">
                      {row.risk.icon}
                    </span>
                    {row.risk.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
