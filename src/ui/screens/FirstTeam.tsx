import { useMemo, useState } from "react";
import type { Player } from "../../types/player.ts";
import {
  formatMarketValueShort,
  listProSquad,
  sortProSquadRows,
  type ProSquadSortDirection,
  type ProSquadSortKey,
} from "../../squad/pro-roster.ts";
import { caDeltaClassName, caDeltaMark, formatCaDelta } from "../../player/ca-tracking.ts";
import { fatigueAmpelClassName } from "../../development/training-load.ts";
import { Hint } from "../components/Hint.tsx";
import { SquadSortHeader } from "../components/SquadSortHeader.tsx";
import { formMark, stateMark } from "../player-profile.ts";
import { formatSeasonDisplay } from "../../i18n/calendar-display.ts";
import { useT } from "../../i18n/react.ts";
import { t } from "../../i18n/index.ts";

/**
 * WIREFRAME: PRD 09 — Profikader
 * ┌──────────────────────────────────────────────┐
 * │ ←  ⭐ Profikader · 14 Spieler                │
 * │ Ø CA 74 · Marktwert 18.2M                    │
 * ├──────────────────────────────────────────────┤
 * │ Neuer · GK · 28 J. · CA 81 · 2.1M · ●       │
 * │ Hummels · CB · 27 J. · CA 78 · 1.8M · ▲     │
 * └──────────────────────────────────────────────┘
 */

const DEFAULT_SORT: { key: ProSquadSortKey; direction: ProSquadSortDirection } = {
  key: "position",
  direction: "asc",
};

export function FirstTeam({
  players,
  clubId,
  season,
  trainingIntensity = 100,
  onBack,
  onSelectPlayer,
}: {
  players: readonly Player[];
  clubId: string;
  season: number;
  trainingIntensity?: number;
  onBack: () => void;
  onSelectPlayer: (playerId: string) => void;
}) {
  useT();
  const [sortKey, setSortKey] = useState<ProSquadSortKey>(DEFAULT_SORT.key);
  const [sortDirection, setSortDirection] = useState<ProSquadSortDirection>(DEFAULT_SORT.direction);

  const rows = useMemo(() => {
    const baseRows = listProSquad(players, clubId, trainingIntensity);
    return sortProSquadRows(baseRows, sortKey, sortDirection);
  }, [players, clubId, trainingIntensity, sortKey, sortDirection]);

  const avgCa =
    rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.ca, 0) / rows.length) : 0;
  const totalValue = rows.reduce((sum, row) => sum + row.marketValue, 0);

  const toggleSort = (key: ProSquadSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "desc" ? "asc" : "desc"));
      return;
    }
    setSortKey(key);
    setSortDirection(key === "name" || key === "position" ? "asc" : "desc");
  };

  return (
    <main className="squad">
      <header className="squad-head">
        <button type="button" onClick={onBack} aria-label={t("squad.back")}>
          ←
        </button>
        <div>
          <p className="eyebrow">{formatSeasonDisplay(season)}</p>
          <h1>{t("squad.title")}</h1>
          <Hint text={t("squad.hint")} block>
            <p className="squad-summary">
              {t("squad.summary", {
                count: rows.length,
                avgCa,
                value: formatMarketValueShort(totalValue),
              })}
            </p>
          </Hint>
        </div>
      </header>

      {rows.length === 0 ? (
        <section className="squad-empty" aria-label={t("squad.empty.aria")}>
          <span className="squad-empty-icon" aria-hidden="true">⭐</span>
          <p>{t("squad.empty")}</p>
          <p className="squad-empty-hint">{t("squad.emptyHint")}</p>
        </section>
      ) : (
        <div className="squad-table-wrap">
          <table className="squad-table">
            <thead>
              <tr>
                <SquadSortHeader label={t("squad.col.name")} sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} align="left" />
                <SquadSortHeader label={t("squad.col.pos")} sortKey="position" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SquadSortHeader label={t("squad.col.age")} sortKey="age" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SquadSortHeader label="CA" sortKey="ca" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SquadSortHeader label="Δ" sortKey="caDelta" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} title={t("squad.col.caDeltaTitle")} />
                <SquadSortHeader label={t("squad.col.value")} sortKey="marketValue" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SquadSortHeader label="Fit" sortKey="fitness" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} title={t("squad.col.fitTitle")} />
                <SquadSortHeader label="Min/Wo" sortKey="weeklyMinutes" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} title={t("squad.col.minWeekTitle")} />
                <SquadSortHeader label="Risiko" sortKey="injuryRisk" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} title={t("squad.col.riskTitle")} />
                <SquadSortHeader label="Min" sortKey="seasonMinutes" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SquadSortHeader label="T" sortKey="goals" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SquadSortHeader label="A" sortKey="assists" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SquadSortHeader label="K" sortKey="yellowCards" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SquadSortHeader label="Tkl" sortKey="tackles" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SquadSortHeader label="Kop" sortKey="headers" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SquadSortHeader label="Ø" sortKey="avgRating" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                <SquadSortHeader label="Form" sortKey="form" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.playerId} className="squad-table-row" onClick={() => onSelectPlayer(row.playerId)}>
                  <td className="squad-col-name">{row.displayName}</td>
                  <td>{row.position}</td>
                  <td>{row.age}</td>
                  <td className="squad-col-ca">{row.ca}</td>
                  <td className={caDeltaClassName(row.caDelta)} title="CA seit letzter Woche">
                    <span className="squad-delta-mark" aria-hidden="true">{caDeltaMark(row.caDelta)}</span>
                    {formatCaDelta(row.caDelta)}
                  </td>
                  <td className="squad-col-value">{formatMarketValueShort(row.marketValue)}</td>
                  <td className={`squad-fitness is-${stateMark(row.fitness, 75, 50).tone}`} title={`Fitness ${row.fitness}%`}>
                    <span className="squad-shape-mark" aria-hidden="true">{stateMark(row.fitness, 75, 50).mark}</span>
                    {row.fitness}
                  </td>
                  <td>{row.weeklyMinutes}</td>
                  <td className={`squad-risk is-${injuryRiskAmpel(row.injuryRisk)}`} title={`Verletzungsrisiko ${row.injuryRisk}`}>
                    <span className={`pipeline-light ${fatigueAmpelClassName(injuryRiskAmpel(row.injuryRisk))}`} aria-hidden="true">
                      {injuryRiskIcon(row.injuryRisk)}
                    </span>
                    {row.injuryRisk}
                  </td>
                  <td>{row.seasonMinutes}</td>
                  <td>{row.goals}</td>
                  <td>{row.assists}</td>
                  <td>{row.yellowCards}</td>
                  <td>{row.tackles}</td>
                  <td>{row.headers}</td>
                  <td>{row.avgRating?.toFixed(1) ?? "—"}</td>
                  <td className={`squad-form is-${formMark(row.form).tone}`} title={`Form ${row.form}`}>
                    <span className="squad-shape-mark" aria-hidden="true">{formMark(row.form).mark}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function injuryRiskAmpel(score: number): "good" | "watch" | "risk" {
  if (score >= 70) return "risk";
  if (score >= 40) return "watch";
  return "good";
}

function injuryRiskIcon(score: number): string {
  if (score >= 70) return "◆";
  if (score >= 40) return "▲";
  return "●";
}
