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
  financeLineIcon,
  financeLineLabel,
  financeMonthForWeek,
} from "../../economy/finance-ledger.ts";
import {
  resolveFinanceWaterfall,
  seasonCashSparkline13,
  weekPreviewFinanceLines,
} from "../../economy/finance-waterfall.ts";
import type { LeagueState } from "../../persistence/league-state.ts";
import { playerFixture } from "../../sim/league-week.ts";
import { scoutNetworkWeeklyWage, type ScoutNetworkState } from "../../scouting/scout-network.ts";
import type { CoachingStaff } from "../../staff/coaching-staff.ts";
import {
  DEFAULT_FANBASE,
  stadiumMatchdayIncome,
  type ClubStadium,
} from "../../stadium/club-stadium.ts";
import { fanbaseMoodIcon, fanbaseMood, formatFanbase } from "../../stadium/fanbase.ts";
import { Hint } from "../components/Hint.tsx";
import { formatSeasonLabel } from "../../sim/season-label.ts";

const SPARK_W = 312;
const SPARK_H = 56;

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
  league,
  coachingStaff,
  scoutNetwork,
  onBack,
  onOpenStadium,
}: {
  finances: ClubFinances;
  players: readonly Player[];
  clubId: string;
  season: number;
  week: number;
  stadium: ClubStadium;
  league: LeagueState;
  coachingStaff: CoachingStaff;
  scoutNetwork: ScoutNetworkState;
  onBack: () => void;
  onOpenStadium: () => void;
}) {
  const month = financeMonthForWeek(week);
  const wageBill = weeklyWageBill(players, clubId);
  const wageStatus = wageBudgetStatus(finances, players, clubId);
  const fixture = playerFixture(league, league.matchday);
  const waterfall = useMemo(() => {
    const preview = weekPreviewFinanceLines({
      players,
      clubId,
      divisionId: league.division_id,
      isHomeMatchWeek: fixture?.homeTeamId === league.player_club_id,
      season,
      week,
      stadium,
      coachingStaff,
      scoutWagesWeekly: scoutNetworkWeeklyWage(scoutNetwork),
    });
    return resolveFinanceWaterfall(finances, season, week, preview);
  }, [
    coachingStaff,
    clubId,
    finances,
    fixture?.homeTeamId,
    league.division_id,
    league.player_club_id,
    players,
    scoutNetwork,
    season,
    stadium,
    week,
  ]);
  const sparkline = seasonCashSparkline13(finances, season, week);
  const sparkMin = Math.min(...sparkline);
  const sparkMax = Math.max(...sparkline);
  const sparkSpan = Math.max(sparkMax - sparkMin, Math.abs(sparkMax) * 0.04, 1);

  return (
    <main className="finances">
      <header className="finances-head">
        <button type="button" onClick={onBack} aria-label="Zurück zur Pipeline">
          ←
        </button>
        <div>
          <p className="eyebrow">Verein</p>
          <h1>💰 Finanzen</h1>
          <p className="finances-sub">
            {formatSeasonLabel(season)} · Monat {month}
          </p>
        </div>
      </header>

      <section className="finances-waterfall" aria-label={`Cashflow ${waterfall.title}`}>
        <div className="finances-waterfall-head">
          <div>
            <h2>{waterfall.title}</h2>
            {waterfall.caption ? <p className="finances-caption">{waterfall.caption}</p> : null}
          </div>
          <p className={waterfall.net >= 0 ? "finances-net is-up" : "finances-net is-down"}>
            Saldo {formatSignedCash(waterfall.net)}
          </p>
        </div>
        {waterfall.streams.length === 0 ? (
          <p className="finances-empty">Keine Ströme in dieser Woche.</p>
        ) : (
          <ul className="finances-bars">
            {waterfall.streams.map((line) => {
              const peak = Math.max(...waterfall.streams.map((entry) => Math.abs(entry.amount)), 1);
              const width = Math.max(10, (Math.abs(line.amount) / peak) * 100);
              const income = line.amount > 0;
              return (
                <li
                  key={line.kind}
                  className={income ? "finances-bar is-income" : "finances-bar is-expense"}
                  title={formatSignedCash(line.amount)}
                >
                  <span className="finances-bar-icon" aria-hidden="true">
                    {financeLineIcon(line.kind)}
                  </span>
                  <span className="finances-bar-label">{financeLineLabel(line.kind)}</span>
                  <span className="finances-bar-track" aria-hidden="true">
                    <span className="finances-bar-fill" style={{ width: `${width}%` }} />
                  </span>
                  <span className="finances-bar-value">
                    {line.amount > 0 ? `+${formatSignedCash(line.amount)}` : formatSignedCash(line.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="finances-range">
          {formatClubCash(waterfall.snapshot.opening_cash)} →{" "}
          {formatSignedCash(waterfall.snapshot.closing_cash)}
        </p>
      </section>

      <section className="finances-summary" aria-label="Budget-Übersicht">
        <BudgetCard
          icon="🏦"
          label="Kasse"
          value={formatSignedCash(finances.cash)}
          tone={finances.cash < 0 ? "bad" : "good"}
        />
        <BudgetCard
          icon="💼"
          label="Transfer-Topf"
          value={formatClubCash(transferBudget(finances))}
          tone="neutral"
        />
        <BudgetCard
          icon="👕"
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
            {fanbaseMoodIcon(fanbaseMood(stadium.fanbase ?? DEFAULT_FANBASE))} {stadium.name} ·
            Fanbase {formatFanbase(stadium.fanbase ?? DEFAULT_FANBASE)} · Heimspiel{" "}
            {formatClubCash(stadiumMatchdayIncome(stadium))}
          </span>
          <span aria-hidden="true">→</span>
        </button>
      </section>

      <section className="finances-sparkline" aria-label="Saison-Cash-Verlauf">
        <Hint text="Kassenstand über 13 Monate. Flach in Woche 1 ist ehrlich." block>
          <h2>{formatSeasonLabel(season)}</h2>
          <svg
            viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
            preserveAspectRatio="none"
            role="img"
            aria-label="Cash-Verlauf über 13 Monate"
          >
            <polyline
              fill="none"
              stroke="#047857"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={sparkline
                .map((value, index) => {
                  const x = 10 + (index / (sparkline.length - 1)) * (SPARK_W - 20);
                  const y = SPARK_H - 10 - ((value - sparkMin) / sparkSpan) * (SPARK_H - 20);
                  return `${x},${y}`;
                })
                .join(" ")}
            />
            {sparkline.map((value, index) => {
              const x = 10 + (index / (sparkline.length - 1)) * (SPARK_W - 20);
              const y = SPARK_H - 10 - ((value - sparkMin) / sparkSpan) * (SPARK_H - 20);
              return <circle key={index} cx={x} cy={y} r="2.4" fill="#047857" />;
            })}
          </svg>
        </Hint>
      </section>
    </main>
  );
}

function BudgetCard({
  icon,
  label,
  value,
  tone,
  mark,
}: {
  icon: string;
  label: string;
  value: string;
  tone: "good" | "warn" | "bad" | "neutral";
  mark?: string;
}) {
  return (
    <div className={`finances-card is-${tone}`}>
      <span className="finances-card-label">
        <span aria-hidden="true">{icon} </span>
        {label}
      </span>
      <strong className="finances-card-value">
        {mark ? (
          <span className="finances-card-mark" aria-hidden="true">
            {mark}{" "}
          </span>
        ) : null}
        {value}
      </strong>
    </div>
  );
}
