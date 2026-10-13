import { useMemo, useState, type ComponentType } from "react";
import {
  Briefcase,
  Flame,
  Landmark,
  Package,
  Shirt,
  TrendingDown,
  TrendingUp,
  Users,
  Utensils,
  Wallet,
} from "lucide-react";
import type { Player } from "../../types/player.ts";
import {
  formatClubCash,
  formatSignedCash,
  leagueTablePlace,
  transferBudget,
  wageBudgetStatus,
  weeklyWageBill,
  type ClubFinances,
} from "../../economy/club-finances.ts";
import {
  evaluateBankLoan,
  MIN_BANK_LOAN,
  type FinancingCareerState,
} from "../../economy/financing.ts";
import type { DivisionEconomyId } from "../../economy/division-economy.ts";
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
import {
  adjustConcessionPrice,
  CONCESSION_PRICE_STEP,
  resolveConcessionPrices,
} from "../../stadium/concession-prices.ts";
import { matchdayCashBreakdown, weekCommerceOccupancy } from "../../stadium/matchday-commerce.ts";
import { computeHospitalityPreview } from "../../stadium/hospitality.ts";
import { weeklyPrecinctConcessionsCash } from "../../stadium/precinct-effects.ts";
import { clubFlavorFanbase } from "../../sim/club-profiles.ts";
import { buildMerchandisingAnalytics } from "../../economy/merchandising-analytics.ts";
import { MerchandisingAnalyticsPanel } from "./MerchandisingAnalyticsPanel.tsx";
import { fanbaseMood, formatFanbase, type FanbaseMood } from "../../stadium/fanbase.ts";
import { useT } from "../../i18n/react.ts";
import { COACH_TARGET } from "../../tutorial/tutorial-targets.ts";
import { Hint } from "../components/Hint.tsx";
import { COMMERCE_KIOSK_PHOTO } from "../assets/hub-photos.ts";
import { formatSeasonLabel } from "../../sim/season-label.ts";

import { StadiumTicketsPanel } from "./StadiumTicketsPanel.tsx";

type FinancePanelTab = "overview" | "commerce" | "merchandising" | "tickets" | "runway" | "season";

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
  boardPressure = 0,
  financing,
  masterSeed,
  onOpenStadium,
  onStadiumChange,
  onDrawBankLoan,
}: {
  finances: ClubFinances;
  players: readonly Player[];
  clubId: string;
  season: number;
  week: number;
  masterSeed: number;
  stadium: ClubStadium;
  league: LeagueState;
  coachingStaff: CoachingStaff;
  scoutNetwork: ScoutNetworkState;
  boardCashFloor?: number;
  boardPressure?: number;
  financing: FinancingCareerState;
  onOpenStadium: () => void;
  onStadiumChange?: (stadium: ClubStadium) => void;
  onDrawBankLoan?: (amount: number) => void;
}) {
  const t = useT();
  const [panelTab, setPanelTab] = useState<FinancePanelTab>("overview");
  const [loanDraft, setLoanDraft] = useState(MIN_BANK_LOAN);
  const month = financeMonthForWeek(week);
  const wageBill = weeklyWageBill(players, clubId);
  const wageStatus = wageBudgetStatus(finances, players, clubId);
  const fixture = playerFixture(league, league.matchday);
  const isHomeMatchWeek = fixture?.homeTeamId === league.player_club_id;
  const hospitalityPreview = useMemo(() => {
    const ownFans = stadium.fanbase ?? DEFAULT_FANBASE;
    const opponentId = isHomeMatchWeek && fixture ? fixture.awayTeamId : null;
    return computeHospitalityPreview({
      precinct: stadium.precinct,
      ownFanbase: ownFans,
      isHomeMatchWeek,
      opponentFanbase: opponentId ? clubFlavorFanbase(opponentId) : DEFAULT_FANBASE,
      season,
      week,
      restaurantViralUntilWeek: stadium.restaurant_viral_until_week,
      restaurantOvertimeWeek: stadium.restaurant_overtime_week,
    });
  }, [fixture, isHomeMatchWeek, season, stadium, week]);
  const showHospitalityHint =
    hospitalityPreview.totalWeeklyIncome > 0 ||
    hospitalityPreview.restaurant?.viral === true ||
    hospitalityPreview.overtimeCostThisWeek > 0;
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
      hospitalityIncome: hospitalityPreview.totalWeeklyIncome,
      overtimeCost: hospitalityPreview.overtimeCostThisWeek,
    });
    return resolveFinanceWaterfall(finances, season, week, preview);
  }, [
    coachingStaff,
    clubId,
    finances,
    hospitalityPreview.overtimeCostThisWeek,
    hospitalityPreview.totalWeeklyIncome,
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
  const fanbase = stadium.fanbase;
  const concessionPrices = resolveConcessionPrices(stadium);
  const concessionsFull = weeklyPrecinctConcessionsCash(
    stadium.precinct,
    1,
    fanbase,
    isHomeMatchWeek,
    concessionPrices,
  );
  const concessionsWeek = weeklyPrecinctConcessionsCash(
    stadium.precinct,
    occupancy,
    fanbase,
    isHomeMatchWeek,
    concessionPrices,
  );
  const matchdayKasse = matchdayCashBreakdown(stadium, isHomeMatchWeek);
  const merchAnalytics = buildMerchandisingAnalytics(
    stadium,
    players,
    clubId,
    isHomeMatchWeek,
    week,
    season,
    masterSeed,
  );
  const tickets = stadiumMatchdayIncome(stadium, season, week);
  const weeksLeft = weeksOfWages(finances.cash, wageBill);
  const belowFloor = boardCashFloor > 0 && finances.cash < boardCashFloor;
  const monthNegative = waterfall.net < 0;
  const flows = seasonCategorizedFlows(finances, season, week);

  const wageCapRatio =
    finances.wage_budget_weekly > 0
      ? Math.min(1, wageBill / finances.wage_budget_weekly)
      : 0;

  const bankOffer = evaluateBankLoan({
    finances,
    wageBillWeekly: wageBill,
    runwayWeeks: weeksLeft,
    leaguePlace: leagueTablePlace(league),
    leagueSize: league.club_ids.length,
    boardPressure,
    divisionId: league.division_id as DivisionEconomyId,
    financing,
    season,
    week,
  });
  const loanAmount = Math.min(
    bankOffer.max_principal,
    Math.max(MIN_BANK_LOAN, loanDraft),
  );

  return (
    <main className="finances club-shell-card-body">
      <div className="fm-tab-bar" role="tablist" aria-label="Finanz-Bereiche">
        {(
          [
            ["overview", "Übersicht"],
            ["commerce", "Commerce"],
            ["merchandising", "Merch"],
            ["tickets", "Eintritt"],
            ["runway", "Runway"],
            ["season", "Saison"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={panelTab === id}
            className={panelTab === id ? "fm-tab is-active" : "fm-tab"}
            onClick={() => setPanelTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {panelTab === "overview" ? (
          <div className="fm-tab-panel finances-shell finances-hero" aria-label="Cashflow und Budget">
        <div className="finances-hero-grid">
          <section
            className="finances-waterfall"
            aria-label={`Cashflow ${waterfall.title}`}
            data-coach-target={COACH_TARGET.financesCashflow}
          >
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
                      <span
                        className="finances-bar-label"
                        title={
                          line.kind === "sponsorship"
                            ? t("finances.sponsorshipInventoryHint")
                            : line.kind === "concessions" && showHospitalityHint
                              ? t("finances.concessionsHospitalityHint")
                              : undefined
                        }
                      >
                        {line.kind === "concessions" && showHospitalityHint ? (
                          <Hint text={t("finances.concessionsHospitalityHint")} block>
                            {financeLineLabel(line.kind)}
                          </Hint>
                        ) : (
                          financeLineLabel(line.kind)
                        )}
                      </span>
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
              icon={Wallet}
              label="Kasse"
              value={formatSignedCash(finances.cash)}
              tone={finances.cash < 0 || belowFloor ? "bad" : "good"}
            />
            <BudgetCard
              icon={Briefcase}
              label="Transfer-Topf"
              value={formatClubCash(transferBudget(finances))}
              tone="neutral"
            />
            <BudgetCard
              icon={Shirt}
              label="Gehalts-Cap"
              value={`${formatClubCash(wageBill).replace("€ ", "")} / ${formatClubCash(finances.wage_budget_weekly).replace("€ ", "")}`}
              tone={wageStatus === "over" ? "bad" : wageStatus === "warn" ? "warn" : "good"}
              wageCapRatio={wageCapRatio}
              wageCapTone={wageStatus}
            />
            <BudgetCard
              icon={Package}
              label="Merchandising"
              value={formatClubCash(merchAnalytics.weekNet)}
              tone="neutral"
              detail={`voll ${formatClubCash(merchAnalytics.fullOccupancyNet)}`}
            />
          </section>
        </div>
          </div>
        ) : null}

        {panelTab === "commerce" ? (
          <div className="fm-tab-panel finances-shell" aria-label="Commerce">
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
            <Utensils size={18} strokeWidth={2.5} aria-hidden />
            Imbiss & Bewirtung
          </h2>
          <p>
            <strong>{formatClubCash(concessionsWeek)}</strong>
            <span> diese Woche</span>
          </p>
          <p className="finances-detail-sub">
            voll {formatClubCash(concessionsFull)} · {Math.round(occupancy * 100)}% Auslastung · ohne Shop
          </p>
        </article>
        <button type="button" className="finances-detail is-button" onClick={onOpenStadium}>
          <h2>
            <Landmark size={18} strokeWidth={2.5} aria-hidden />
            Stadion
          </h2>
          <p>
            <strong>{formatClubCash(isHomeMatchWeek ? tickets : 0)}</strong>
            <span>{isHomeMatchWeek ? " Heimspiel-Eintritt" : " kein Heimspiel"}</span>
          </p>
          <p className="finances-detail-sub">
            <FanbaseMoodIcon mood={fanbaseMood(stadium.fanbase ?? DEFAULT_FANBASE)} /> Fanbase{" "}
            {formatFanbase(stadium.fanbase ?? DEFAULT_FANBASE)} · voll {formatClubCash(tickets)}
          </p>
        </button>
      </section>
      {onStadiumChange ? (
        <section className="finances-detail-cards" aria-label="Imbiss-Preise">
          <article className="finances-detail">
            <h2>
              <Utensils size={18} strokeWidth={2.5} aria-hidden />
              Würstchen · €/Portion
            </h2>
            <div className="stadium-price">
              <button
                type="button"
                aria-label="Würstchenpreis senken"
                onClick={() => onStadiumChange(adjustConcessionPrice(stadium, "kiosk", -CONCESSION_PRICE_STEP))}
              >
                −
              </button>
              <span>€ {concessionPrices.kiosk_unit_price_eur.toFixed(2).replace(".", ",")}</span>
              <button
                type="button"
                aria-label="Würstchenpreis erhöhen"
                onClick={() => onStadiumChange(adjustConcessionPrice(stadium, "kiosk", CONCESSION_PRICE_STEP))}
              >
                +
              </button>
            </div>
            <p className="finances-detail-sub">
              Kasse {formatClubCash(matchdayKasse.kiosk)} · voll {formatClubCash(matchdayKasse.kiosk / Math.max(occupancy, 0.01))}
            </p>
          </article>
          <article className="finances-detail">
            <h2>
              <Flame size={18} strokeWidth={2.5} aria-hidden />
              Bier · €/Maß
            </h2>
            <div className="stadium-price">
              <button
                type="button"
                aria-label="Bierpreis senken"
                onClick={() => onStadiumChange(adjustConcessionPrice(stadium, "beer", -CONCESSION_PRICE_STEP))}
              >
                −
              </button>
              <span>€ {concessionPrices.beer_unit_price_eur.toFixed(2).replace(".", ",")}</span>
              <button
                type="button"
                aria-label="Bierpreis erhöhen"
                onClick={() => onStadiumChange(adjustConcessionPrice(stadium, "beer", CONCESSION_PRICE_STEP))}
              >
                +
              </button>
            </div>
            <p className="finances-detail-sub">
              Kasse {formatClubCash(matchdayKasse.beer)} · voll{" "}
              {formatClubCash(matchdayKasse.beer / Math.max(occupancy, 0.01))}
            </p>
          </article>
        </section>
      ) : null}
          </div>
        ) : null}

        {panelTab === "merchandising" ? (
          <div className="fm-tab-panel finances-shell" aria-label="Merchandising">
            <MerchandisingAnalyticsPanel
              stadium={stadium}
              players={players}
              clubId={clubId}
              isHomeMatchWeek={isHomeMatchWeek}
              week={week}
              season={season}
              masterSeed={masterSeed}
            />
          </div>
        ) : null}

        {panelTab === "tickets" ? (
          <div className="fm-tab-panel finances-shell" aria-label="Eintritt">
            <StadiumTicketsPanel stadium={stadium} finances={finances} season={season} week={week} />
          </div>
        ) : null}

        {panelTab === "runway" ? (
          <div className="fm-tab-panel finances-shell" aria-label="Runway">
        <article className={`finances-detail finances-detail--solo${belowFloor || finances.cash < 0 || monthNegative ? " is-warn" : ""}`}>
          <h2>
            <TrendingDown size={18} strokeWidth={2.5} aria-hidden />
            Runway
          </h2>
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
        <article className="finances-detail finances-detail--solo" aria-label="Regionalbank">
          <h2>
            <Landmark size={18} strokeWidth={2.5} aria-hidden />
            Bank
          </h2>
          {financing.active_bank_loan ? (
            <>
              <p>
                <strong>{formatClubCash(financing.active_bank_loan.remaining)}</strong>
                <span> Restschuld</span>
              </p>
              <p className="finances-detail-sub">
                Rate {formatClubCash(financing.active_bank_loan.weekly_payment)}/Wo
              </p>
            </>
          ) : (
            <>
              <p className="finances-detail-sub">
                Für Gelände, Tribüne oder Camp — Tilgung läuft wöchentlich.
              </p>
              <p className={`finances-bank-status${bankOffer.allowed ? " is-ok" : " is-warn"}`}>
                {bankOffer.allowed ? "Bank sagt ja" : bankOffer.reason ?? "Kein Kredit"}
              </p>
              {bankOffer.allowed && onDrawBankLoan ? (
                <>
                  <label className="finances-bank-slider">
                    <span>{formatClubCash(loanAmount)}</span>
                    <input
                      type="range"
                      min={MIN_BANK_LOAN}
                      max={bankOffer.max_principal}
                      step={50_000}
                      value={loanAmount}
                      onChange={(event) => setLoanDraft(Number(event.target.value))}
                    />
                  </label>
                  <p className="finances-detail-sub">
                    Tilgung ca.{" "}
                    {formatClubCash(
                      Math.ceil(
                        loanAmount / bankOffer.term_weeks +
                          loanAmount * bankOffer.apr_weekly * 0.5,
                      ),
                    )}
                    /Wo
                  </p>
                  <button
                    type="button"
                    className="fm-btn fm-btn-secondary"
                    onClick={() => onDrawBankLoan(loanAmount)}
                  >
                    Darlehen aufnehmen
                  </button>
                </>
              ) : null}
            </>
          )}
        </article>
          </div>
        ) : null}

        {panelTab === "season" ? (
          <div className="fm-tab-panel finances-shell" aria-label="Saison">
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
              stroke="currentColor"
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
              return <circle key={index} cx={x} cy={y} r="2.4" fill="currentColor" />;
            })}
          </svg>
        </Hint>
        <CategoryFlowChart rows={flows} currentMonth={month} />
      </section>
          </div>
        ) : null}
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

function FanbaseMoodIcon({ mood }: { mood: FanbaseMood }) {
  const props = { size: 16, strokeWidth: 2.5, "aria-hidden": true as const };
  switch (mood) {
    case "strong":
      return <Flame {...props} />;
    case "growing":
      return <TrendingUp {...props} />;
    case "steady":
      return <Users {...props} />;
    case "weak":
      return <TrendingDown {...props} />;
  }
}

function BudgetCard({
  icon: Icon,
  label,
  value,
  tone,
  detail,
  wageCapRatio,
  wageCapTone,
}: {
  icon: ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  tone: "good" | "warn" | "bad" | "neutral";
  detail?: string;
  wageCapRatio?: number;
  wageCapTone?: "good" | "warn" | "over";
}) {
  return (
    <div className={`finances-card is-${tone}`}>
      <span className="finances-card-label">
        <Icon size={16} strokeWidth={2.5} aria-hidden />
        {label}
      </span>
      <strong className="finances-card-value">{value}</strong>
      {detail ? <span className="finances-card-detail">{detail}</span> : null}
      {wageCapRatio !== undefined ? (
        <span className="finances-wage-cap-bar" aria-hidden="true">
          <span
            className={`finances-wage-cap-fill${wageCapTone === "over" ? " is-over" : wageCapTone === "warn" ? " is-warn" : ""}`}
            style={{ width: `${Math.round(wageCapRatio * 100)}%` }}
          />
        </span>
      ) : null}
    </div>
  );
}
