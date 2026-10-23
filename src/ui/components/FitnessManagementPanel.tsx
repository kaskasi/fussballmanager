import { useMemo } from "react";
import type { Player } from "../../types/player.ts";
import { formatPlayerName, formatPlayerPositionLabel } from "../../types/player-display.ts";
import {
  isPlayerTired,
  playerInjuryRisk,
} from "../../development/fitness-management.ts";
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
    <section className="tc-panel" aria-label={t("fitness.panelAria")}>
      <div className="tc-panel__head">
        <h2 className="tc-panel__title">{t("fitness.title")}</h2>
        <Hint text={t("fitness.hint")}>
          <span className="tc-panel__meta">
            {t("fitness.summary", {
              count: rows.length,
              avgFitness,
              tired: tiredCount,
              intensity,
            })}
          </span>
        </Hint>
      </div>

      {rows.length === 0 ? (
        <p className="tc-empty">{t("fitness.empty")}</p>
      ) : (
        <div className="tc-table-wrap">
          <table className="tc-table tc-table--compact">
            <thead>
              <tr>
                <th scope="col">{t("fitness.col.player")}</th>
                <th scope="col">{t("fitness.col.pos")}</th>
                <th scope="col" className="tc-num">{t("fitness.col.fitness")}</th>
                <th scope="col" className="tc-num">{t("fitness.col.minutesWeek")}</th>
                <th scope="col">{t("fitness.col.status")}</th>
                <th scope="col" className="tc-num">{t("fitness.col.injuryRisk")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.playerId} className={row.tired ? "tc-row--mark" : undefined}>
                  <td className="tc-strong">{row.name}</td>
                  <td>{row.position}</td>
                  <td className="tc-num" title={t("fitness.fitnessTitle", { value: row.fitnessValue })}>
                    <span className={`tc-state tc-state--${row.fitness.tone}`}>
                      <span aria-hidden="true">{row.fitness.mark}</span> {row.fitnessValue}
                    </span>
                  </td>
                  <td className="tc-num">{row.weeklyMinutes}</td>
                  <td>
                    {row.injured ? (
                      <span className="tc-state tc-state--low" title={t("fitness.status.injuredTitle")}>
                        {t("fitness.status.injured")}
                      </span>
                    ) : row.tired ? (
                      <span className="tc-state tc-state--mid" title={t("fitness.status.tiredTitle")}>
                        <span aria-hidden="true">▲</span> {t("fitness.status.tired")}
                      </span>
                    ) : (
                      <span className="tc-state tc-state--good" title={t("fitness.status.fitTitle")}>
                        <span aria-hidden="true">●</span> {t("fitness.status.fit")}
                      </span>
                    )}
                  </td>
                  <td className="tc-num" title={row.risk.label}>
                    <span className={`tc-state ${riskTone(row.risk.ampel)}`}>
                      <span aria-hidden="true">{row.risk.icon}</span> {row.risk.score}
                    </span>
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

function riskTone(ampel: string): string {
  if (ampel === "risk") return "tc-state--low";
  if (ampel === "watch") return "tc-state--mid";
  return "tc-state--good";
}
