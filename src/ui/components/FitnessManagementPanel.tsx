import { useMemo } from "react";
import type { Player } from "../../types/player.ts";
import { formatPlayerName, formatPlayerPositionLabel } from "../../types/player-display.ts";
import {
  isPlayerTired,
  playerInjuryRisk,
} from "../../development/fitness-management.ts";
import { fatigueAmpelClassName } from "../../development/training-load.ts";
import { stateMark } from "../player-profile.ts";
import { useT } from "../../i18n/react.ts";
import { Hint } from "./Hint.tsx";

/**
 * WIREFRAME: PRD F1.4 — Fitness / Belastung
 */
export function FitnessManagementPanel({
  players,
  clubId,
  intensity,
  injuryRiskFactor = 1,
}: {
  players: readonly Player[];
  clubId: string;
  intensity: number;
  injuryRiskFactor?: number;
}) {
  const t = useT();
  const rows = useMemo(() => {
    return players
      .filter((player) => player.club_id === clubId && player.squad_status === "pro")
      .map((player) => {
        const fitness = stateMark(player.state.fitness, 75, 50);
        const risk = playerInjuryRisk(player, intensity, injuryRiskFactor);
        return {
          playerId: player.id,
          name: formatPlayerName(player),
          position: formatPlayerPositionLabel(player),
          fitness,
          fitnessValue: player.state.fitness,
          weeklyMinutes: player.state.weekly_minutes,
          tired: isPlayerTired(player),
          injured: player.state.injury !== null,
          risk,
        };
      })
      .sort((left, right) => right.risk.score - left.risk.score || left.name.localeCompare(right.name, "de"));
  }, [players, clubId, intensity, injuryRiskFactor]);

  const tiredCount = rows.filter((row) => row.tired).length;
  const avgFitness =
    rows.length > 0
      ? Math.round(rows.reduce((sum, row) => sum + row.fitnessValue, 0) / rows.length)
      : 0;

  return (
    <section className="fitness-panel" aria-label={t("fitness.panelAria")}>
      <Hint text={t("fitness.hint")} block>
        <p className="fitness-summary">
          {t("fitness.summary", {
            count: rows.length,
            avgFitness,
            tired: tiredCount,
            intensity,
          })}
        </p>
      </Hint>

      {rows.length === 0 ? (
        <p className="fitness-empty">{t("fitness.empty")}</p>
      ) : (
        <div className="fitness-table-wrap">
          <table className="fitness-table">
            <thead>
              <tr>
                <th scope="col">{t("fitness.col.player")}</th>
                <th scope="col">{t("fitness.col.pos")}</th>
                <th scope="col">{t("fitness.col.fitness")}</th>
                <th scope="col">{t("fitness.col.minutesWeek")}</th>
                <th scope="col">{t("fitness.col.status")}</th>
                <th scope="col">{t("fitness.col.injuryRisk")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.playerId} className={row.tired ? "fitness-row is-tired" : "fitness-row"}>
                  <td className="fitness-col-name">{row.name}</td>
                  <td>{row.position}</td>
                  <td className={`fitness-col-mark is-${row.fitness.tone}`} title={t("fitness.fitnessTitle", { value: row.fitnessValue })}>
                    <span className="fitness-mark" aria-hidden="true">{row.fitness.mark}</span>
                    {row.fitnessValue}
                  </td>
                  <td>{row.weeklyMinutes}</td>
                  <td>
                    {row.injured ? (
                      <span className="fitness-status is-risk" title={t("fitness.status.injuredTitle")}>
                        {t("fitness.status.injured")}
                      </span>
                    ) : row.tired ? (
                      <span className="fitness-status is-watch" title={t("fitness.status.tiredTitle")}>
                        <span aria-hidden="true">▲</span> {t("fitness.status.tired")}
                      </span>
                    ) : (
                      <span className="fitness-status is-good" title={t("fitness.status.fitTitle")}>
                        <span aria-hidden="true">●</span> {t("fitness.status.fit")}
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
