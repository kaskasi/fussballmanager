import { useMemo, useState } from "react";
import {
  Briefcase,
  ChevronRight,
  Flame,
  Landmark,
  Minus,
  Package,
  Plus,
  Shirt,
  TrendingDown,
  TrendingUp,
  Users,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Player } from "../../types/player.ts";
import {
  formatClubCash,
  formatClubCashWeekly,
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
import { FmScreenTab, FmScreenTabBar } from "../components/FmScreenTabBar.tsx";
import {
  FINANCE_FLOW_ORDER,
  financeFlowLabel,
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
import { useTutorialTabFocus } from "../tutorial/use-tutorial-tab-focus.ts";
import { formatDecimal } from "../../i18n/number-display.ts";
import { COMMERCE_KIOSK_PHOTO } from "../assets/hub-photos.ts";
import { formatSeasonLabel } from "../../sim/season-label.ts";

import { StadiumTicketsPanel } from "./StadiumTicketsPanel.tsx";

type FinancePanelTab = "overview" | "commerce" | "merchandising" | "tickets" | "runway" | "season";

const SPARK_W = 720;
const SPARK_H = 110;
const FLOW_W = 720;
const FLOW_H = 200;

/**
 * WIREFRAME: docs/prd/design.md §9.2 — Finanzen ("Umsetzung": tc panels, KPI tiles, token chart series)
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
  useTutorialTabFocus("finances", "finances.cashflow_split", "overview", setPanelTab);
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
  const occupancy = weekCommerceOccupancy(isHomeMatchWeek, stadium, season, week);
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
  const matchdayKasse = matchdayCashBreakdown(stadium, isHomeMatchWeek, season, week);
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

  const tabs: { id: FinancePanelTab; labelKey: string }[] = [
    { id: "overview", labelKey: "finances.tab.overview" },
    { id: "commerce", labelKey: "finances.tab.commerce" },
    { id: "merchandising", labelKey: "finances.tab.merch" },
    { id: "tickets", labelKey: "finances.tab.tickets" },
    { id: "runway", labelKey: "finances.tab.runway" },
    { id: "season", labelKey: "finances.tab.season" },
  ];
  const peak = Math.max(...waterfall.streams.map((entry) => Math.abs(entry.amount)), 1);
  const repayment = Math.ceil(loanAmount / bankOffer.term_weeks + loanAmount * bankOffer.apr_weekly * 0.5);

  return (
    <main className="club-shell-card-body">
      <FmScreenTabBar role="tablist" aria-label={t("finances.tabsAria")} data-coach-target={COACH_TARGET.financesTabs}>
        {tabs.map((entry) => (
          <FmScreenTab
            key={entry.id}
            role="tab"
            aria-selected={panelTab === entry.id}
            className={panelTab === entry.id ? "is-active" : undefined}
            onClick={() => setPanelTab(entry.id)}
          >
            {t(entry.labelKey)}
          </FmScreenTab>
        ))}
      </FmScreenTabBar>

      {panelTab === "overview" ? (
        <div className="fm-tab-panel">
          <div className="tc-split">
            <section
              className="tc-panel"
              aria-labelledby="finances-flow-title"
              data-coach-target={COACH_TARGET.financesCashflow}
            >
              <div className="tc-panel__head">
                <div>
                  <h2 className="tc-panel__title" id="finances-flow-title">
                    {waterfall.title}
                  </h2>
                  {waterfall.caption ? <p className="tc-caption">{waterfall.caption}</p> : null}
                </div>
                <span className={waterfall.net >= 0 ? "tc-finances__net tc-delta--up" : "tc-finances__net tc-delta--down"}>
                  {t("finances.net", { amount: signedAmount(waterfall.net) })}
                </span>
              </div>
              {waterfall.streams.length === 0 ? (
                <p className="tc-empty">{t("finances.noFlows")}</p>
              ) : (
                <ul className="tc-finances__flows">
                  {waterfall.streams.map((line) => {
                    const width = Math.max(4, (Math.abs(line.amount) / peak) * 100);
                    const income = line.amount > 0;
                    const hint =
                      line.kind === "sponsorship"
                        ? t("finances.sponsorshipInventoryHint")
                        : line.kind === "concessions" && showHospitalityHint
                          ? t("finances.concessionsHospitalityHint")
                          : undefined;
                    return (
                      <li key={line.kind} className="tc-finances__flow" title={hint}>
                        <span className="tc-finances__flow-icon" aria-hidden="true">
                          <FinanceLineIcon kind={line.kind} />
                        </span>
                        <span className="tc-finances__flow-label">{financeLineLabel(line.kind)}</span>
                        <span className="tc-finances__track" aria-hidden="true">
                          <span
                            className={income ? "tc-finances__fill tc-finances__fill--in" : "tc-finances__fill tc-finances__fill--out"}
                            style={{ width: `${width}%` }}
                          />
                        </span>
                        <span className={income ? "tc-finances__amount tc-delta--up" : "tc-finances__amount tc-delta--down"}>
                          {signedAmount(line.amount)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="tc-caption tc-cards__note">
                {t("finances.cashRange", {
                  from: formatClubCash(waterfall.snapshot.opening_cash),
                  to: formatSignedCash(waterfall.snapshot.closing_cash),
                })}
              </p>
            </section>

            <dl className="tc-stats tc-finances__kpis" aria-label={t("finances.kpiAria")}>
              <KpiTile
                icon={Wallet}
                label={t("finances.kpi.cash")}
                value={formatSignedCash(finances.cash)}
                tone={finances.cash < 0 || belowFloor ? "bad" : "good"}
              />
              <KpiTile icon={Briefcase} label={t("finances.kpi.transferPot")} value={formatClubCash(transferBudget(finances))} />
              <KpiTile
                icon={Shirt}
                label={t("finances.kpi.wageCap")}
                value={t("finances.kpi.wageCapValue", {
                  bill: formatClubCash(wageBill),
                  budget: formatClubCash(finances.wage_budget_weekly),
                })}
                tone={wageStatus === "over" ? "bad" : wageStatus === "warn" ? "warn" : "good"}
                bar={wageCapRatio}
              />
              <KpiTile
                icon={Package}
                label={t("finances.kpi.merch")}
                value={formatClubCash(merchAnalytics.weekNet)}
                detail={t("finances.full", { amount: formatClubCash(merchAnalytics.fullOccupancyNet) })}
              />
            </dl>
          </div>
        </div>
      ) : null}

      {panelTab === "commerce" ? (
        <div className="fm-tab-panel">
          <div className="tc-finances__cards">
            <section className="tc-panel" aria-labelledby="finances-concessions-title">
              <div className="tc-panel__head">
                <h2 className="tc-panel__title tc-finances__title" id="finances-concessions-title">
                  <img className="tc-finances__thumb" src={COMMERCE_KIOSK_PHOTO} alt="" aria-hidden="true" decoding="async" />
                  {t("finances.concessions.title")}
                </h2>
              </div>
              <p className="tc-finances__headline">
                <strong>{formatClubCash(concessionsWeek)}</strong> {t("finances.thisWeek")}
              </p>
              <dl className="tc-kv">
                <dt>{t("finances.atFullOccupancy")}</dt>
                <dd>{formatClubCash(concessionsFull)}</dd>
                <dt>{t("finances.occupancy")}</dt>
                <dd>{t("finances.percent", { value: Math.round(occupancy * 100) })}</dd>
              </dl>
              <p className="tc-caption tc-cards__note">{t("finances.concessions.noShop")}</p>
            </section>

            <button type="button" className="tc-panel tc-finances__link" onClick={onOpenStadium}>
              <span className="tc-panel__head">
                <span className="tc-panel__title tc-finances__title">
                  <Landmark className="tc-icon" aria-hidden />
                  {t("finances.stadium.title")}
                </span>
                <ChevronRight className="tc-icon" aria-hidden />
              </span>
              <span className="tc-finances__headline">
                <strong>{formatClubCash(isHomeMatchWeek ? tickets : 0)}</strong>{" "}
                {isHomeMatchWeek ? t("finances.stadium.homeGate") : t("finances.stadium.noHome")}
              </span>
              <span className="tc-kv">
                <span className="tc-finances__kv-dt">{t("finances.stadium.fanbase")}</span>
                <span className="tc-finances__kv-dd">
                  <FanbaseMoodIcon mood={fanbaseMood(stadium.fanbase ?? DEFAULT_FANBASE)} />{" "}
                  {formatFanbase(stadium.fanbase ?? DEFAULT_FANBASE)}
                </span>
                <span className="tc-finances__kv-dt">{t("finances.atFullOccupancy")}</span>
                <span className="tc-finances__kv-dd">{formatClubCash(tickets)}</span>
              </span>
            </button>

            {onStadiumChange ? (
              <>
                <PriceStepper
                  icon={Utensils}
                  title={t("finances.price.kiosk")}
                  price={concessionPrices.kiosk_unit_price_eur}
                  lowerLabel={t("finances.price.kioskLower")}
                  raiseLabel={t("finances.price.kioskRaise")}
                  onLower={() => onStadiumChange(adjustConcessionPrice(stadium, "kiosk", -CONCESSION_PRICE_STEP))}
                  onRaise={() => onStadiumChange(adjustConcessionPrice(stadium, "kiosk", CONCESSION_PRICE_STEP))}
                  takings={matchdayKasse.kiosk}
                  full={matchdayKasse.kiosk / Math.max(occupancy, 0.01)}
                />
                <PriceStepper
                  icon={Flame}
                  title={t("finances.price.beer")}
                  price={concessionPrices.beer_unit_price_eur}
                  lowerLabel={t("finances.price.beerLower")}
                  raiseLabel={t("finances.price.beerRaise")}
                  onLower={() => onStadiumChange(adjustConcessionPrice(stadium, "beer", -CONCESSION_PRICE_STEP))}
                  onRaise={() => onStadiumChange(adjustConcessionPrice(stadium, "beer", CONCESSION_PRICE_STEP))}
                  takings={matchdayKasse.beer}
                  full={matchdayKasse.beer / Math.max(occupancy, 0.01)}
                />
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {panelTab === "merchandising" ? (
        <div className="fm-tab-panel">
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
        <div className="fm-tab-panel">
          <StadiumTicketsPanel stadium={stadium} finances={finances} season={season} week={week} />
        </div>
      ) : null}

      {panelTab === "runway" ? (
        <div className="fm-tab-panel">
          <div className="tc-finances__cards">
            <section className="tc-panel" aria-labelledby="finances-runway-title">
              <div className="tc-panel__head">
                <h2 className="tc-panel__title tc-finances__title" id="finances-runway-title">
                  <TrendingDown className="tc-icon" aria-hidden />
                  {t("finances.runway.title")}
                </h2>
              </div>
              <p className="tc-finances__headline">
                <strong>{formatWeeksOfWages(weeksLeft)}</strong> {t("finances.runway.ofWages")}
              </p>
              <dl className="tc-kv">
                <dt>{t("finances.runway.boardFloor")}</dt>
                <dd>{formatClubCash(boardCashFloor)}</dd>
                <dt>{t("finances.runway.buffer")}</dt>
                <dd className={belowFloor ? "tc-attention" : undefined}>{formatSignedCash(finances.cash - boardCashFloor)}</dd>
              </dl>
              {belowFloor || finances.cash < 0 || monthNegative ? (
                <p className="tc-callout tc-callout--warn tc-cards__note">
                  {belowFloor
                    ? t("finances.runway.belowFloor", { amount: formatClubCash(boardCashFloor) })
                    : finances.cash < 0
                      ? t("finances.runway.negativeCash")
                      : t("finances.runway.negativeMonth")}
                </p>
              ) : null}
            </section>

            <section className="tc-panel" aria-labelledby="finances-bank-title">
              <div className="tc-panel__head">
                <h2 className="tc-panel__title tc-finances__title" id="finances-bank-title">
                  <Landmark className="tc-icon" aria-hidden />
                  {t("finances.bank.title")}
                </h2>
              </div>
              {financing.active_bank_loan ? (
                <dl className="tc-kv">
                  <dt>{t("finances.bank.remaining")}</dt>
                  <dd>{formatClubCash(financing.active_bank_loan.remaining)}</dd>
                  <dt>{t("finances.bank.rate")}</dt>
                  <dd>{formatClubCashWeekly(financing.active_bank_loan.weekly_payment)}</dd>
                </dl>
              ) : (
                <div className="tc-stack">
                  <p className="tc-caption">{t("finances.bank.lead")}</p>
                  <p className={bankOffer.allowed ? "tc-callout tc-callout--ok" : "tc-callout tc-callout--no"}>
                    {bankOffer.allowed ? t("finances.bank.yes") : (bankOffer.reason ?? t("finances.bank.no"))}
                  </p>
                  {bankOffer.allowed && onDrawBankLoan ? (
                    <>
                      <label className="tc-range">
                        <span className="tc-range__head">
                          <span>{t("finances.bank.amount")}</span>
                          <strong>{formatClubCash(loanAmount)}</strong>
                        </span>
                        <input
                          type="range"
                          min={MIN_BANK_LOAN}
                          max={bankOffer.max_principal}
                          step={50_000}
                          value={loanAmount}
                          onChange={(event) => setLoanDraft(Number(event.target.value))}
                          aria-valuetext={formatClubCash(loanAmount)}
                        />
                      </label>
                      <p className="tc-caption">
                        {t("finances.bank.repayment", { amount: formatClubCashWeekly(repayment) })}
                      </p>
                      <button type="button" className="tc-btn tc-btn--primary tc-finances__cta" onClick={() => onDrawBankLoan(loanAmount)}>
                        {t("finances.bank.draw")}
                      </button>
                    </>
                  ) : null}
                </div>
              )}
            </section>
          </div>
        </div>
      ) : null}

      {panelTab === "season" ? (
        <div className="fm-tab-panel">
          <div className="tc-stack">
            <section className="tc-panel" aria-labelledby="finances-spark-title">
              <div className="tc-panel__head">
                <h2 className="tc-panel__title" id="finances-spark-title">
                  {t("finances.season.cashTitle", { season: formatSeasonLabel(season) })}
                </h2>
                <span className="tc-caption">{t("finances.season.cashHint")}</span>
              </div>
              <CashSparkline values={sparkline} />
            </section>
            <CategoryFlowChart rows={flows} currentMonth={month} />
          </div>
        </div>
      ) : null}
    </main>
  );
}

function signedAmount(amount: number): string {
  return amount > 0 ? `+${formatSignedCash(amount)}` : formatSignedCash(amount);
}

function CashSparkline({ values }: { values: readonly number[] }) {
  const t = useT();
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, Math.abs(max) * 0.04, 1);
  const point = (value: number, index: number) => ({
    x: 12 + (index / Math.max(1, values.length - 1)) * (SPARK_W - 24),
    y: SPARK_H - 12 - ((value - min) / span) * (SPARK_H - 24),
  });
  const first = values[0] ?? 0;
  const last = values.at(-1) ?? 0;
  return (
    <figure className="tc-finances__chart">
      <svg
        viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
        role="img"
        aria-label={t("finances.season.cashAria", { from: formatClubCash(first), to: formatClubCash(last) })}
      >
        <polyline
          className="tc-finances__spark-line"
          points={values.map((value, index) => {
            const p = point(value, index);
            return `${p.x},${p.y}`;
          }).join(" ")}
        />
        {values.map((value, index) => {
          const p = point(value, index);
          return (
            <circle key={index} className="tc-finances__spark-dot" cx={p.x} cy={p.y} r="4">
              <title>{t("finances.season.monthValue", { month: index + 1, amount: formatSignedCash(value) })}</title>
            </circle>
          );
        })}
      </svg>
      <figcaption className="tc-finances__chart-axis tc-caption">
        <span>{t("finances.season.monthShort", { month: 1 })} · {formatSignedCash(first)}</span>
        <span>{t("finances.season.monthShort", { month: values.length })} · {formatSignedCash(last)}</span>
      </figcaption>
    </figure>
  );
}

/** Categorical slots (design-tokens --series-1…6), fixed order — never cycled. */
const FLOW_SERIES: Record<FinanceFlowCategory, string> = {
  matchday: "var(--series-1)",
  operations: "var(--series-2)",
  wages: "var(--series-3)",
  transfers: "var(--series-4)",
  infrastructure: "var(--series-5)",
  other: "var(--series-6)",
};

function CategoryFlowChart({ rows, currentMonth }: { rows: readonly MonthlyCategoryFlow[]; currentMonth: number }) {
  const t = useT();
  const visible = rows.filter((row) => row.month <= currentMonth);
  const peak = Math.max(...visible.flatMap((row) => FINANCE_FLOW_ORDER.map((key) => Math.abs(row[key]))), 1);
  const group = (FLOW_W - 24) / 13;
  const barW = Math.max(2, group / (FINANCE_FLOW_ORDER.length + 1));
  const axis = FLOW_H / 2;
  const hasData = visible.some((row) => FINANCE_FLOW_ORDER.some((key) => row[key] !== 0));

  return (
    <section className="tc-panel" aria-labelledby="finances-flows-title">
      <div className="tc-panel__head">
        <h2 className="tc-panel__title" id="finances-flows-title">
          {t("finances.season.flowsTitle")}
        </h2>
        <span className="tc-caption">{t("finances.season.flowsHint")}</span>
      </div>
      {!hasData ? (
        <p className="tc-empty">{t("finances.season.flowsEmpty")}</p>
      ) : (
      <>
      <figure className="tc-finances__chart">
        <svg viewBox={`0 0 ${FLOW_W} ${FLOW_H}`} role="img" aria-label={t("finances.season.flowsAria")}>
          <line className="tc-finances__axis" x1="8" x2={FLOW_W - 8} y1={axis} y2={axis} />
          {visible.map((row) => {
            const x0 = 12 + (row.month - 1) * group;
            return FINANCE_FLOW_ORDER.map((key, index) => {
              const amount = row[key];
              if (amount === 0) return null;
              const height = Math.max(2, (Math.abs(amount) / peak) * (axis - 8));
              return (
                <rect
                  key={`${row.month}-${key}`}
                  x={x0 + index * barW}
                  y={amount >= 0 ? axis - height : axis}
                  width={Math.max(1, barW - 1)}
                  height={height}
                  rx="1"
                  style={{ fill: FLOW_SERIES[key] }}
                >
                  <title>
                    {t("finances.season.flowValue", {
                      category: financeFlowLabel(key),
                      month: row.month,
                      amount: formatSignedCash(amount),
                    })}
                  </title>
                </rect>
              );
            });
          })}
        </svg>
      </figure>
      <ul className="tc-legend">
        {FINANCE_FLOW_ORDER.map((key) => (
          <li key={key} className="tc-legend__item">
            <i className="tc-finances__swatch" style={{ background: FLOW_SERIES[key] }} aria-hidden="true" />
            {financeFlowLabel(key)}
          </li>
        ))}
      </ul>
      <details className="tc-finances__table">
        <summary className="tc-linkbtn">{t("finances.season.showTable")}</summary>
        <div className="tc-table-wrap">
          <table className="tc-table tc-table--compact">
            <thead>
              <tr>
                <th scope="col">{t("finances.season.month")}</th>
                {FINANCE_FLOW_ORDER.map((key) => (
                  <th key={key} scope="col" className="tc-num">
                    {financeFlowLabel(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.month}>
                  <th scope="row">{t("finances.season.monthShort", { month: row.month })}</th>
                  {FINANCE_FLOW_ORDER.map((key) => (
                    <td key={key} className="tc-num">
                      {row[key] === 0 ? "—" : formatSignedCash(row[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      </>
      )}
    </section>
  );
}

function FanbaseMoodIcon({ mood }: { mood: FanbaseMood }) {
  const props = { className: "tc-icon tc-finances__mood", "aria-hidden": true as const };
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

function PriceStepper({
  icon: Icon,
  title,
  price,
  lowerLabel,
  raiseLabel,
  onLower,
  onRaise,
  takings,
  full,
}: {
  icon: LucideIcon;
  title: string;
  price: number;
  lowerLabel: string;
  raiseLabel: string;
  onLower: () => void;
  onRaise: () => void;
  takings: number;
  full: number;
}) {
  const t = useT();
  return (
    <section className="tc-panel" aria-label={title}>
      <div className="tc-panel__head">
        <h2 className="tc-panel__title tc-finances__title">
          <Icon className="tc-icon" aria-hidden />
          {title}
        </h2>
      </div>
      <div className="tc-finances__stepper">
        <button type="button" className="tc-iconbtn" aria-label={lowerLabel} onClick={onLower}>
          <Minus className="tc-icon" aria-hidden />
        </button>
        <output className="tc-finances__price">{t("finances.price.value", { amount: formatDecimal(price, 2) })}</output>
        <button type="button" className="tc-iconbtn" aria-label={raiseLabel} onClick={onRaise}>
          <Plus className="tc-icon" aria-hidden />
        </button>
      </div>
      <dl className="tc-kv tc-cards__note">
        <dt>{t("finances.price.takings")}</dt>
        <dd>{formatClubCash(takings)}</dd>
        <dt>{t("finances.atFullOccupancy")}</dt>
        <dd>{formatClubCash(full)}</dd>
      </dl>
    </section>
  );
}

function KpiTile({
  icon: Icon,
  label,
  value,
  tone = "neutral",
  detail,
  bar,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "good" | "warn" | "bad" | "neutral";
  detail?: string;
  bar?: number;
}) {
  return (
    <div className="tc-stats__item">
      <dt className="tc-label tc-stats__label">
        <Icon className="tc-icon" aria-hidden />
        {label}
      </dt>
      <dd>
        <span className={`tc-stat__value tc-finances__kpi--${tone}`}>{value}</span>
        {detail ? <span className="tc-caption">{detail}</span> : null}
        {bar !== undefined ? (
          <span className="tc-bar" aria-hidden="true">
            <span
              className={tone === "bad" ? "tc-bar__fill tc-finances__fill--out" : tone === "warn" ? "tc-bar__fill tc-bar__fill--warning" : "tc-bar__fill"}
              style={{ width: `${Math.round(bar * 100)}%` }}
            />
          </span>
        ) : null}
      </dd>
    </div>
  );
}
