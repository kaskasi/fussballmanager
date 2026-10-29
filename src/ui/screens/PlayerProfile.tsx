/**
 * WIREFRAME: docs/prd/design.md §9.8 — Spielerprofil (hub and spoke).
 * Identity rail on the left stays put; Overview / History / Season stats switch on the right.
 * Design-system components (`tc-`), layout in `design/surfaces/profile.css`. Stamps: Player.stamps (PRD 07.5 / F2.8).
 */
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { UNSOLICITED_PREMIUM } from "../../transfers/unsolicited-approach.ts";
import {
  Award,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flag,
  Footprints,
  Hourglass,
  Lightbulb,
  PenLine,
  Star,
  Users,
} from "lucide-react";
import type { IndividualProgram } from "../../development/individual-training.ts";
import { programLabel } from "../../development/individual-training.ts";
import type { TrainingSlot } from "../../development/training-units.ts";
import {
  profileMenuItems,
  profileOverflowMenuItems,
  type PlayerProfileAction,
} from "../../player/profile-actions.ts";
import { ProfileActionsMenu } from "../components/ProfileActionsMenu.tsx";
import { formatClubCash } from "../../economy/club-finances.ts";
import {
  contractTalkLock,
  defaultContractOffer,
  FRUSTRATION_THRESHOLD,
  type ContractOffer,
} from "../../transfers/contract-talks.ts";
import type { Player } from "../../types/player.ts";
import { careerSeasonStatsForSeason, listCareerStatSeasons } from "../../player/season-stats.ts";
import { retiresAtSeasonEnd } from "../../development/own-retirement.ts";
import { DIVISION_ECONOMY, type DivisionEconomyId } from "../../economy/division-economy.ts";
import { loanClubName } from "../../transfers/loan-roster.ts";
import { DEFAULT_GENERATED_WORLD } from "../../sim/league-divisions.ts";
import { formatSeasonLabel, seasonCalendarYear } from "../../sim/season-label.ts";
import { t as translate } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import { scheduledMoveLabel } from "../../transfers/scheduled-transfers.ts";
import { nextTransferWindowStart } from "../../sim/game-calendar.ts";
import { ContractTalksModal } from "../components/ContractTalksModal.tsx";
import { SaleConfirmModal } from "../components/SaleConfirmModal.tsx";
import { MarketValueBreakdownStrip } from "../components/MarketValueBreakdownStrip.tsx";
import { formatPlayerName, formatPlayerPositionLabel } from "../../types/player-display.ts";
import { confidenceLabel, type AbilityEstimate } from "../../scouting/estimate-model.ts";
import {
  formatScoutCa,
  formatScoutMarketValue,
  formatScoutStateValue,
  scoutMarketValueBounds,
  scoutReveal,
} from "../../scouting/scout-visibility.ts";
import { EXPERIENCE_APPS_SOFT_CAP } from "../../development/experience.ts";
import { injuryTypeLabel } from "../../development/injury-roll.ts";
import { staerkeLaneShort } from "../../development/position-lanes.ts";
import { Hint } from "../components/Hint.tsx";
import { PlayerPortrait } from "../components/PlayerPortrait.tsx";
import { achievementBadges, contractView, flavorForScout } from "../player-flavor.ts";
import { achievementDisplayLabel } from "../../player/achievements.ts";
import { formatCaDelta, formatRecentGrowth, weeklyCaDelta } from "../../player/ca-tracking.ts";
import {
  attributeBars,
  attributeEncyclopediaCount,
  attributeLabel,
  dossierTrainingTarget,
  FAEHIGKEIT_HUNGER_SLOTS,
  formMark,
  fullSkillSheet,
  growthPolyline,
  growthSeries,
  hexRegularPoints,
  hexValuePoints,
  hexVertex,
  layoutGrowthChart,
  playerStampGateMarkers,
  positionLane,
  profileExperienceBar,
  profileFacts,
  staerkeAlsLanes,
  stampGateTitle,
  stateMark,
  visibleBreakoutFlags,
  visibleBreakoutLabel,
  type AttributeBar,
  type DossierTrainingAccent,
  type ExperienceBar,
  type StateMark,
  type StateTone,
} from "../player-profile.ts";
import {
  activeStampBadges,
  eligibleTrainStamps,
  stampLabel,
  stampPathLabel,
  stampDefinition,
} from "../../development/ability-stamps.ts";
import { formatGrowthDelta } from "../../player/growth-history.ts";
import { ratingBand } from "../design/rating-band.ts";
import { useMobileNarrow } from "../hooks/use-mobile-narrow.ts";

type ProfileTab = "overview" | "development" | "stats";

const PROFILE_TABS: { id: ProfileTab; labelKey: string }[] = [
  { id: "overview", labelKey: "profile.tab.overview" },
  { id: "development", labelKey: "profile.tab.development" },
  { id: "stats", labelKey: "profile.tab.stats" },
];

/** Shown only under Contract — not duplicated in the identity rail. */
const PROFILE_CAREER_ACTIONS = new Set<PlayerProfileAction>([
  "sign_contract",
  "promote_u19",
  "promote_pro",
]);

export interface PlayerProfileProps {
  player: Player;
  owned: boolean;
  scoutEstimate?: AbilityEstimate;
  scouting?: boolean;
  week?: number;
  season?: number;
  transferWindowOpen?: boolean;
  transferBudget?: number;
  purchasePrice?: number;
  saleOffer?: number;
  saleBlockedReason?: string | null;
  /** Own player with an agreed move waiting for the next window: no new contract, listing, loan or release. */
  transferLockReason?: string | null;
  shortlisted?: boolean;
  individualPrograms?: readonly IndividualProgram[];
  trainingPlan?: readonly TrainingSlot[];
  onOpenYouth?: () => void;
  onOpenTraining?: () => void;
  onStartStampProgram?: (stampId: string) => void;
  onAssignScout?: () => void;
  onToggleShortlist?: () => void;
  onPurchase?: () => void;
  /** Shown under a disabled Buy button (e.g. the player is not on the transfer list). */
  purchaseBlockedReason?: string | null;
  /** Not on the transfer list: buying is an approach at a premium. */
  purchaseUnsolicited?: boolean;
  preContractBonus?: number;
  preContractBlockedReason?: string | null;
  onPreContract?: () => void;
  onList?: () => void;
  listedForSale?: boolean;
  squadPlayerIds?: readonly string[];
  onSelectSquadPlayer?: (playerId: string) => void;
  onProfileAction?: (action: PlayerProfileAction) => void;
  /** Opens Kasse — Abfindung zahlen, dann Kader entfernen. */
  onTerminateContract?: () => void;
  onContractOffer?: (offer: ContractOffer) => void;
  wageHeadroomWeekly?: number;
  weekday?: number;
  actionFeedback?: string | null;
  onTransferNotice?: (message: string) => void;
  /** Deep-link from Postfach / inbox — opens Verhandeln once on mount. */
  openContractTalkOnMount?: boolean;
  onContractTalkOpened?: () => void;
}

/** German transfer refusals from App's flash notice (see PR notes: a tone flag from the caller would be cleaner). */
const TRANSFER_WARNING = /nicht möglich|zu niedrig|Fenster zu|nur im|Scout-Ziel|Transfer-Topf/;

export function PlayerProfile({
  player,
  owned,
  scoutEstimate,
  scouting = false,
  week = 1,
  season = 1,
  transferBudget,
  purchasePrice,
  saleOffer,
  saleBlockedReason = null,
  transferLockReason = null,
  onOpenYouth,
  onOpenTraining,
  onStartStampProgram,
  onAssignScout,
  transferWindowOpen = false,
  shortlisted = false,
  individualPrograms = [],
  trainingPlan = [],
  onToggleShortlist,
  onPurchase,
  purchaseBlockedReason = null,
  purchaseUnsolicited = false,
  preContractBonus,
  preContractBlockedReason = null,
  onPreContract,
  onList,
  listedForSale = false,
  squadPlayerIds = [],
  onSelectSquadPlayer,
  onProfileAction,
  onTerminateContract,
  onContractOffer,
  wageHeadroomWeekly,
  weekday = 1,
  actionFeedback = null,
  onTransferNotice,
  openContractTalkOnMount = false,
  onContractTalkOpened,
}: PlayerProfileProps) {
  const t = useT();
  const narrow = useMobileNarrow();
  const [tab, setTab] = useState<ProfileTab>("overview");
  const [talksOpen, setTalksOpen] = useState(false);
  const [offer, setOffer] = useState<ContractOffer | null>(null);
  const [saleConfirmOpen, setSaleConfirmOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);

  useEffect(() => {
    setTalksOpen(false);
    setOffer(null);
    setTab("overview");
    setSaleConfirmOpen(false);
    setOverflowOpen(false);
  }, [player.id]);

  useEffect(() => {
    if (!openContractTalkOnMount || !onContractOffer) return;
    setOffer(defaultContractOffer(player, season));
    setTalksOpen(true);
    onContractTalkOpened?.();
  }, [openContractTalkOnMount, onContractOffer, onContractTalkOpened, player.id, season]);

  const menuItems = profileMenuItems(player, owned, season, week ?? 1);
  const overflowMenuItems = profileOverflowMenuItems(player, owned);
  const reveal = scoutEstimate ? scoutReveal(scoutEstimate.uncertaintyRange) : null;
  const hasScoutIntel = Boolean(scoutEstimate);
  const askingBounds =
    !owned && scoutEstimate ? scoutMarketValueBounds(player, scoutEstimate, season, false) : null;
  const listPrice = purchasePrice;
  const purchaseAmountLabel =
    listPrice === undefined
      ? undefined
      : owned
        ? t("profile.approx", { amount: formatMoney(listPrice) })
        : !hasScoutIntel
          ? undefined
          : askingBounds === null
            ? undefined
            : askingBounds.exact
              ? formatMoney(listPrice)
              : formatScoutMarketValue(player, scoutEstimate!, season, false);
  const listPriceExceedsBudget =
    hasScoutIntel &&
    listPrice !== undefined &&
    transferBudget !== undefined &&
    transferBudget < listPrice;
  const windowClosedHint = !transferWindowOpen
    ? t("transfer.profile.buyLater", { when: scheduledMoveLabel(nextTransferWindowStart(season, week), season) })
    : null;
  const purchaseHintText = !hasScoutIntel
    ? t("transfer.profile.noScoutBuy")
    : listPriceExceedsBudget
      ? t("transfer.profile.listOverPot", {
          pot: formatClubCash(transferBudget ?? 0),
        })
      : [
          purchaseUnsolicited
            ? t("transfer.profile.unlistedPremium", {
                pct: Math.round((UNSOLICITED_PREMIUM - 1) * 100),
              })
            : null,
          windowClosedHint ?? (purchaseUnsolicited ? null : t("transfer.profile.offerMarket")),
        ]
          .filter(Boolean)
          .join(" ");
  const feedbackIsWarning = Boolean(actionFeedback && TRANSFER_WARNING.test(actionFeedback));

  function notifyTransfer(message: string) {
    onTransferNotice?.(message);
  }

  function handleListClick() {
    if (!onList) return;
    if (listedForSale) return;
    const blocked = transferLockReason ?? saleBlockedReason;
    if (blocked) {
      notifyTransfer(blocked);
      return;
    }
    setSaleConfirmOpen(true);
  }

  const squadIndex = squadPlayerIds.indexOf(player.id);
  const prevSquadId =
    squadIndex > 0 && onSelectSquadPlayer ? squadPlayerIds[squadIndex - 1] : undefined;
  const nextSquadId =
    squadIndex >= 0 && squadIndex < squadPlayerIds.length - 1 && onSelectSquadPlayer
      ? squadPlayerIds[squadIndex + 1]
      : undefined;
  const preContractAmountLabel =
    preContractBonus === undefined
      ? undefined
      : owned || askingBounds?.exact
        ? t("profile.approx", { amount: formatMoney(preContractBonus) })
        : askingBounds
          ? t("profile.approx", {
              amount: `${formatMoney(Math.round(preContractBonus * 0.7))}–${formatMoney(Math.round(preContractBonus * 1.3))}`,
            })
          : undefined;
  const fitness = stateMark(player.state.fitness);
  const morale = stateMark(player.state.morale);
  const form = formMark(player.state.form);
  const bars = attributeBars(player, owned, scoutEstimate);
  const xpBar = owned ? profileExperienceBar(player) : null;
  const growth = owned
    ? growthSeries(player, season)
    : reveal?.showExactCa
      ? [{ season: 1, ca: Number(formatScoutCa(player, scoutEstimate!, false)) }]
      : [];
  const timeline = visibleBreakoutFlags(player.hidden.breakout_flags);
  const scoutLabel =
    owned || !scoutEstimate ? null : confidenceLabel({ status: "scouted", estimate: scoutEstimate });
  const ca = owned
    ? formatScoutCa(player, scoutEstimate ?? { estimatedAbilityMean: 65, uncertaintyRange: 0, sampleSize: 0 }, true)
    : scoutEstimate
      ? formatScoutCa(player, scoutEstimate, false)
      : "?";
  const exactCa = /^\d+$/.test(ca) ? Number(ca) : null;
  const facts = profileFacts(player, owned);
  const encyclopediaCount = attributeEncyclopediaCount(player);
  const primaryLane = positionLane(player.position);
  const flavor = flavorForScout(player, owned, scoutEstimate);
  const achievements = achievementBadges(player, owned, scoutEstimate);
  const contract = contractView(player, owned, scoutEstimate);
  const lanes = owned || reveal?.showExactSkills ? staerkeAlsLanes(player) : [];
  const trainingTarget = owned
    ? dossierTrainingTarget(player, individualPrograms, trainingPlan, week)
    : null;
  const railMenuItems = menuItems.filter((item) => !PROFILE_CAREER_ACTIONS.has(item.action));
  const careerMenuItems = menuItems.filter((item) => PROFILE_CAREER_ACTIONS.has(item.action));
  const youthContractPending = careerMenuItems.some((item) => item.action === "sign_contract");
  const caDelta = owned ? weeklyCaDelta(player) : null;
  const talkLock = contractTalkLock(player, { season, week, weekday });
  const canTalk = owned && Boolean(onContractOffer) && player.squad_status !== "loaned_out";
  const saleBlockedText = !listedForSale && onList ? (transferLockReason ?? saleBlockedReason) : null;

  function openContractTalk() {
    if (!talkLock.allowed || transferLockReason) return;
    setOffer(defaultContractOffer(player, season));
    setTalksOpen(true);
  }

  return (
    <main className="club-shell-card-body tc-profile-screen">
      {actionFeedback ? (
        <p className={feedbackIsWarning ? "tc-profile__notice tc-profile__notice--warn" : "tc-profile__notice"} role="status">
          {actionFeedback}
        </p>
      ) : null}

      <div className="tc-profile">
        <aside className="tc-panel tc-profile__rail" aria-label={t("profile.identity.aria")}>
          <div className="tc-profile__head">
            <PlayerPortrait
              seed={player.portrait_seed}
              nationality={player.nationality}
              clubId={player.club_id}
              size="lg"
            />
            <div className="tc-profile__id">
              <h1 className="tc-profile__name">{formatPlayerName(player)}</h1>
              <p className="tc-profile__meta">
                {formatPlayerPositionLabel(player)} · {t("profile.age", { age: player.age })}
              </p>
            </div>
            <div className="tc-profile__tools">
              {owned && onSelectSquadPlayer && squadPlayerIds.length > 1 ? (
                <nav className="tc-profile__squadnav" aria-label={t("profile.squadNav.aria")}>
                  <button
                    type="button"
                    className="tc-iconbtn"
                    disabled={!prevSquadId}
                    aria-label={t("profile.squadNav.prev")}
                    onClick={() => prevSquadId && onSelectSquadPlayer(prevSquadId)}
                  >
                    <ChevronLeft className="tc-icon" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="tc-iconbtn"
                    disabled={!nextSquadId}
                    aria-label={t("profile.squadNav.next")}
                    onClick={() => nextSquadId && onSelectSquadPlayer(nextSquadId)}
                  >
                    <ChevronRight className="tc-icon" aria-hidden />
                  </button>
                </nav>
              ) : null}
              {owned && onTerminateContract && overflowMenuItems.length > 0 ? (
                <ProfileActionsMenu
                  open={overflowOpen}
                  items={overflowMenuItems}
                  onToggle={() => setOverflowOpen((open) => !open)}
                  onClose={() => setOverflowOpen(false)}
                  onSelect={(action) => {
                    if (action === "release") onTerminateContract();
                  }}
                />
              ) : null}
            </div>
          </div>

          <div className="tc-profile__ca">
            <Hint text={t("profile.ca.hint")}>
              <span
                className={`tc-rating tc-rating--lg tc-rating--${exactCa === null ? 1 : ratingBand(exactCa)}`}
                aria-label={t("profile.ca.aria", { value: ca })}
              >
                {ca}
              </span>
            </Hint>
            <div className="tc-profile__ca-copy">
              <span className="tc-label">{t("profile.ca.label")}</span>
              {owned && caDelta !== null && caDelta !== 0 ? (
                <span
                  className={caDelta > 0 ? "tc-delta--up" : "tc-delta--down"}
                  title={t("profile.ca.deltaHint")}
                >
                  {formatCaDelta(caDelta)}
                </span>
              ) : null}
              {scoutLabel ? (
                <span className="tc-caption" title={t("profile.scoutKnowledge.hint")}>
                  {scoutLabel}
                </span>
              ) : null}
            </div>
          </div>

          <dl className="tc-stats tc-profile__state" aria-label={t("profile.state.aria")}>
            {player.state.injury ? (
              <StateTile
                label={t("squad.injuredHint")}
                mark="◆"
                tone="low"
                value={`${injuryTypeLabel(player.state.injury.type_id)} · ${t("squad.injuredWeeks", { count: player.state.injury.weeks_remaining })}`}
              />
            ) : (
              <StateTile
                label={t("profile.state.fitness")}
                mark={fitness.mark}
                tone={fitness.tone}
                value={formatState(player.state.fitness, owned, scoutEstimate)}
              />
            )}
            <StateTile
              label={t("profile.state.form")}
              mark={form.mark}
              tone={form.tone}
              value={formatState(player.state.form, owned, scoutEstimate, true)}
            />
            <StateTile
              label={t("profile.state.morale")}
              mark={morale.mark}
              tone={morale.tone}
              value={formatState(player.state.morale, owned, scoutEstimate)}
            />
          </dl>

          <ProfileBio narrow={narrow}>
            {xpBar ? (
              <div className="tc-profile__xp" title={t("profile.experience.hint", { apps: xpBar.apps, cap: EXPERIENCE_APPS_SOFT_CAP })}>
                <div className="tc-profile__xp-head">
                  <span className="tc-label">{xpBar.label}</span>
                  <span className="tc-caption">{experienceCaption(xpBar)}</span>
                </div>
                <span
                  className="tc-bar"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={EXPERIENCE_APPS_SOFT_CAP}
                  aria-valuenow={xpBar.apps}
                  aria-label={experienceCaption(xpBar)}
                >
                  <span className="tc-bar__fill" style={{ width: `${xpBar.fill * 100}%` }} />
                </span>
              </div>
            ) : null}

            <dl className="tc-kv tc-profile__facts">
              {facts.map((fact) => (
                <Fragment key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </Fragment>
              ))}
            </dl>

            {flavor ? (
              <figure className="tc-profile__quote">
                <blockquote>{flavor.headline}</blockquote>
                <figcaption className="tc-caption">{flavor.body}</figcaption>
              </figure>
            ) : (
              <p className="tc-empty">{t("profile.flavor.none")}</p>
            )}

            {achievements.length > 0 ? (
              <ul className="tc-profile__badges" aria-label={t("profile.achievements.aria")}>
                {achievements.map((badge) => (
                  <li key={badge}>
                    <Award className="tc-icon" aria-hidden />
                    {achievementDisplayLabel(badge)}
                  </li>
                ))}
              </ul>
            ) : null}
          </ProfileBio>

          {retiresAtSeasonEnd(player, season) ? (
            <p className="tc-callout tc-callout--warn tc-profile__retiring" role="status">
              <Hourglass className="tc-icon" aria-hidden />
              {t("profile.retiresAtSeasonEnd")}
            </p>
          ) : null}

          {owned && transferLockReason ? (
            <p className="tc-callout tc-callout--warn" role="status">
              {transferLockReason}
            </p>
          ) : null}

          {owned && (onList || (onProfileAction && railMenuItems.length > 0)) ? (
            <div className="tc-profile__actions" role="group" aria-label={t("profile.actions.aria")}>
              {onList ? (
                <div className="tc-profile__action">
                  <button
                    type="button"
                    className="tc-btn tc-profile__btn-wide"
                    onClick={handleListClick}
                    aria-pressed={listedForSale}
                    aria-disabled={listedForSale || Boolean(saleBlockedText)}
                    title={listedForSale ? t("transfer.profile.listedHint") : t("transfer.profile.listHint")}
                  >
                    {listedForSale ? t("transfer.profile.listed") : t("transfer.profile.list")}
                    {!listedForSale && saleOffer ? (
                      <span className="tc-profile__amount">{formatMoney(saleOffer)}</span>
                    ) : null}
                  </button>
                  {saleBlockedText ? <p className="tc-caption">{saleBlockedText}</p> : null}
                </div>
              ) : null}
              {onProfileAction
                ? railMenuItems.map((item) => (
                    <button
                      key={item.action}
                      type="button"
                      className="tc-btn tc-btn--sm"
                      title={transferLockReason ?? item.hint}
                      disabled={Boolean(transferLockReason)}
                      onClick={() => onProfileAction(item.action)}
                    >
                      {item.label}
                    </button>
                  ))
                : null}
            </div>
          ) : null}

          {!owned && onAssignScout ? (
            <div className="tc-profile__actions" role="group" aria-label={t("profile.scoutActions.aria")}>
              {scouting ? (
                <p className="tc-caption" role="status">
                  {t("profile.scouting.active")}
                </p>
              ) : null}
              <div className="tc-profile__action-row">
                {!scouting ? (
                  <button
                    type="button"
                    className="tc-btn tc-btn--primary"
                    onClick={onAssignScout}
                    title={t("profile.scouting.assignHint")}
                  >
                    {t("profile.scouting.assign")}
                  </button>
                ) : null}
                {onToggleShortlist ? (
                  <button
                    type="button"
                    className="tc-iconbtn tc-profile__star"
                    aria-label={shortlisted ? t("profile.shortlist.remove") : t("profile.shortlist.add")}
                    aria-pressed={shortlisted}
                    onClick={onToggleShortlist}
                  >
                    <Star className="tc-icon" aria-hidden fill={shortlisted ? "currentColor" : "none"} />
                  </button>
                ) : null}
              </div>
              {onPurchase ? (
                <div className="tc-profile__action">
                  <button
                    type="button"
                    className={
                      (hasScoutIntel || scouting) && !purchaseBlockedReason
                        ? "tc-btn tc-btn--primary tc-profile__btn-wide"
                        : "tc-btn tc-profile__btn-wide"
                    }
                    disabled={Boolean(purchaseBlockedReason)}
                    onClick={onPurchase}
                  >
                    {t("transfer.profile.buy")}
                    {purchaseAmountLabel ? <span className="tc-profile__amount">{purchaseAmountLabel}</span> : null}
                  </button>
                  <p className="tc-caption">{purchaseBlockedReason ?? purchaseHintText}</p>
                </div>
              ) : null}
              {onPreContract ? (
                <div className="tc-profile__action">
                  <button
                    type="button"
                    className="tc-btn tc-profile__btn-wide"
                    onClick={onPreContract}
                    disabled={Boolean(preContractBlockedReason) || askingBounds === null}
                    title={t("profile.preContract.hint")}
                  >
                    {t("profile.preContract")}
                    {preContractAmountLabel ? (
                      <span className="tc-profile__amount">{preContractAmountLabel}</span>
                    ) : null}
                  </button>
                  {preContractBlockedReason ? <p className="tc-caption">{preContractBlockedReason}</p> : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </aside>

        <div className="tc-profile__main">
          <div className="tc-tabs tc-tabs--page" role="tablist" aria-label={t("profile.tabs.aria")}>
            {PROFILE_TABS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                id={`profile-tab-${entry.id}`}
                aria-controls="profile-tabpanel"
                className="tc-tab"
                aria-selected={tab === entry.id}
                onClick={() => setTab(entry.id)}
              >
                {t(entry.labelKey)}
              </button>
            ))}
          </div>

          <div id="profile-tabpanel" role="tabpanel" aria-labelledby={`profile-tab-${tab}`}>
            {tab === "overview" ? (
              <div className="tc-profile__overview">
                <div className="tc-stack">
                  <section className="tc-panel" aria-labelledby="profile-core-title">
                    <div className="tc-panel__head">
                      <span className="tc-label" id="profile-core-title">
                        {t("profile.core.title")}
                      </span>
                      <span className="tc-caption">
                        {owned ? t("profile.core.ownedNote") : t("profile.core.scoutNote")}
                      </span>
                    </div>
                    {bars.length >= 3 ? (
                      <AttributeHex bars={bars} owned={owned} />
                    ) : (
                      <>
                        <dl className="tc-kv">
                          {bars.map((bar) => (
                            <Fragment key={bar.key}>
                              <dt>{attributeLabel(bar.key)}</dt>
                              <dd>{formatSkillDisplayValue(bar)}</dd>
                            </Fragment>
                          ))}
                        </dl>
                        <p className="tc-empty tc-cards__note">{t("profile.core.tooFew")}</p>
                      </>
                    )}
                  </section>

                  <section className="tc-panel" aria-labelledby="profile-lanes-title">
                    <div className="tc-panel__head">
                      <span className="tc-label" id="profile-lanes-title">
                        {t("profile.lanes.title")}
                      </span>
                    </div>
                    {lanes.length > 0 ? (
                      <StaerkeAlsRow lanes={lanes} primaryLane={primaryLane} />
                    ) : (
                      <p className="tc-empty">{t("profile.lanes.unknown")}</p>
                    )}
                  </section>

                  <SkillEncyclopedia
                    player={player}
                    owned={owned}
                    estimate={scoutEstimate}
                    count={encyclopediaCount}
                  />
                </div>

                {owned ? (
                  <div className="tc-stack">
                    <section className="tc-panel" aria-labelledby="profile-target-title">
                      <div className="tc-panel__head">
                        <span className="tc-label" id="profile-target-title">
                          {t("profile.target.title")}
                        </span>
                      </div>
                      {trainingTarget ? (
                        <div className="tc-profile__target">
                          <p className="tc-profile__target-title">
                            <TrainingTargetIcon accent={trainingTarget.accent} />
                            {trainingTarget.title}
                          </p>
                          <p className="tc-caption">{trainingTarget.detail}</p>
                          {trainingTarget.progress !== null ? (
                            <span
                              className="tc-bar"
                              role="meter"
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={Math.round(trainingTarget.progress * 100)}
                              aria-label={t("profile.progress", { percent: Math.round(trainingTarget.progress * 100) })}
                            >
                              <span className="tc-bar__fill" style={{ width: `${trainingTarget.progress * 100}%` }} />
                            </span>
                          ) : (
                            <p className="tc-caption">{t("profile.target.teamOnly")}</p>
                          )}
                          {onOpenTraining ? (
                            <button type="button" className="tc-btn tc-btn--sm" onClick={onOpenTraining}>
                              <Dumbbell className="tc-icon" aria-hidden />
                              {t("profile.target.individual")}
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <p className="tc-empty">{t("profile.target.none")}</p>
                      )}
                    </section>

                    <StampSlots
                      player={player}
                      programs={individualPrograms ?? []}
                      week={week ?? 1}
                      onStartStamp={onStartStampProgram}
                    />

                    <MarketValueBreakdownStrip player={player} season={season} />

                    <section className="tc-panel" aria-labelledby="profile-contract-title">
                      <div className="tc-panel__head">
                        <span className="tc-label" id="profile-contract-title">
                          {t("profile.contract.title")}
                        </span>
                        <span className="tc-strong">{contract.status}</span>
                      </div>
                      <dl className="tc-kv">
                        <dt>{t("profile.contract.wage")}</dt>
                        <dd>{contract.wageWeekly}</dd>
                        <dt>{t("profile.contract.runsUntil")}</dt>
                        <dd>{contract.untilSeason}</dd>
                        <dt>{t("profile.contract.minutes")}</dt>
                        <dd>{contract.minutesPromise}</dd>
                      </dl>
                      {talkLock.reason ? (
                        <p className="tc-profile__warn">{talkLock.reason}</p>
                      ) : (player.state.contract_failed_offers ?? 0) > 0 ? (
                        <p className="tc-profile__warn">
                          {t("profile.contract.failedOffers", {
                            failed: player.state.contract_failed_offers ?? 0,
                            max: FRUSTRATION_THRESHOLD,
                          })}
                        </p>
                      ) : null}
                      {canTalk || (onProfileAction && careerMenuItems.length > 0) ? (
                        <div className="tc-profile__action-row tc-profile__contract-actions">
                          {canTalk && !youthContractPending ? (
                            <button
                              type="button"
                              className="tc-btn tc-btn--primary"
                              disabled={!talkLock.allowed || Boolean(transferLockReason)}
                              onClick={openContractTalk}
                              title={transferLockReason ?? talkLock.reason ?? t("profile.contract.talkHint")}
                            >
                              <PenLine className="tc-icon" aria-hidden />
                              {t("profile.action.negotiate")}
                            </button>
                          ) : null}
                          {onProfileAction
                            ? careerMenuItems.map((item) => (
                                <button
                                  key={item.action}
                                  type="button"
                                  className={
                                    item.action === "promote_pro" || item.action === "sign_contract"
                                      ? "tc-btn tc-btn--primary"
                                      : "tc-btn"
                                  }
                                  title={item.hint}
                                  onClick={() => {
                                    if (item.action === "sign_contract") {
                                      setOffer(defaultContractOffer(player, season));
                                      setTalksOpen(true);
                                      return;
                                    }
                                    onProfileAction(item.action);
                                  }}
                                >
                                  {item.action === "sign_contract" ? <PenLine className="tc-icon" aria-hidden /> : null}
                                  {item.label}
                                </button>
                              ))
                            : null}
                        </div>
                      ) : null}
                    </section>
                  </div>
                ) : null}
              </div>
            ) : null}

            {tab === "development" ? (
              <DevelopmentTab player={player} owned={owned} growth={growth} timeline={timeline} reveal={reveal} />
            ) : null}

            {tab === "stats" ? (
              <>
                <StatsTab player={player} season={season} owned={owned} scoutEstimate={scoutEstimate} />
                <CareerPanel player={player} />
              </>
            ) : null}
          </div>
        </div>
      </div>

      {onOpenYouth ? (
        <button type="button" className="tc-btn tc-btn--ghost tc-profile__back" onClick={onOpenYouth}>
          <ChevronLeft className="tc-icon" aria-hidden />
          {t("profile.openYouth")}
        </button>
      ) : null}

      {saleConfirmOpen && saleOffer !== undefined && onList ? (
        <SaleConfirmModal
          player={player}
          offerEstimate={saleOffer}
          season={season}
          onCancel={() => setSaleConfirmOpen(false)}
          onConfirm={() => {
            setSaleConfirmOpen(false);
            onList();
          }}
        />
      ) : null}

      {talksOpen && offer && onContractOffer ? (
        <ContractTalksModal
          player={player}
          season={season}
          offer={offer}
          wageHeadroomWeekly={wageHeadroomWeekly}
          onChange={setOffer}
          onSubmit={() => {
            onContractOffer(offer);
            setTalksOpen(false);
            setOffer(null);
          }}
          onCancel={() => {
            setTalksOpen(false);
            setOffer(null);
          }}
        />
      ) : null}
    </main>
  );
}

/** Experience, facts, story and badges: part of the rail on wide screens, folded away on phones (design.md §9.8). */
function ProfileBio({ narrow, children }: { narrow: boolean; children: ReactNode }) {
  const t = useT();
  if (!narrow) return <div className="tc-profile__bio">{children}</div>;
  return (
    <details className="tc-profile__bio tc-profile__bio--folded">
      <summary className="tc-profile__summary tc-profile__summary--inline">
        <span className="tc-label">{t("profile.bio.summary")}</span>
        <ChevronDown className="tc-icon tc-profile__chevron" aria-hidden />
      </summary>
      <div className="tc-profile__bio">{children}</div>
    </details>
  );
}

/** A "?" value hides its glyph too: the tone would give the true value away. */
function StateTile({
  label,
  mark,
  tone,
  value,
}: {
  label: string;
  mark: StateMark;
  tone: StateTone;
  value: string;
}) {
  const t = useT();
  return (
    <div className="tc-stats__item">
      <dt className="tc-label">{label}</dt>
      <dd>
        <span className="tc-stat__value">
          {value === "?" ? null : (
            <>
              <span className={`tc-state tc-state--${tone}`} aria-hidden="true">
                {mark}
              </span>{" "}
            </>
          )}
          {value}
        </span>
        {value === "?" ? null : <span className="tc-sr">{t(`squad.state.${tone}`)}</span>}
      </dd>
    </div>
  );
}

function DevelopmentTab({
  player,
  owned,
  growth,
  timeline,
  reveal,
}: {
  player: Player;
  owned: boolean;
  growth: { season: number; ca: number }[];
  timeline: string[];
  reveal: ReturnType<typeof scoutReveal> | null;
}) {
  const t = useT();
  const recentGrowth = player.state.recent_growth_26w ?? 0;
  const width = 720;
  const height = 160;
  const chartPoints = layoutGrowthChart(growth, width, height);
  const singleSeason = growth.length < 2;
  const first = growth[0];
  const last = growth.at(-1);

  return (
    <div className="tc-stack">
      <section className="tc-panel" aria-labelledby="profile-growth-title">
        <div className="tc-panel__head">
          <span className="tc-label" id="profile-growth-title">
            {t("profile.growth.title")}
          </span>
          {owned ? (
            <span className={recentGrowth > 0 ? "tc-growth" : "tc-caption"}>
              {t("profile.growth.momentum", { value: formatRecentGrowth(recentGrowth) })}
            </span>
          ) : null}
        </div>
        {growth.length > 0 && !singleSeason ? (
          <figure className="tc-profile__chart">
            <svg viewBox={`-8 -8 ${width + 16} ${height + 16}`} role="img" aria-label={t("profile.growth.aria", {
              from: formatSeasonLabel(first?.season ?? 1),
              to: formatSeasonLabel(last?.season ?? 1),
              start: first?.ca ?? 0,
              end: last?.ca ?? 0,
            })}>
              <polyline className="tc-profile__chart-line" points={growthPolyline(growth, width, height)} />
              {chartPoints.map((point) => (
                <circle key={`${point.season}-${point.ca}`} className="tc-profile__chart-dot" cx={point.x} cy={point.y} r="4">
                  <title>{`${formatSeasonLabel(point.season)} · ${point.ca}`}</title>
                </circle>
              ))}
            </svg>
            <figcaption className="tc-profile__chart-axis tc-caption">
              <span>
                {formatSeasonLabel(first?.season ?? 1)} · {first?.ca}
              </span>
              <span>
                {formatSeasonLabel(last?.season ?? 1)} · {last?.ca}
              </span>
            </figcaption>
          </figure>
        ) : owned ? (
          <p className="tc-empty">
            {t("profile.growth.firstSeason", { season: formatSeasonLabel(first?.season ?? 1) })}
          </p>
        ) : growth.length > 0 ? (
          <p className="tc-empty">{reveal?.showExactCa ? t("profile.growth.scoutEstimate") : t("profile.growth.noTrend")}</p>
        ) : (
          <p className="tc-empty">{t("profile.growth.unknown")}</p>
        )}
      </section>

      {owned && timeline.length > 0 ? (
        <section className="tc-panel" aria-labelledby="profile-breakouts-title">
          <div className="tc-panel__head">
            <span className="tc-label" id="profile-breakouts-title">
              {t("profile.breakouts.title")}
            </span>
          </div>
          <ul className="tc-list">
            {timeline.map((flag) => (
              <li key={flag} className="tc-list__item tc-list__item--wide">
                <span className="tc-namecell">
                  <Lightbulb className="tc-icon" aria-hidden />
                  {visibleBreakoutLabel(flag)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function StatsTab({
  player,
  season,
  owned,
  scoutEstimate,
}: {
  player: Player;
  season: number;
  owned: boolean;
  scoutEstimate?: AbilityEstimate;
}) {
  const t = useT();
  const seasons = useMemo(() => listCareerStatSeasons(player, season), [player, season]);
  const [selectedSeason, setSelectedSeason] = useState(season);

  useEffect(() => {
    setSelectedSeason(season);
  }, [player.id, season]);

  const stats = useMemo(
    () => careerSeasonStatsForSeason(player, selectedSeason, season, owned, scoutEstimate),
    [player, selectedSeason, season, owned, scoutEstimate],
  );
  const archived = selectedSeason !== season;

  return (
    <section className="tc-panel" aria-labelledby="profile-stats-title">
      <div className="tc-panel__head">
        <span className="tc-label" id="profile-stats-title">
          {t("profile.stats.title", { year: seasonCalendarYear(selectedSeason) })}
        </span>
        <span className="tc-caption">{archived ? t("profile.stats.archived") : t("profile.stats.current")}</span>
      </div>
      <div className="tc-chips tc-chips--toolbar" role="group" aria-label={t("profile.stats.yearAria")}>
        {seasons.map((entry) => (
          <button
            key={entry}
            type="button"
            className="tc-chip tc-chip--dense"
            aria-pressed={selectedSeason === entry}
            onClick={() => setSelectedSeason(entry)}
          >
            {seasonCalendarYear(entry)}
          </button>
        ))}
      </div>
      {stats ? (
        <dl className="tc-stats tc-profile__season">
          <StatTile label={t("profile.stats.apps")} value={String(stats.apps)} />
          <StatTile label={t("profile.stats.goals")} value={String(stats.goals)} />
          <StatTile label={t("profile.stats.assists")} value={String(stats.assists)} />
          <StatTile label={t("profile.stats.minutes")} value={String(stats.minutes)} />
          <StatTile label={t("profile.stats.rating")} value={stats.rating} />
        </dl>
      ) : (
        <p className="tc-empty">{owned ? t("profile.stats.none") : t("profile.stats.unknown")}</p>
      )}
    </section>
  );
}

/** PRD 31 — one row per finished season from `history.season_lines`. */
function CareerPanel({ player }: { player: Player }) {
  const t = useT();
  const lines = player.history.season_lines ?? [];
  if (lines.length === 0) return null;
  const totals = lines.reduce(
    (sum, [, , , apps, goals]) => ({ apps: sum.apps + apps, goals: sum.goals + goals }),
    { apps: 0, goals: 0 },
  );
  return (
    <section className="tc-panel" aria-labelledby="profile-career-title">
      <div className="tc-panel__head">
        <span className="tc-label" id="profile-career-title">
          {t("profile.career.title")}
        </span>
        <span className="tc-caption">{t("profile.career.seasons", { count: lines.length })}</span>
      </div>
      <div className="tc-table-wrap">
        <table className="tc-table tc-table--compact">
          <thead>
            <tr>
              <th scope="col">{t("profile.career.season")}</th>
              <th scope="col">{t("profile.career.club")}</th>
              <th scope="col">{t("profile.career.league")}</th>
              <th scope="col" className="tc-num">{t("profile.stats.apps")}</th>
              <th scope="col" className="tc-num">{t("profile.stats.goals")}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(([lineSeason, clubId, divisionId, apps, goals]) => (
              <tr key={lineSeason}>
                <td>{seasonCalendarYear(lineSeason)}</td>
                <td>{loanClubName(clubId, DEFAULT_GENERATED_WORLD.clubs)}</td>
                <td>{DIVISION_ECONOMY[divisionId as DivisionEconomyId]?.label ?? divisionId}</td>
                <td className="tc-num">{apps}</td>
                <td className="tc-num">{goals}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3}>{t("profile.career.total")}</th>
              <td className="tc-num">{totals.apps}</td>
              <td className="tc-num">{totals.goals}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="tc-stats__item">
      <dt className="tc-label">{label}</dt>
      <dd className="tc-stat__value">{value}</dd>
    </div>
  );
}

function AttributeHex({ bars, owned }: { bars: AttributeBar[]; owned: boolean }) {
  const t = useT();
  // Wide canvas so the corner labels fit at the text tokens' size.
  const cx = 170;
  const cy = 150;
  const maxR = 100;
  const grid = [0.33, 0.66, 1].map((scale) => hexRegularPoints(cx, cy, maxR * scale, bars.length || 6));
  const fill = hexValuePoints(
    bars.map((bar) => bar.value),
    cx,
    cy,
    maxR,
  );
  const ciLow = bars.every((bar) => bar.low !== undefined)
    ? hexValuePoints(bars.map((bar) => bar.low ?? 0), cx, cy, maxR)
    : null;
  const ciHigh = bars.every((bar) => bar.high !== undefined)
    ? hexValuePoints(bars.map((bar) => bar.high ?? 0), cx, cy, maxR)
    : null;
  const showRing = !owned && Boolean(ciLow && ciHigh);
  const summary = bars.map((bar) => `${attributeLabel(bar.key)} ${formatSkillDisplayValue(bar)}`).join(", ");
  return (
    <svg className="tc-profile__hex" viewBox="0 0 340 300" role="img" aria-label={t("profile.core.aria", { values: summary })}>
      {grid.map((points) => (
        <polygon key={points} className="tc-profile__hex-grid" points={points} />
      ))}
      {owned ? <polygon className="tc-profile__hex-fill" points={fill} /> : null}
      {showRing && ciLow && ciHigh ? (
        <g>
          <polygon className="tc-profile__hex-ci" points={ciHigh} />
          <polygon className="tc-profile__hex-ci-inner" points={ciLow} />
        </g>
      ) : null}
      {bars.map((bar, index) => {
        const labelAt = hexVertex(cx, cy, maxR + 24, index, bars.length);
        return (
          <g key={bar.key} aria-hidden="true">
            <text className="tc-profile__hex-label" x={labelAt.x} y={labelAt.y - 8} textAnchor="middle" dominantBaseline="middle">
              {attributeLabel(bar.key)}
            </text>
            <text className="tc-profile__hex-value" x={labelAt.x} y={labelAt.y + 9} textAnchor="middle" dominantBaseline="middle">
              {formatSkillDisplayValue(bar)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function experienceCaption(bar: ExperienceBar): string {
  return `${experienceTierLabel(bar)} · ${bar.apps}`;
}

function experienceTierLabel(bar: ExperienceBar): string {
  const tier = bar.raw ? "raw" : bar.fill >= 0.85 ? "veteran" : bar.fill >= 0.35 ? "established" : "young";
  return translate(`profile.experience.tier.${tier}`);
}

function formatSkillDisplayValue(bar: AttributeBar): string {
  if (bar.showValue) return String(bar.value);
  if (bar.showCi && bar.low !== undefined && bar.high !== undefined) {
    return `${bar.low}–${bar.high}`;
  }
  return "?";
}

function TrainingTargetIcon({ accent }: { accent: DossierTrainingAccent }) {
  switch (accent) {
    case "team":
      return <Users className="tc-icon" aria-hidden />;
    case "weak_foot":
    case "attribute_focus":
      return <Footprints className="tc-icon" aria-hidden />;
    case "stamp":
      return <Flag className="tc-icon" aria-hidden />;
    default:
      return <Dumbbell className="tc-icon" aria-hidden />;
  }
}

function StaerkeAlsRow({
  lanes,
  primaryLane,
}: {
  lanes: ReturnType<typeof staerkeAlsLanes>;
  primaryLane: ReturnType<typeof positionLane>;
}) {
  const t = useT();
  return (
    <ul className="tc-profile__lanes">
      {lanes.map((lane) => {
        const isPrimary = lane.lane === primaryLane;
        const score = lane.value > 0 ? `${Math.round(lane.value * 100)}` : "—";
        return (
          <li
            key={lane.lane}
            className={isPrimary ? "tc-profile__lane tc-profile__lane--primary" : "tc-profile__lane"}
            title={isPrimary ? t("profile.lanes.primary", { lane: lane.label }) : lane.label}
          >
            <span className="tc-profile__lane-tag">{staerkeLaneShort(lane.lane)}</span>
            <span className="tc-profile__lane-value">{score}</span>
            <span className="tc-sr">{lane.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

function SkillEncyclopedia({
  player,
  owned,
  estimate,
  count,
}: {
  player: Player;
  owned: boolean;
  estimate?: AbilityEstimate;
  count: number;
}) {
  const t = useT();
  const groups = fullSkillSheet(player, owned, estimate);
  const markers = playerStampGateMarkers(player);
  return (
    <details className="tc-panel tc-profile__details">
      <summary className="tc-profile__summary">
        <span className="tc-label">{t("profile.encyclopedia.summary", { count })}</span>
        <ChevronDown className="tc-icon tc-profile__chevron" aria-hidden />
      </summary>
      <div className="tc-profile__sheet">
        {groups.map((group) => (
          <table key={group.id} className="tc-table tc-table--compact">
            <caption className="tc-label">{group.label}</caption>
            <tbody>
              {group.bars.map((bar) => {
                const gate = stampGateTitle(bar.key, markers);
                return (
                  <tr key={bar.key} className={bar.dimmed ? "tc-profile__dimmed" : undefined}>
                    <th scope="row">
                      {attributeLabel(bar.key)}
                      {gate ? (
                        <span title={gate}>
                          <Flag className="tc-icon tc-profile__gate" aria-label={gate} />
                        </span>
                      ) : null}
                    </th>
                    <td className="tc-num">{formatSkillDisplayValue(bar)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ))}
      </div>
    </details>
  );
}

function StampSlots({
  player,
  programs,
  week,
  onStartStamp,
}: {
  player: Player;
  programs: readonly IndividualProgram[];
  week: number;
  onStartStamp?: (stampId: string) => void;
}) {
  const t = useT();
  const badges = activeStampBadges(player, FAEHIGKEIT_HUNGER_SLOTS);
  const stampProgram = programs.find((entry) => entry.playerId === player.id && entry.kind === "stamp");
  const eligible = [...eligibleTrainStamps(player)];
  const elapsed = stampProgram ? Math.max(0, week - stampProgram.startedWeek) : 0;
  const total = stampProgram ? Math.max(1, elapsed + stampProgram.weeksRemaining) : 1;
  const progress = stampProgram ? Math.min(1, elapsed / total) : 0;
  let usedProgress = false;

  return (
    <section className="tc-panel" aria-labelledby="profile-stamps-title">
      <div className="tc-panel__head">
        <span className="tc-label" id="profile-stamps-title">
          {t("profile.stamps.title")}
        </span>
      </div>
      <ul className="tc-list">
        {Array.from({ length: FAEHIGKEIT_HUNGER_SLOTS }, (_, index) => {
          const stamp = badges[index];
          const slotLabel = index === FAEHIGKEIT_HUNGER_SLOTS - 1 ? t("profile.stamps.bonusSlot") : t("profile.stamps.slot");
          let content: ReactNode;
          if (stamp) {
            const appliedHint = Object.entries(stamp.applied)
              .map(([key, delta]) => {
                const attr = key as Parameters<typeof attributeLabel>[0];
                return `${attributeLabel(attr)} ${formatGrowthDelta(delta ?? null)}`;
              })
              .join(" · ");
            content = (
              <span
                className="tc-namecell"
                title={`${stampLabel(stamp.id)} · ${stampPathLabel(stamp.path, stampDefinition(stamp.id))}${appliedHint ? ` · ${appliedHint}` : ""}`}
              >
                <Flag className="tc-icon" aria-hidden />
                {stampLabel(stamp.id)}
              </span>
            );
          } else if (stampProgram && !usedProgress) {
            usedProgress = true;
            content = (
              <span className="tc-profile__stamp-train">
                <span className="tc-namecell">
                  <Flag className="tc-icon" aria-hidden />
                  {programLabel(stampProgram)}
                </span>
                <span
                  className="tc-bar"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress * 100)}
                  aria-label={t("profile.progress", { percent: Math.round(progress * 100) })}
                >
                  <span className="tc-bar__fill" style={{ width: `${progress * 100}%` }} />
                </span>
              </span>
            );
          } else {
            const nextStamp = eligible.shift();
            if (nextStamp && onStartStamp) {
              const hybrid = nextStamp.path === "hybrid";
              const label = stampLabel(nextStamp.id);
              content = (
                <button
                  type="button"
                  className="tc-btn tc-btn--sm"
                  onClick={() => onStartStamp(nextStamp.id)}
                  title={t(hybrid ? "profile.stamps.sealHint" : "profile.stamps.trainHint", {
                    stamp: label,
                    weeks: nextStamp.weeks ?? "?",
                  })}
                >
                  {t(hybrid ? "profile.stamps.seal" : "profile.stamps.train", { stamp: label })}
                </button>
              );
            } else {
              content = (
                <span className="tc-caption" title={t("profile.stamps.emptySlot")}>
                  —
                </span>
              );
            }
          }
          return (
            <li key={index} className="tc-list__item tc-list__item--wide">
              <span className="tc-list__meta">{slotLabel}</span>
              {content}
            </li>
          );
        })}
      </ul>
      <p className="tc-caption tc-cards__note">
        {(player.stamps?.length ?? 0) > 0
          ? t("profile.stamps.count", { count: player.stamps.length })
          : eligible.length > 0
            ? t("profile.stamps.startHint")
            : t("profile.stamps.empty")}
      </p>
    </section>
  );
}

function formatState(value: number, owned: boolean, scoutEstimate?: AbilityEstimate, signed = false): string {
  if (owned || !scoutEstimate) {
    return signed && value > 0 ? `+${value}` : String(value);
  }
  const masked = formatScoutStateValue(value, scoutEstimate, false);
  if (masked === "?") return "?";
  return signed && value > 0 ? `+${value}` : masked;
}

function formatMoney(amount: number): string {
  return formatClubCash(amount);
}
