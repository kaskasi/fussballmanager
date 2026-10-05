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
import { financeLineLabel, financeMonthForWeek } from "../../economy/finance-ledger.ts";
import { FinanceLineIcon } from "../components/FinanceLineIcon.tsx";
import {
  FINANCE_FLOW_META,
  FINANCE_FLOW_ORDER,
  resolveFinanceWaterfall,
  seasonCashSparkline13,
  seasonCategorizedFlows,
  weekPreviewFinanceLines,
  type FinanceFlowCategory,
  type MonthlyCategoryFlow,
} from "../../economy/finance-waterfall.ts";
import { formatWeeksOfWages, weeksOfWages } from "../../economy/spend-runway.ts";
import type { LeagueState } from "../../persistence/league-state.ts";
import { playerFixture } from "../../sim/league-week.ts";
import { scoutNetworkWeeklyWage, type ScoutNetworkState } from "../../scouting/scout-network.ts";
import type { CoachingStaff } from "../../staff/coaching-staff.ts";
import {
  DEFAULT_FANBASE,
  stadiumMatchdayIncome,
  type ClubStadium,
} from "../../stadium/club-stadium.ts";
import { weekCommerceOccupancy } from "../../stadium/matchday-commerce.ts";
import { weeklyPrecinctCash } from "../../stadium/precinct-effects.ts";
import { fanbaseMoodIcon, fanbaseMood, formatFanbase } from "../../stadium/fanbase.ts";
import { useT } from "../../i18n/react.ts";
import { Hint } from "../components/Hint.tsx";
import { COMMERCE_KIOSK_PHOTO } from "../assets/hub-photos.ts";
import { formatSeasonLabel } from "../../sim/season-label.ts";

const SPARK_W = 312;
const SPARK_H = 56;
const FLOW_W = 312;
const FLOW_H = 88;

/**
 * WIREFRAME: docs/prd/design.md §9.2 — Finanzen
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
  boardCashFloor = 0,
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
  boardCashFloor?: number;
  onBack: () => void;
  onOpenStadium: () => void;
}) {
  const t = useT();
  const month = financeMonthForWeek(week);
  const wageBill = weeklyWageBill(players, clubId);
  const wageStatus = wageBudgetStatus(finances, players, clubId);
  const fixture = playerFixture(league, league.matchday);
  const isHomeMatchWeek = fixture?.homeTeamId === league.player_club_id;
  const waterfall = useMemo(() => {
    const preview = weekPreviewFinanceLines({
      players,
      clubId,
      divisionId: league.division_id,
      isHomeMatchWeek,
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
    isHomeMatchWeek,
    league.division_id,
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
  const occupancy = weekCommerceOccupancy(isHomeMatchWeek, stadium);
  const merchFull = weeklyPrecinctCash(stadium.precinct, 1);
  const merchWeek = weeklyPrecinctCash(stadium.precinct, occupancy);
  const tickets = stadiumMatchdayIncome(stadium);
  const weeksLeft = weeksOfWages(finances.cash, wageBill);
  const belowFloor = boardCashFloor > 0 && finances.cash < boardCashFloor;
  const monthNegative = waterfall.net < 0;
  const flows = seasonCategorizedFlows(finances, season, week);

  return (
    <main className="finances screen-shell">
      <header className="finances-head">
        <button type="button" onClick={onBack} aria-label="Zurück zur Pipeline">
          ←
        </button>
        <div>
          <p className="eyebrow">{t("finances.eyebrow")}</p>
          <h1>{t("finances.title")}</h1>
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
                    <FinanceLineIcon kind={line.kind} />
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
          tone={finances.cash < 0 || belowFloor ? "bad" : "good"}
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

      <section className="finances-detail-cards" aria-label="Kasse im Detail">
        <article className={`finances-detail`}>
          <h2>
            <img
              className="finances-commerce-thumb"
              src={COMMERCE_KIOSK_PHOTO}
              alt=""
              aria-hidden="true"
              decoding="async"
            />
            🌭 Imbiss & Shop
          </h2>
          <p>
            <strong>{formatClubCash(merchWeek)}</strong>
            <span> diese Woche</span>
          </p>
          <p className="finances-detail-sub">
            voll {formatClubCash(merchFull)} · {Math.round(occupancy * 100)}% Auslastung
          </p>
        </article>
        <button type="button" className="finances-detail is-button" onClick={onOpenStadium}>
          <h2>🏟️ Stadion</h2>
          <p>
            <strong>{formatClubCash(isHomeMatchWeek ? tickets : 0)}</strong>
            <span>{isHomeMatchWeek ? " Heimspiel-Eintritt" : " kein Heimspiel"}</span>
          </p>
          <p className="finances-detail-sub">
            {fanbaseMoodIcon(fanbaseMood(stadium.fanbase ?? DEFAULT_FANBASE))}{" "}
            Fanbase {formatFanbase(stadium.fanbase ?? DEFAULT_FANBASE)} · voll {formatClubCash(tickets)}
          </p>
        </button>
        <article className={`finances-detail${belowFloor || finances.cash < 0 || monthNegative ? " is-warn" : ""}`}>
          <h2>🛤️ Runway</h2>
          <p>
            <strong>{formatWeeksOfWages(weeksLeft)}</strong>
            <span> Gehälter</span>
          </p>
          <p className="finances-detail-sub">
            {belowFloor
              ? `unter Vorstand ${formatClubCash(boardCashFloor)}`
              : `Puffer ${formatSignedCash(finances.cash - boardCashFloor)}`}
          </p>
        </article>
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
        <CategoryFlowChart rows={flows} currentMonth={month} />
      </section>
    </main>
  );
}

function CategoryFlowChart({
  rows,
  currentMonth,
}: {
  rows: readonly MonthlyCategoryFlow[];
  currentMonth: number;
}) {
  const visible = rows.filter((row) => row.month <= currentMonth);
  const peak = Math.max(
    ...visible.flatMap((row) =>
      FINANCE_FLOW_ORDER.map((key) => Math.abs(row[key])),
    ),
    1,
  );
  const group = (FLOW_W - 20) / 13;
  const barW = Math.max(1.4, group / (FINANCE_FLOW_ORDER.length + 1));
  const axis = FLOW_H / 2;
  const colors: Record<FinanceFlowCategory, string> = {
    matchday: "#059669",
    operations: "#0ea5e9",
    wages: "#e11d48",
    transfers: "#7c3aed",
    infrastructure: "#d97706",
    other: "#94a3b8",
  };

  return (
    <div className="finances-flows">
      <h2>Ein / Aus nach Art</h2>
      <svg viewBox={`0 0 ${FLOW_W} ${FLOW_H}`} role="img" aria-label="Kategorisierter Cashflow">
        <line x1="8" x2={FLOW_W - 8} y1={axis} y2={axis} stroke="#e2e8f0" strokeWidth="1" />
        {visible.map((row) => {
          const x0 = 10 + (row.month - 1) * group;
          return FINANCE_FLOW_ORDER.map((key, index) => {
            const amount = row[key];
            if (amount === 0) return null;
            const height = Math.max(2, (Math.abs(amount) / peak) * (axis - 6));
            const y = amount >= 0 ? axis - height : axis;
            return (
              <rect
                key={`${row.month}-${key}`}
                x={x0 + index * barW}
                y={y}
                width={barW}
                height={height}
                fill={colors[key]}
              >
                <title>{`${FINANCE_FLOW_META[key].label} M${row.month}: ${formatSignedCash(amount)}`}</title>
              </rect>
            );
          });
        })}
      </svg>
      <ul className="finances-flow-legend">
        {FINANCE_FLOW_ORDER.map((key) => (
          <li key={key}>
            <i style={{ background: colors[key] }} aria-hidden="true" />
            {FINANCE_FLOW_META[key].icon} {FINANCE_FLOW_META[key].label}
          </li>
        ))}
      </ul>
    </div>
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
