import { useMemo } from "react";
import type { Player } from "../../types/player.ts";
import {
  formatClubCash,
  formatSignedCash,
  transferBudget,
  wageBudgetStatus,
  weeklyWageBill,
  type ClubFinances,
} from "../../economy/club-finances.ts";
import {
  aggregateFinanceLines,
  financeLineIcon,
  financeLineLabel,
  financeMonthForWeek,
  financeMonthSnapshot,
  monthNetTotal,
  seasonCashSparkline,
} from "../../economy/finance-ledger.ts";
import {
  DEFAULT_FANBASE,
  stadiumMatchdayIncome,
  stadiumTotalCapacity,
  type ClubStadium,
} from "../../stadium/club-stadium.ts";
import { fanbaseMoodIcon, fanbaseMood, formatFanbase } from "../../stadium/fanbase.ts";
import { Hint } from "../components/Hint.tsx";
import { formatSeasonLabel } from "../../sim/season-label.ts";

/**
 * WIREFRAME: PRD 11.5 — Finanzen
 */
export function FinancesScreen({
  finances,
  players,
  clubId,
  season,
  week,
  stadium,
  onBack,
  onOpenStadium,
}: {
  finances: ClubFinances;
  players: readonly Player[];
  clubId: string;
  season: number;
  week: number;
  stadium: ClubStadium;
  onBack: () => void;
  onOpenStadium: () => void;
}) {
  const month = financeMonthForWeek(week);
  const wageBill = weeklyWageBill(players, clubId);
  const wageStatus = wageBudgetStatus(finances, players, clubId);
  const snapshot = useMemo(
    () => financeMonthSnapshot(finances, season, week),
    [finances, season, week],
  );
  const waterfall = useMemo(
    () => aggregateFinanceLines(snapshot?.lines ?? []),
    [snapshot],
  );
  const monthNet = monthNetTotal(snapshot?.lines ?? []);
  const sparkline = seasonCashSparkline(finances, season);
  const sparkMax = Math.max(...sparkline, 1);

  return (
    <main className="finances">
      <header className="finances-head">
        <button type="button" onClick={onBack} aria-label="Zurück zur Pipeline">
          ←
        </button>
        <div>
          <p className="eyebrow">Verein</p>
          <h1>💰 Finanzen</h1>
          <p className="finances-sub">{formatSeasonLabel(season)} · Monat {month}</p>
        </div>
      </header>

      <section className="finances-summary" aria-label="Budget-Übersicht">
        <BudgetCard label="Kasse" value={formatSignedCash(finances.cash)} tone={finances.cash < 0 ? "bad" : "good"} />
        <BudgetCard label="Transfer-Topf" value={formatClubCash(transferBudget(finances))} tone="neutral" />
        <BudgetCard
          label="Gehalts-Cap"
          value={`${formatClubCash(wageBill).replace("€ ", "")} / ${formatClubCash(finances.wage_budget_weekly).replace("€ ", "")}`}
          tone={wageStatus === "over" ? "bad" : wageStatus === "warn" ? "warn" : "good"}
          mark={wageStatus === "over" ? "◆" : wageStatus === "warn" ? "▲" : "●"}
        />
      </section>

      <section className="finances-stadium-link">
        <button type="button" className="finances-stadium-btn" onClick={onOpenStadium}>
          <span aria-hidden="true">🏟️</span>
          <span>
            {fanbaseMoodIcon(fanbaseMood(stadium.fanbase ?? DEFAULT_FANBASE))}{" "}
            {stadium.name} · Fanbase {formatFanbase(stadium.fanbase ?? DEFAULT_FANBASE)} · Heimspiel{" "}
            {formatClubCash(stadiumMatchdayIncome(stadium))}
          </span>
          <span aria-hidden="true">→</span>
        </button>
      </section>

      <section className="finances-waterfall" aria-label={`Cashflow Monat ${month}`}>
        <div className="finances-waterfall-head">
          <h2>Monat {month}</h2>
          <p className={monthNet >= 0 ? "finances-net is-up" : "finances-net is-down"}>
            Saldo {formatSignedCash(monthNet)}
          </p>
        </div>
        {waterfall.length === 0 ? (
          <p className="finances-empty">Noch keine Buchungen in diesem Monat — Woche simulieren.</p>
        ) : (
          <ul className="finances-bars">
            {waterfall.map((line) => {
              const peak = Math.max(...waterfall.map((entry) => Math.abs(entry.amount)), 1);
              const width = Math.max(8, (Math.abs(line.amount) / peak) * 100);
              const income = line.amount > 0;
              return (
                <li key={line.kind} className={income ? "finances-bar is-income" : "finances-bar is-expense"}>
                  <span className="finances-bar-icon" aria-hidden="true">{financeLineIcon(line.kind)}</span>
                  <span className="finances-bar-label">{financeLineLabel(line.kind)}</span>
                  <span className="finances-bar-track" aria-hidden="true">
                    <span className="finances-bar-fill" style={{ width: `${width}%` }} />
                  </span>
                  <span className="finances-bar-value">{formatSignedCash(line.amount)}</span>
                </li>
              );
            })}
          </ul>
        )}
        {snapshot ? (
          <p className="finances-range">
            {formatClubCash(snapshot.opening_cash)} → {formatSignedCash(snapshot.closing_cash)}
          </p>
        ) : null}
      </section>

      <section className="finances-sparkline" aria-label="Saison-Cash-Verlauf">
        <Hint text="Kassenstand nach jedem abgeschlossenen Monat in dieser Saison." block>
          <h2>{formatSeasonLabel(season)}</h2>
          <svg viewBox={`0 0 ${Math.max(sparkline.length * 24, 24)} 48`} role="img" aria-label="Cash-Verlauf">
            <polyline
              fill="none"
              stroke="#047857"
              strokeWidth="3"
              points={sparkline
                .map((value, index) => {
                  const x = sparkline.length === 1 ? 12 : (index / (sparkline.length - 1)) * Math.max(sparkline.length * 24 - 24, 1) + 12;
                  const y = 42 - (value / sparkMax) * 36;
                  return `${x},${y}`;
                })
                .join(" ")}
            />
          </svg>
        </Hint>
      </section>
    </main>
  );
}

function BudgetCard({
  label,
  value,
  tone,
  mark,
}: {
  label: string;
  value: string;
  tone: "good" | "warn" | "bad" | "neutral";
  mark?: string;
}) {
  return (
    <div className={`finances-card is-${tone}`}>
      <span className="finances-card-label">{label}</span>
      <strong className="finances-card-value">
        {mark ? <span className="finances-card-mark" aria-hidden="true">{mark} </span> : null}
        {value}
      </strong>
    </div>
  );
}
