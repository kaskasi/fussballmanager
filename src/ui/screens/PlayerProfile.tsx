/** WIREFRAME: docs/prd/design.md §9.8 — Spielerprofil (hub-and-spoke target) */
/**
 * WIREFRAME: PRD 14.3 — Spielerakte
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │ Felix Schröder · CB · 17 · 🇩🇪                               │
 * │ CA 87  ● Fit  ◆ Form  ● Moral  📚 Erfahrung · Roh            │
 * ├──────────────────┬───────────────────────────────────────────┤
 * │ Kernattribute hex │ Aktuelles Ziel                            │
 * │ footnote bars     │ 🏃 Schnelligkeit                          │
 * │ Technik/Physis/…  │ Fähigkeiten / Bonus (F2.8 Badges)         │
 * │ ⚑ Gate-Keys       │ [Kopfball] [· dashed hybrid ·]            │
 * │ Stärke als…       │ Vertrag  [✍️ Verhandeln] [⬆️ Profikader]  │
 * └──────────────────┴───────────────────────────────────────────┘
 *
 * Eine Karte = Identität. Nur Verlauf und Saisonwerte als optionale Vertiefung.
 * Stamps: Player.stamps (PRD 07.5 / F2.8).
 */
import { useEffect, useMemo, useState, type ComponentPropsWithoutRef } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flag,
  Footprints,
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
  type ProfileMenuItem,
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
import {
  careerSeasonStatsForSeason,
  listCareerStatSeasons,
} from "../../player/season-stats.ts";
import { formatSeasonLabel, seasonCalendarYear } from "../../sim/season-label.ts";
import { transferWindowHint } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import { transferWindowClosedReason } from "../../transfers/purchase-block.ts";
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
import { Hint } from "../components/Hint.tsx";
import { PlayerPortrait } from "../components/PlayerPortrait.tsx";
import {
  achievementBadges,
  contractView,
  flavorForScout,
} from "../player-flavor.ts";
import {
  formatCaDelta,
  formatRecentGrowth,
  weeklyCaDelta,
} from "../../player/ca-tracking.ts";
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
} from "../player-profile.ts";
import {
  activeStampBadges,
  eligibleTrainStamps,
  stampIcon,
  stampLabel,
} from "../../development/ability-stamps.ts";
import { formatGrowthDelta } from "../../player/growth-history.ts";
type ProfileTab = "overview" | "development" | "stats";

const PROFILE_TABS: { id: ProfileTab; labelKey: string }[] = [
  { id: "overview", labelKey: "profile.tab.overview" },
  { id: "development", labelKey: "profile.tab.development" },
  { id: "stats", labelKey: "profile.tab.stats" },
];

/** Shown only under Vertrag — not duplicated in the identity rail. */
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
  shortlisted?: boolean;
  individualPrograms?: readonly IndividualProgram[];
  trainingPlan?: readonly TrainingSlot[];
  onOpenYouth?: () => void;
  onOpenTraining?: () => void;
  onStartStampProgram?: (stampId: string) => void;
  onAssignScout?: () => void;
  onToggleShortlist?: () => void;
  onPurchase?: () => void;
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
        ? `ca. ${formatMoney(listPrice)}`
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
  const windowClosedHint = !transferWindowOpen ? transferWindowClosedReason(week) : null;
  const purchaseHintText =
    windowClosedHint ??
    (!hasScoutIntel
      ? t("transfer.profile.noScoutBuy")
      : listPriceExceedsBudget
        ? t("transfer.profile.listOverPot", {
            pot: formatClubCash(transferBudget ?? 0),
          })
        : t("transfer.profile.offerMarket"));
  const transferNotice =
    (actionFeedback &&
    /nicht möglich|zu niedrig|Fenster zu|nur im|Scout-Ziel|Transfer-Topf/.test(actionFeedback)
      ? actionFeedback
      : null);

  function notifyTransfer(message: string) {
    onTransferNotice?.(message);
  }

  function handlePurchaseClick() {
    if (!onPurchase) return;
    onPurchase();
  }

  function handleListClick() {
    if (!onList) return;
    if (listedForSale) return;
    if (saleBlockedReason) {
      notifyTransfer(saleBlockedReason);
      return;
    }
    if (!transferWindowOpen) {
      notifyTransfer(t("transfer.profile.saleWindowOnly", { hint: transferWindowHint() }));
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
      : owned
        ? `ca. ${formatMoney(preContractBonus)}`
        : askingBounds?.exact
          ? `ca. ${formatMoney(preContractBonus)}`
          : askingBounds
            ? `ca. ${formatMoney(Math.round(preContractBonus * 0.7))}–${formatMoney(Math.round(preContractBonus * 1.3))}`
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
    owned || !scoutEstimate
      ? null
      : confidenceLabel({ status: "scouted", estimate: scoutEstimate });
  const ca = owned
    ? formatScoutCa(player, scoutEstimate ?? { estimatedAbilityMean: 65, uncertaintyRange: 0, sampleSize: 0 }, true)
    : scoutEstimate
      ? formatScoutCa(player, scoutEstimate, false)
      : "?";
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

  function openContractTalk() {
    if (!talkLock.allowed) return;
    setOffer(defaultContractOffer(player, season));
    setTalksOpen(true);
  }

  return (
    <main className="profile club-shell-card-body">
      <div className="fm-tab-panel">
        {actionFeedback ? (
          <p
            className={
              /nicht möglich|zu niedrig|Fenster zu|nur im|Scout-Ziel|Transfer-Topf/.test(actionFeedback)
                ? "profile-feedback is-warn"
                : "profile-feedback"
            }
            role="status"
          >
            {actionFeedback}
          </p>
        ) : null}

        <article className="profile-card profile-hub">
          {owned && onSelectSquadPlayer && squadPlayerIds.length > 1 ? (
            <nav className="profile-squad-nav" aria-label={t("profile.squadNav.aria")}>
              <button
                type="button"
                className="profile-squad-nav-btn"
                disabled={!prevSquadId}
                aria-label={t("profile.squadNav.prev")}
                onClick={() => prevSquadId && onSelectSquadPlayer(prevSquadId)}
              >
                <ChevronLeft size={20} strokeWidth={2.5} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="profile-squad-nav-btn"
                disabled={!nextSquadId}
                aria-label={t("profile.squadNav.next")}
                onClick={() => nextSquadId && onSelectSquadPlayer(nextSquadId)}
              >
                <ChevronRight size={20} strokeWidth={2.5} aria-hidden="true" />
              </button>
            </nav>
          ) : null}
          <aside className="profile-identity-rail" aria-label="Identität">
            <div className="profile-identity-head">
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
              <PlayerPortrait
                seed={player.portrait_seed}
                clubId={player.club_id}
                size="lg"
                className="profile-portrait profile-portrait-rail"
              />
              <Hint text="Spielername. Fremde Spieler werden erst durch Scouting besser bekannt." block>
                <h1 className="profile-name">{formatPlayerName(player)}</h1>
              </Hint>
            </div>
          <div className="profile-identity-body">
            <div className="profile-identity-stats">
              <Hint text="Hauptposition auf dem Platz.">
                <span className="profile-stat">{formatPlayerPositionLabel(player)}</span>
              </Hint>
              <Hint text="Alter in Jahren.">
                <span className="profile-stat">{player.age} J.</span>
              </Hint>
              <Hint text="Current Ability — geschätzte Gesamtstärke.">
                <span className="profile-stat profile-stat-ca">CA {ca}</span>
              </Hint>
              {owned && caDelta !== null && caDelta !== 0 ? (
                <Hint text="CA-Änderung seit der letzten simulierten Woche.">
                  <span className={`profile-stat ${caDelta > 0 ? "is-up" : "is-down"}`}>
                    {formatCaDelta(caDelta)}
                  </span>
                </Hint>
              ) : null}
              {scoutLabel ? (
                <Hint text="Wie gut dein Verein diesen Spieler kennt.">
                  <span className="profile-scout-badge">{scoutLabel}</span>
                </Hint>
              ) : null}
            </div>
            <div className="profile-state profile-state-inline" aria-label="Zustand">
              {player.state.injury ? (
                <StateChip
                  label="Verletzt"
                  mark="◆"
                  tone="low"
                  value={`${injuryTypeLabel(player.state.injury.type_id)} · ${player.state.injury.weeks_remaining} Wo.`}
                />
              ) : (
                <StateChip label="Fit" mark={fitness.mark} tone={fitness.tone} value={formatState(player.state.fitness, owned, scoutEstimate)} />
              )}
              <StateChip label="Form" mark={form.mark} tone={form.tone} value={formatState(player.state.form, owned, scoutEstimate, true)} />
              <StateChip label="Moral" mark={morale.mark} tone={morale.tone} value={formatState(player.state.morale, owned, scoutEstimate)} />
            </div>
            {xpBar ? (
              <Hint
                text={`Karriere-Einsätze (${xpBar.apps}). Der Balken skaliert bis ${EXPERIENCE_APPS_SOFT_CAP} Spiele — beeinflusst Match-Reife, kein Potential.`}
                block
              >
                <div className="profile-rail-xp" aria-label={xpBar.label}>
                  <span className="profile-rail-xp-label">Erfahrung</span>
                  <div
                    className="profile-xp-track profile-rail-xp-track"
                    role="meter"
                    aria-valuemin={0}
                    aria-valuemax={EXPERIENCE_APPS_SOFT_CAP}
                    aria-valuenow={xpBar.apps}
                    aria-label={`${experienceTierLabel(xpBar)} · ${xpBar.apps} Einsätze`}
                  >
                    <span className="profile-xp-fill" style={{ width: `${xpBar.fill * 100}%` }} />
                  </div>
                  <span className="profile-rail-xp-caption">{experienceCaption(xpBar)}</span>
                </div>
              </Hint>
            ) : null}
            <Hint text="Stammdaten auf einen Blick." block>
              <p className="profile-meta-line">
                {facts.map((fact, index) => (
                  <span key={fact.label}>
                    {index > 0 ? " · " : null}
                    <abbr className="profile-meta-abbr" title={fact.label}>
                      {fact.value}
                    </abbr>
                  </span>
                ))}
              </p>
            </Hint>
            {flavor ? (
              <Hint text={flavor.body ?? flavor.headline} block>
                <p className="profile-flavor-one">{flavor.headline}</p>
              </Hint>
            ) : (
              <p className="profile-flavor-one is-muted">Noch kaum Gerüchte.</p>
            )}
            {achievements.length > 0 ? (
              <ul className="profile-achievements" aria-label="Erfolge">
                {achievements.map((badge) => (
                  <li key={badge}>{badge}</li>
                ))}
              </ul>
            ) : null}
          </div>

          {owned && (onList || (onProfileAction && railMenuItems.length > 0)) ? (
            <footer className="profile-rail-actions" aria-label="Aktionen">
              <div className="profile-actions-rail">
                {onList ? (
                  <div className="profile-action-cell profile-action-cell--span">
                    <Hint
                      text={
                        listedForSale
                          ? t("transfer.profile.listedHint")
                          : (saleBlockedReason ??
                            (!transferWindowOpen
                              ? t("transfer.profile.saleWindowOnly", { hint: transferWindowHint() })
                              : t("transfer.profile.listHint")))
                      }
                      block
                    >
                      <ProfileActionButton
                        label={
                          listedForSale ? t("transfer.profile.listed") : t("transfer.profile.list")
                        }
                        amount={
                          !listedForSale && saleOffer ? formatMoney(saleOffer) : undefined
                        }
                        className={[
                          listedForSale ? "ui-btn--ghost is-listed" : "ui-btn--ghost",
                          !listedForSale && (!transferWindowOpen || saleBlockedReason)
                            ? "is-blocked"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={handleListClick}
                        aria-pressed={listedForSale}
                        aria-disabled={
                          listedForSale || !transferWindowOpen || Boolean(saleBlockedReason)
                        }
                      />
                    </Hint>
                  </div>
                ) : null}
                {onProfileAction
                  ? railMenuItems.map((item) => (
                      <div key={item.action} className="profile-action-cell">
                        <Hint text={item.hint} block>
                          <ProfileActionButton
                            label={item.label}
                            className={railProfileActionClass(item)}
                            onClick={() => onProfileAction(item.action)}
                          />
                        </Hint>
                      </div>
                    ))
                  : null}
              </div>
            </footer>
          ) : null}

          {!owned && onAssignScout ? (
            <footer className="profile-rail-actions" aria-label="Scouting und Transfer">
              {transferNotice ? (
                <p className="profile-purchase-block" role="status">
                  {transferNotice}
                </p>
              ) : null}
              {scouting ? (
                <p className="profile-status" role="status">
                  Scout aktiv · Bericht nach Wochensim
                </p>
              ) : null}
              <div className="profile-actions">
                {!scouting ? (
                  <div className="profile-action-cell">
                    <Hint text="Scout beobachtet den Spieler jede Woche. Pipeline → Woche simulieren." block>
                      <ProfileActionButton label="Scouten" className="ui-btn--primary" onClick={onAssignScout} />
                    </Hint>
                  </div>
                ) : null}
                {onToggleShortlist ? (
                  <div className="profile-action-cell is-compact">
                    <button
                      type="button"
                      className="ui-btn ui-btn--ghost profile-action-btn is-icon"
                      aria-label={shortlisted ? "Von Merkliste entfernen" : "Auf Merkliste setzen"}
                      aria-pressed={shortlisted}
                      onClick={onToggleShortlist}
                    >
                      <Star
                        className={shortlisted ? "profile-action-icon is-filled" : "profile-action-icon"}
                        aria-hidden="true"
                        size={18}
                        fill={shortlisted ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                ) : null}
                {onPurchase ? (
                  <div className="profile-action-cell">
                    <Hint text={purchaseHintText} block>
                      <ProfileActionButton
                        label={t("transfer.profile.buy")}
                        amount={purchaseAmountLabel}
                        className={hasScoutIntel || scouting ? "ui-btn--primary" : "ui-btn--ghost"}
                        onClick={handlePurchaseClick}
                      />
                    </Hint>
                  </div>
                ) : null}
                {onPreContract ? (
                  <div className="profile-action-cell">
                    <Hint
                      text={
                        preContractBlockedReason ??
                        "Vorvertrag ab 6 Monate vor Vertragsende. Signaturbonus 10–15 % der gesparten Ablöse — 1–3 Liga-Mitbieter."
                      }
                      block
                    >
                      <ProfileActionButton
                        label="Vorvertrag"
                        amount={preContractAmountLabel}
                        className="ui-btn--ghost"
                        onClick={onPreContract}
                        disabled={Boolean(preContractBlockedReason) || askingBounds === null}
                      />
                    </Hint>
                  </div>
                ) : null}
              </div>
            </footer>
          ) : null}
        </aside>

        <div className="profile-hub-spoke">
          <div className="profile-spoke-tabs fm-tab-bar" role="tablist" aria-label="Spielerakte">
            {PROFILE_TABS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={tab === entry.id}
                className={tab === entry.id ? "fm-tab is-active" : "fm-tab"}
                onClick={() => setTab(entry.id)}
              >
                {t(entry.labelKey)}
              </button>
            ))}
          </div>
          <div className="profile-tab-panels" role="tabpanel">
          {tab === "overview" ? (
            <section
              className={`profile-panel profile-overview${owned ? "" : " profile-overview--scout"}`}
              aria-label={t("profile.tab.overview")}
            >
              <div className="profile-overview-grid">
                <div className="profile-overview-primary">
                  <Hint text="Sechs Kernattribute als Hex. Eigene Spieler: Fläche. Scouts: CI-Ring." block>
                    <div className="profile-attr-hex-wrap profile-attr-hex-wrap--hero">
                      <p className="profile-section-label">Kernattribute</p>
                      <AttributeHex bars={bars} owned={owned} />
                    </div>
                  </Hint>

                  {lanes.length > 0 ? (
                    <Hint text="Grobe Eignung aus Hauptposition und Umschulung — keine zweite Attributliste." block>
                      <StaerkeAlsCompact lanes={lanes} primaryLane={primaryLane} />
                    </Hint>
                  ) : (
                    <p className="profile-empty">Stärke als… unbekannt — mehr scouting.</p>
                  )}

                  <SkillEncyclopediaDetails
                    player={player}
                    owned={owned}
                    estimate={scoutEstimate}
                    count={encyclopediaCount}
                  />
                </div>

                {owned ? (
                  <div className="profile-overview-secondary">
                    {trainingTarget ? (
                      <Hint text="Individuelles Extra-Programm, sonst der Mannschaftsfokus. Kein Stempel-Effekt." block>
                        <div className="profile-ziel">
                          <p className="profile-section-label">Aktuelles Ziel</p>
                          <p className="profile-ziel-title">
                            <TrainingTargetAccentIcon accent={trainingTarget.accent} />
                            {trainingTarget.title}
                          </p>
                          <p className="profile-ziel-detail">{trainingTarget.detail}</p>
                          {trainingTarget.progress !== null ? (
                            <div
                              className="profile-ziel-track"
                              aria-label={`Fortschritt ${Math.round(trainingTarget.progress * 100)} Prozent`}
                            >
                              <span className="profile-ziel-fill" style={{ width: `${trainingTarget.progress * 100}%` }} />
                            </div>
                          ) : (
                            <p className="profile-ziel-hint">Kein persönlicher Fortschritt — Teamplan.</p>
                          )}
                          {onOpenTraining ? (
                            <button type="button" className="ui-btn ui-btn--ghost profile-ziel-btn" onClick={onOpenTraining}>
                              <Dumbbell aria-hidden size={16} />
                              Einzeltraining
                            </button>
                          ) : null}
                        </div>
                      </Hint>
                    ) : (
                      <p className="profile-empty">Kein Trainingsfokus gesetzt.</p>
                    )}

                    <StampHungerSlots
                      player={player}
                      programs={individualPrograms ?? []}
                      week={week ?? 1}
                      onStartStamp={onStartStampProgram}
                    />

                    {owned ? (
                      <MarketValueBreakdownStrip player={player} season={season} />
                    ) : null}

                    <Hint text="Vertragsstatus. Verhandeln öffnet Gehalt, Jahre, Bonus, Minuten und Startplatz." block>
                      <div className="profile-vertrag">
                        <p className="profile-section-label">Vertrag</p>
                        <p className="profile-vertrag-status">{contract.status}</p>
                        <p className="profile-vertrag-line">{contract.wageWeekly} · bis {contract.untilSeason}</p>
                        <p className="profile-vertrag-line">{contract.minutesPromise}</p>
                        {talkLock.reason ? (
                          <p className="profile-talk-warn">{talkLock.reason}</p>
                        ) : (player.state.contract_failed_offers ?? 0) > 0 ? (
                          <p className="profile-talk-warn">
                            {player.state.contract_failed_offers}/{FRUSTRATION_THRESHOLD} Fehlangebote
                          </p>
                        ) : null}
                        {canTalk ||
                        (onProfileAction && careerMenuItems.length > 0) ? (
                          <div className="profile-vertrag-actions">
                            {canTalk && !youthContractPending ? (
                              <Hint text={talkLock.reason ?? "Gehalt, Laufzeit, Bonus, Minuten und Startplatz."}>
                                <button
                                  type="button"
                                  className="ui-btn profile-action-btn ui-btn--primary"
                                  disabled={!talkLock.allowed}
                                  onClick={openContractTalk}
                                >
                                  <PenLine aria-hidden size={16} />
                                  Verhandeln
                                </button>
                              </Hint>
                            ) : null}
                            {onProfileAction
                              ? careerMenuItems.map((item) => (
                                  <Hint key={item.action} text={item.hint}>
                                    <button
                                      type="button"
                                      className={`ui-btn profile-action-btn ${careerActionButtonClass(item.action)}`}
                                      onClick={() => {
                                        if (item.action === "sign_contract") {
                                          setOffer(defaultContractOffer(player, season));
                                          setTalksOpen(true);
                                          return;
                                        }
                                        onProfileAction(item.action);
                                      }}
                                    >
                                      {item.action === "sign_contract" ? (
                                        <PenLine aria-hidden size={16} />
                                      ) : null}
                                      {item.label}
                                    </button>
                                  </Hint>
                                ))
                              : null}
                          </div>
                        ) : null}
                      </div>
                    </Hint>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {tab === "development" ? (
            <DevelopmentTab
              player={player}
              owned={owned}
              growth={growth}
              timeline={timeline}
              reveal={reveal}
            />
          ) : null}

          {tab === "stats" ? (
            <StatsTab
              player={player}
              season={season}
              owned={owned}
              scoutEstimate={scoutEstimate}
            />
          ) : null}
          </div>
        </div>
        </article>

        {onOpenYouth ? (
          <button type="button" className="profile-next" onClick={onOpenYouth}>
            → Zur Jahrgangsliste
          </button>
        ) : null}
      </div>

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
  const recentGrowth = player.state.recent_growth_26w ?? 0;
  const chartPoints = layoutGrowthChart(growth, 320, 56);
  const singleSeason = growth.length < 2;

  return (
    <section className="profile-panel" aria-label="Verlauf">
      {owned ? (
        <p className="profile-growth-note">
          26 Wochen {formatRecentGrowth(recentGrowth)}
          {singleSeason ? ` · ${formatSeasonLabel(growth[0]?.season ?? 1)} · erster Stand` : ""}
        </p>
      ) : null}

      {growth.length > 0 && !singleSeason ? (
        <Hint text="CA-Verlauf über die Saisons." block>
          <div className="profile-growth">
            <svg viewBox="0 0 320 56" role="img" aria-label="CA-Verlauf">
              <polyline
                points={growthPolyline(growth, 320, 56)}
                fill="none"
                stroke="#059669"
                strokeWidth="3"
              />
              {chartPoints.map((point) => (
                <circle key={`${point.season}-${point.ca}`} cx={point.x} cy={point.y} r="4" fill="#047857" />
              ))}
            </svg>
            <p className="profile-growth-note">
              {formatSeasonLabel(growth[0]?.season ?? 1)} → {formatSeasonLabel(growth.at(-1)?.season ?? growth[0]?.season ?? 1)}
            </p>
          </div>
        </Hint>
      ) : owned ? null : growth.length > 0 ? (
        <p className="profile-growth-note">{reveal?.showExactCa ? "Scout-Schätzung" : "Noch kein belastbarer Verlauf"}</p>
      ) : (
        <p className="profile-growth-note profile-growth-empty">Entwicklung noch unbekannt</p>
      )}

      {owned && timeline.length > 0 ? (
        <div className="profile-timeline" aria-label="Breakouts">
          {timeline.map((flag) => (
            <span key={flag} title={visibleBreakoutLabel(flag)}>
              <Lightbulb className="profile-timeline-icon" size={16} aria-label={visibleBreakoutLabel(flag)} />
            </span>
          ))}
        </div>
      ) : null}
    </section>
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
    <section className="profile-panel" aria-label="Statistik">
      <nav className="profile-year-tabs" aria-label="Kalenderjahr">
        {seasons.map((entry) => (
          <button
            key={entry}
            type="button"
            className={selectedSeason === entry ? "profile-year-tab is-active" : "profile-year-tab"}
            aria-pressed={selectedSeason === entry}
            onClick={() => setSelectedSeason(entry)}
          >
            {seasonCalendarYear(entry)}
          </button>
        ))}
      </nav>
      <Hint
        text={
          archived
            ? "Abgeschlossene Saison — synthetische Karriere-Archive (Welt-Start)."
            : "Saisonwerte aus Ligaspielen in der laufenden Saison."
        }
        block
      >
        {stats ? (
          <dl className="profile-stat-grid">
            <StatItem label="Einsätze" value={String(stats.apps)} />
            <StatItem label="Tore" value={String(stats.goals)} />
            <StatItem label="Vorlagen" value={String(stats.assists)} />
            <StatItem label="Minuten" value={String(stats.minutes)} />
            <StatItem label="Ø Note" value={stats.rating} />
          </dl>
        ) : (
          <p className="profile-empty">
            {owned ? "Noch keine Saison-Spiele." : "Statistik unbekannt — mehr Scouting nötig."}
          </p>
        )}
      </Hint>
    </section>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="profile-stat-item">
      <div className="profile-stat-item-head">
        <span className="profile-stat-item-label">{label}</span>
      </div>
      <strong className="profile-stat-item-value">{value}</strong>
    </div>
  );
}

function railProfileActionClass(_item: ProfileMenuItem): string {
  return "ui-btn--ghost profile-action-btn";
}

function careerActionButtonClass(action: PlayerProfileAction): string {
  if (action === "promote_pro" || action === "sign_contract") {
    return "ui-btn--primary";
  }
  return "ui-btn--ghost";
}

function ProfileActionButton({
  label,
  amount,
  className = "",
  ...props
}: {
  label: string;
  amount?: string;
  className?: string;
} & ComponentPropsWithoutRef<"button">) {
  const blocked = className.includes("is-blocked");
  const { disabled, ...rest } = props;
  return (
    <button
      type="button"
      className={`ui-btn profile-action-btn ${className}`.trim()}
      disabled={blocked ? false : disabled}
      {...rest}
    >
      <span className="profile-action-label">{label}</span>
      {amount ? <span className="profile-action-amount">{amount}</span> : null}
    </button>
  );
}

function AttributeHex({ bars, owned }: { bars: AttributeBar[]; owned: boolean }) {
  const cx = 100;
  const cy = 100;
  const maxR = 72;
  const grid = [0.33, 0.66, 1].map((scale) => hexRegularPoints(cx, cy, maxR * scale, bars.length || 6));
  const values = bars.map((bar) => bar.value);
  const fill = hexValuePoints(values, cx, cy, maxR);
  const ciLow = bars.every((bar) => bar.low !== undefined)
    ? hexValuePoints(bars.map((bar) => bar.low ?? 0), cx, cy, maxR)
    : null;
  const ciHigh = bars.every((bar) => bar.high !== undefined)
    ? hexValuePoints(bars.map((bar) => bar.high ?? 0), cx, cy, maxR)
    : null;
  const showRing = !owned && Boolean(ciLow && ciHigh);
  return (
    <svg className="profile-hex" viewBox="0 0 200 200" role="img" aria-label="Kernattribute Hexagon">
      {grid.map((points) => (
        <polygon key={points} className="profile-hex-grid" points={points} />
      ))}
      {owned ? <polygon className="profile-hex-fill" points={fill} /> : null}
      {showRing && ciLow && ciHigh ? (
        <g>
          <polygon className="profile-hex-ci-outer" points={ciHigh} />
          <polygon className="profile-hex-ci-inner" points={ciLow} />
        </g>
      ) : null}
      {bars.map((bar, index) => {
        const labelAt = hexVertex(cx, cy, maxR + 16, index, bars.length);
        const valueLabel = bar.showValue
          ? String(bar.value)
          : bar.showCi && bar.low !== undefined && bar.high !== undefined
            ? `${bar.low}–${bar.high}`
            : "?";
        return (
          <g key={bar.key}>
            <text
              className="profile-hex-label"
              x={labelAt.x}
              y={labelAt.y - 5}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {attributeLabel(bar.key)}
            </text>
            <text
              className="profile-hex-value"
              x={labelAt.x}
              y={labelAt.y + 7}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {valueLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function experienceTierLabel(bar: ExperienceBar): string {
  if (bar.raw) return "Roh";
  if (bar.fill >= 0.85) return "Erfahren";
  if (bar.fill >= 0.35) return "Etabliert";
  return "Jung";
}

function experienceCaption(bar: ExperienceBar): string {
  return `${experienceTierLabel(bar)} · ${bar.apps}`;
}

function formatSkillDisplayValue(bar: AttributeBar): string {
  if (bar.showValue) return String(bar.value);
  if (bar.showCi && bar.low !== undefined && bar.high !== undefined) {
    return `${bar.low}–${bar.high}`;
  }
  return "?";
}

function TrainingTargetAccentIcon({ accent }: { accent: DossierTrainingAccent }) {
  const className = "profile-ziel-accent-icon";
  switch (accent) {
    case "team":
      return <Users className={className} size={18} aria-hidden />;
    case "weak_foot":
    case "attribute_focus":
      return <Footprints className={className} size={18} aria-hidden />;
    case "stamp":
      return <Flag className={className} size={18} aria-hidden />;
    case "individual":
      return <Dumbbell className={className} size={18} aria-hidden />;
    default:
      return <Dumbbell className={className} size={18} aria-hidden />;
  }
}

function StaerkeAlsCompact({
  lanes,
  primaryLane,
}: {
  lanes: ReturnType<typeof staerkeAlsLanes>;
  primaryLane: ReturnType<typeof positionLane>;
}) {
  return (
    <div className="profile-staerke profile-staerke--row" aria-label="Stärke als">
      <p className="profile-section-label">Stärke als…</p>
      <div className="profile-staerke-chips" role="list">
        {lanes.map((lane) => {
          const isPrimary = lane.lane === primaryLane;
          const score = lane.value > 0 ? `${Math.round(lane.value * 100)}` : "—";
          return (
            <span
              key={lane.lane}
              role="listitem"
              className={isPrimary ? "profile-staerke-chip is-primary" : "profile-staerke-chip"}
              title={lane.label}
            >
              <span className="profile-staerke-chip-lane">{lane.lane}</span>
              <span className="profile-staerke-chip-value">{score}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function SkillEncyclopediaDetails({
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
  return (
    <details className="profile-attr-encyclopedia">
      <summary className="profile-attr-encyclopedia-summary">
        <span>Alle Attribute ({count})</span>
        <ChevronDown className="profile-attr-encyclopedia-chevron" size={16} aria-hidden />
      </summary>
      <SkillEncyclopediaTable player={player} owned={owned} estimate={estimate} />
    </details>
  );
}

function SkillEncyclopediaTable({
  player,
  owned,
  estimate,
}: {
  player: Player;
  owned: boolean;
  estimate?: AbilityEstimate;
}) {
  const groups = fullSkillSheet(player, owned, estimate);
  const markers = playerStampGateMarkers(player);
  return (
    <div className="profile-encyclopedia-grid" aria-label="Attribut-Enzyklopädie">
      {groups.map((group) => (
        <div key={group.id} className="profile-encyclopedia-col">
          <p className="profile-section-label">{group.label}</p>
          <table className="profile-encyclopedia-table">
            <tbody>
              {group.bars.map((bar) => {
                const gate = stampGateTitle(bar.key, markers);
                return (
                  <tr
                    key={bar.key}
                    className={bar.dimmed ? "is-dimmed" : undefined}
                    title={gate}
                  >
                    <th scope="row" className="profile-encyclopedia-attr">
                      {attributeLabel(bar.key)}
                      {gate ? (
                        <span title={gate}>
                          <Flag className="profile-encyclopedia-gate" size={12} aria-label={gate} />
                        </span>
                      ) : null}
                    </th>
                    <td className="profile-encyclopedia-value">{formatSkillDisplayValue(bar)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function StampHungerSlots({
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
  const badges = activeStampBadges(player, FAEHIGKEIT_HUNGER_SLOTS);
  const stampProgram = programs.find((entry) => entry.playerId === player.id && entry.kind === "stamp");
  const eligible = [...eligibleTrainStamps(player)];
  const elapsed = stampProgram ? Math.max(0, week - stampProgram.startedWeek) : 0;
  const total = stampProgram ? Math.max(1, elapsed + stampProgram.weeksRemaining) : 1;
  const progress = stampProgram ? Math.min(1, elapsed / total) : 0;
  let usedProgress = false;

  return (
    <div className="profile-hunger" aria-label="Fähigkeiten">
      <p className="profile-section-label">Fähigkeiten / Bonus</p>
      {Array.from({ length: FAEHIGKEIT_HUNGER_SLOTS }, (_, index) => {
        const stamp = badges[index];
        const slotLabel = index === FAEHIGKEIT_HUNGER_SLOTS - 1 ? "Bonus" : "Fähigkeit";
        if (stamp) {
          const appliedHint = Object.entries(stamp.applied)
            .map(([key, delta]) => {
              const attr = key as Parameters<typeof attributeLabel>[0];
              return `${attributeLabel(attr)} ${formatGrowthDelta(delta ?? null)}`;
            })
            .join(" · ");
          return (
            <div key={index} className="profile-hunger-slot">
              <span>{slotLabel}</span>
              <span
                className="profile-hunger-stamp"
                title={`${stampLabel(stamp.id)} · ${stamp.path} · ${appliedHint}`}
              >
                {stampIcon(stamp.id)} {stampLabel(stamp.id)}
              </span>
            </div>
          );
        }
        if (stampProgram && !usedProgress) {
          usedProgress = true;
          return (
            <div key={index} className="profile-hunger-slot">
              <span>{slotLabel}</span>
              <div className="profile-hunger-train" title={programLabel(stampProgram)}>
                <span>
                  {stampIcon(stampProgram.stampId ?? "")} {programLabel(stampProgram)}
                </span>
                <div
                  className="profile-ziel-track"
                  aria-label={`Fortschritt ${Math.round(progress * 100)} Prozent`}
                >
                  <span className="profile-ziel-fill" style={{ width: `${progress * 100}%` }} />
                </div>
              </div>
            </div>
          );
        }
        const nextStamp = eligible.shift();
        if (nextStamp && onStartStamp) {
          const hybrid = nextStamp.path === "hybrid";
          return (
            <div key={index} className="profile-hunger-slot">
              <span>{slotLabel}</span>
              <button
                type="button"
                className={hybrid ? "profile-hunger-start is-hybrid" : "profile-hunger-start"}
                onClick={() => onStartStamp(nextStamp.id)}
                title={
                  hybrid
                    ? `${nextStamp.label} siegeln · ${nextStamp.weeks ?? "?"} Wochen`
                    : `${nextStamp.label} trainieren · ${nextStamp.weeks ?? "?"} Wochen`
                }
              >
                {nextStamp.icon} {nextStamp.label} {hybrid ? "siegeln" : "starten"}
              </button>
            </div>
          );
        }
        return (
          <div key={index} className="profile-hunger-slot">
            <span>{slotLabel}</span>
            <span className="profile-hunger-empty" title="Leerer Slot">
              —
            </span>
          </div>
        );
      })}
      <p className="profile-hunger-note">
        {(player.stamps?.length ?? 0) > 0
          ? `${player.stamps.length} Stempel — Training, Meilenstein oder Start-Makel.`
          : eligible.length > 0
            ? "Slot klicken startet ein Stempel-Programm (Training oder Hybrid-Siegel)."
            : "Noch leer — trainiere freigeschaltete Stempel oder erreiche Meilensteine."}
      </p>
    </div>
  );
}

function formatState(
  value: number,
  owned: boolean,
  scoutEstimate?: AbilityEstimate,
  signed = false,
): string {
  if (owned || !scoutEstimate) {
    return signed && value > 0 ? `+${value}` : String(value);
  }
  const masked = formatScoutStateValue(value, scoutEstimate, false);
  if (masked === "?") return "?";
  return signed && value > 0 ? `+${value}` : masked;
}

function StateChip({
  label,
  mark,
  tone,
  value,
}: {
  label: string;
  mark: string;
  tone: "good" | "mid" | "low";
  value: string;
}) {
  return (
    <div className={`profile-chip tone-${tone}`}>
      <span aria-hidden="true">{mark}</span>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatMoney(amount: number): string {
  return formatClubCash(amount);
}
