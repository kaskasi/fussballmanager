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
import type { IndividualProgram } from "../../development/individual-training.ts";
import { programLabel } from "../../development/individual-training.ts";
import type { TrainingSlot } from "../../development/training-units.ts";
import {
  profileMenuItems,
  type PlayerProfileAction,
} from "../../player/profile-actions.ts";
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
import { cannotOpenPurchaseReason } from "../../transfers/purchase-block.ts";
import { BlindPurchaseWarningModal } from "../components/BlindPurchaseWarningModal.tsx";
import { ContractTalksModal } from "../components/ContractTalksModal.tsx";
import { SaleConfirmModal } from "../components/SaleConfirmModal.tsx";
import { formatPlayerName } from "../../types/player-display.ts";
import { confidenceLabel, type AbilityEstimate } from "../../scouting/estimate-model.ts";
import {
  formatScoutCa,
  formatScoutMarketValue,
  formatScoutStateValue,
  scoutMarketValueBounds,
  scoutReveal,
} from "../../scouting/scout-visibility.ts";
import { Hint } from "../components/Hint.tsx";
import { PlayerPortrait } from "../components/PlayerPortrait.tsx";
import { ProfileActionsMenu } from "../components/ProfileActionsMenu.tsx";
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
  profileExperienceBar,
  profileFacts,
  staerkeAlsLanes,
  stampGateTitle,
  stateMark,
  visibleBreakoutFlags,
  type AttributeBar,
} from "../player-profile.ts";
import {
  activeStampBadges,
  eligibleTrainStamps,
  stampIcon,
  stampLabel,
} from "../../development/ability-stamps.ts";
import { formatGrowthDelta } from "../../player/growth-history.ts";
import {
  BarChart3,
  Dumbbell,
  FileSignature,
  LineChart,
  Shirt,
  type LucideIcon,
} from "lucide-react";

type ProfileTab = "attributes" | "training" | "contract" | "development" | "stats";

const PROFILE_TAB_ICONS: Record<ProfileTab, LucideIcon> = {
  attributes: BarChart3,
  training: Dumbbell,
  contract: FileSignature,
  development: LineChart,
  stats: Shirt,
};

const PROFILE_TABS: { id: ProfileTab; label: string }[] = [
  { id: "attributes", label: "Attribute" },
  { id: "training", label: "Training" },
  { id: "contract", label: "Vertrag" },
  { id: "development", label: "Verlauf" },
  { id: "stats", label: "Saisonwerte" },
];

const CARD_ACTIONS: Partial<Record<PlayerProfileAction, { label: string; className: string }>> = {
  promote_pro: { label: "⬆️ Profikader", className: "ui-btn--primary" },
  promote_u19: { label: "⬆️ U19", className: "ui-btn--ghost" },
};

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
  onBack: () => void;
  onOpenYouth?: () => void;
  onOpenTraining?: () => void;
  onStartStampProgram?: (stampId: string) => void;
  onAssignScout?: () => void;
  onToggleShortlist?: () => void;
  onPurchase?: () => void;
  preContractBonus?: number;
  preContractBlockedReason?: string | null;
  onPreContract?: () => void;
  onSell?: () => void;
  onProfileAction?: (action: PlayerProfileAction) => void;
  onContractOffer?: (offer: ContractOffer) => void;
  wageHeadroomWeekly?: number;
  weekday?: number;
  actionFeedback?: string | null;
  onTransferNotice?: (message: string) => void;
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
  onBack,
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
  onSell,
  onProfileAction,
  onContractOffer,
  wageHeadroomWeekly,
  weekday = 1,
  actionFeedback = null,
  onTransferNotice,
}: PlayerProfileProps) {
  const t = useT();
  const [tab, setTab] = useState<ProfileTab>("attributes");
  const [menuOpen, setMenuOpen] = useState(false);
  const [talksOpen, setTalksOpen] = useState(false);
  const [offer, setOffer] = useState<ContractOffer | null>(null);
  const [blindBuyOpen, setBlindBuyOpen] = useState(false);
  const [saleConfirmOpen, setSaleConfirmOpen] = useState(false);

  useEffect(() => {
    setTalksOpen(false);
    setOffer(null);
    setTab("attributes");
    setBlindBuyOpen(false);
    setSaleConfirmOpen(false);
  }, [player.id]);
  const menuItems = profileMenuItems(player, owned, season);
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
  const purchaseBlockedReason = cannotOpenPurchaseReason(week, true);
  const purchaseHardBlocked = Boolean(purchaseBlockedReason);
  const purchaseHintText =
    purchaseBlockedReason ??
    (!hasScoutIntel
      ? t("transfer.profile.noScoutBuy")
      : listPriceExceedsBudget
        ? t("transfer.profile.listOverPot", {
            pot: formatClubCash(transferBudget ?? 0),
          })
        : t("transfer.profile.offerMarket"));
  const transferNotice =
    purchaseBlockedReason ??
    (actionFeedback &&
    /nicht möglich|zu niedrig|Fenster zu|nur im|Scout-Ziel|Transfer-Topf/.test(actionFeedback)
      ? actionFeedback
      : null);

  function notifyTransfer(message: string) {
    onTransferNotice?.(message);
  }

  function handlePurchaseClick() {
    if (!onPurchase) return;
    if (purchaseHardBlocked) {
      notifyTransfer(purchaseBlockedReason ?? t("transfer.profile.purchaseGeneric"));
      return;
    }
    if (!hasScoutIntel) {
      setBlindBuyOpen(true);
      return;
    }
    onPurchase();
  }

  function handleSaleClick() {
    if (!onSell) return;
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
  const metaLine = facts.map((fact) => `${fact.icon} ${fact.value}`).join(" · ");
  const flavor = flavorForScout(player, owned, scoutEstimate);
  const achievements = achievementBadges(player, owned, scoutEstimate);
  const contract = contractView(player, owned, scoutEstimate);
  const lanes = owned || reveal?.showExactSkills ? staerkeAlsLanes(player) : [];
  const trainingTarget = owned
    ? dossierTrainingTarget(player, individualPrograms, trainingPlan, week)
    : null;
  const cardActions = menuItems.filter((item) => CARD_ACTIONS[item.action]);
  const caDelta = owned ? weeklyCaDelta(player) : null;
  const talkLock = contractTalkLock(player, { season, week, weekday });
  const canTalk = owned && Boolean(onContractOffer) && player.squad_status !== "loaned_out";

  return (
    <main className="profile">
      <header className="profile-toolbar">
        <button type="button" onClick={onBack} aria-label="Zurück">
          ←
        </button>
        <p className="profile-toolbar-title eyebrow">Spieler{week ? ` · Woche ${week}` : ""}</p>
        {owned && onProfileAction ? (
          <ProfileActionsMenu
            open={menuOpen}
            items={menuItems}
            onToggle={() => setMenuOpen((open) => !open)}
            onClose={() => setMenuOpen(false)}
            onSelect={onProfileAction}
          />
        ) : null}
      </header>

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

      <article className="profile-card">
        <div className="profile-identity">
          <PlayerPortrait seed={player.portrait_seed} size="md" className="profile-portrait" />
          <div className="profile-identity-body">
            <Hint text="Spielername. Fremde Spieler werden erst durch Scouting besser bekannt." block>
              <h1 className="profile-name">{formatPlayerName(player)}</h1>
            </Hint>
            <div className="profile-identity-stats">
              <Hint text="Hauptposition auf dem Platz.">
                <span className="profile-stat">{player.position}</span>
              </Hint>
              <Hint text="Alter in Jahren.">
                <span className="profile-stat">{player.age} J.</span>
              </Hint>
              <Hint text="Current Ability — geschätzte Gesamtstärke.">
                <span className="profile-stat profile-stat-ca">CA {ca}</span>
              </Hint>
              {owned && caDelta !== null ? (
                <span className={`profile-stat ${caDelta > 0 ? "is-up" : caDelta < 0 ? "is-down" : ""}`}>
                  {formatCaDelta(caDelta)}
                </span>
              ) : null}
              {scoutLabel ? (
                <Hint text="Wie gut dein Verein diesen Spieler kennt.">
                  <span className="profile-scout-badge">{scoutLabel}</span>
                </Hint>
              ) : null}
            </div>
            <div className="profile-state profile-state-inline" aria-label="Zustand">
              <StateChip label="Fit" mark={fitness.mark} tone={fitness.tone} value={formatState(player.state.fitness, owned, scoutEstimate)} />
              <StateChip label="Form" mark={form.mark} tone={form.tone} value={formatState(player.state.form, owned, scoutEstimate, true)} />
              <StateChip label="Moral" mark={morale.mark} tone={morale.tone} value={formatState(player.state.morale, owned, scoutEstimate)} />
            </div>
            <Hint text="Stammdaten auf einen Blick." block>
              <p className="profile-meta-line">{metaLine}</p>
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
        </div>

        <nav className="profile-tabs" aria-label="Spielerakte">
          {PROFILE_TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              className={tab === entry.id ? "profile-tab is-active" : "profile-tab"}
              aria-selected={tab === entry.id}
              onClick={() => setTab(entry.id)}
            >
              <span className="profile-tab-icon" aria-hidden="true">
                {(() => {
                  const Icon = PROFILE_TAB_ICONS[entry.id];
                  return <Icon size={18} strokeWidth={2.5} />;
                })()}
              </span>
              <span className="profile-tab-label">{entry.label}</span>
            </button>
          ))}
        </nav>

        <div className="profile-tab-panels" role="tabpanel">
          {tab === "attributes" ? (
            <section className="profile-panel" aria-label="Attribute">
              <Hint text="Sechs Kernattribute als Hex. Eigene Spieler: Fläche. Scouts: CI-Ring." block>
                <div className="profile-bars">
                  <p className="profile-section-label">Kernattribute</p>
                  <AttributeHex bars={bars} owned={owned} />
                  {bars.map((bar) => (
                    <div key={bar.key} className={bar.dimmed ? "profile-bar-row is-footnote is-dimmed" : "profile-bar-row is-footnote"}>
                      <span className="profile-bar-label">{attributeLabel(bar.key)}</span>
                      <div className="profile-bar-track">
                        {bar.showCi && bar.low !== undefined && bar.high !== undefined ? (
                          <span
                            className="profile-bar-ci"
                            style={{ left: `${(bar.low / 199) * 100}%`, width: `${((bar.high - bar.low) / 199) * 100}%` }}
                          />
                        ) : null}
                        <span className="profile-bar-fill" style={{ width: `${(bar.value / 199) * 100}%` }} />
                      </div>
                      <span className="profile-bar-value">{bar.showValue ? bar.value : "?"}</span>
                    </div>
                  ))}
                </div>
              </Hint>

              {xpBar ? (
                <div className="profile-xp" aria-label={xpBar.label}>
                  <span className="profile-xp-label">{xpBar.label}</span>
                  <div className="profile-bar-track" aria-hidden="true">
                    <span className="profile-bar-fill" style={{ width: `${xpBar.fill * 100}%` }} />
                  </div>
                  <span className="profile-bar-value">{xpBar.apps}</span>
                </div>
              ) : null}

              <FullSkillSheet player={player} owned={owned} estimate={scoutEstimate} />

              {lanes.length > 0 ? (
                <Hint text="Grobe Eignung aus Hauptposition und Umschulung — keine zweite Attributliste." block>
                  <div className="profile-staerke" aria-label="Stärke als">
                    <p className="profile-section-label">Stärke als…</p>
                    {lanes.map((lane) => (
                      <div key={lane.lane} className="profile-staerke-row">
                        <span className="profile-staerke-label">{lane.lane}</span>
                        <div className="profile-staerke-track">
                          <span className="profile-staerke-fill" style={{ width: `${lane.value * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Hint>
              ) : (
                <p className="profile-empty">Stärke als… unbekannt — mehr scouting.</p>
              )}
            </section>
          ) : null}

          {tab === "training" ? (
            <section className="profile-panel" aria-label="Training">
              {owned && trainingTarget ? (
                <Hint text="Individuelles Extra-Programm, sonst der Mannschaftsfokus. Kein Stempel-Effekt." block>
                  <div className="profile-ziel">
                    <p className="profile-section-label">Aktuelles Ziel</p>
                    <p className="profile-ziel-title">
                      <span aria-hidden="true">{trainingTarget.icon}</span> {trainingTarget.title}
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
                        🏋️ Einzeltraining
                      </button>
                    ) : null}
                  </div>
                </Hint>
              ) : (
                <p className="profile-empty">
                  {owned ? "Kein Trainingsfokus gesetzt." : "Training nur für eigene Spieler sichtbar."}
                </p>
              )}

              {owned ? (
                <StampHungerSlots
                  player={player}
                  programs={individualPrograms ?? []}
                  week={week ?? 1}
                  onStartStamp={onStartStampProgram}
                />
              ) : null}
            </section>
          ) : null}

          {tab === "contract" ? (
            <section className="profile-panel" aria-label="Vertrag">
              <Hint text="Vertragsstatus. Verhandeln öffnet Gehalt, Jahre, Bonus, Minuten und Startplatz." block>
                <div className="profile-vertrag">
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
                  {canTalk || (owned && onProfileAction && cardActions.length > 0) ? (
                    <div className="profile-vertrag-actions">
                      {canTalk ? (
                        <Hint text={talkLock.reason ?? "Gehalt, Laufzeit, Bonus, Minuten und Startplatz."}>
                          <button
                            type="button"
                            className="ui-btn profile-action-btn ui-btn--primary"
                            disabled={!talkLock.allowed}
                            onClick={() => {
                              if (!talkLock.allowed) return;
                              setOffer(defaultContractOffer(player, season));
                              setTalksOpen(true);
                            }}
                          >
                            ✍️ Verhandeln
                          </button>
                        </Hint>
                      ) : null}
                      {owned && onProfileAction
                        ? cardActions.map((item) => {
                            const spec = CARD_ACTIONS[item.action];
                            if (!spec) return null;
                            return (
                              <Hint key={item.action} text={item.hint}>
                                <button
                                  type="button"
                                  className={`ui-btn profile-action-btn ${spec.className}`}
                                  onClick={() => onProfileAction(item.action)}
                                >
                                  {spec.label}
                                </button>
                              </Hint>
                            );
                          })
                        : null}
                    </div>
                  ) : null}
                </div>
              </Hint>
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

        {!owned && onAssignScout ? (
          <footer className="profile-card-footer" aria-label="Scouting und Transfer">
            {transferNotice ? (
              <p className="profile-purchase-block" role="status">
                {transferNotice}
              </p>
            ) : null}
            {scouting ? (
              <p className="profile-status" role="status">
                <span aria-hidden="true">🟢</span>
                Scout aktiv · Bericht nach Wochensim
              </p>
            ) : null}
            <div className="profile-actions">
              {!scouting ? (
                <div className="profile-action-cell">
                  <Hint
                    text="Scout beobachtet den Spieler jede Woche. Pipeline → Woche simulieren."
                    block
                  >
                    <ProfileActionButton
                      label="Scouten"
                      className="ui-btn--primary"
                      onClick={onAssignScout}
                    />
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
                    <span className="profile-action-icon" aria-hidden="true">
                      {shortlisted ? "★" : "☆"}
                    </span>
                  </button>
                </div>
              ) : null}
              {onPurchase ? (
                <div className="profile-action-cell">
                  <Hint text={purchaseHintText} block>
                    <ProfileActionButton
                      label={t("transfer.profile.buy")}
                      amount={purchaseAmountLabel}
                      className={[
                        hasScoutIntel || scouting ? "ui-btn--primary" : "ui-btn--ghost",
                        purchaseHardBlocked ? "is-blocked" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={handlePurchaseClick}
                      aria-disabled={purchaseHardBlocked}
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

        {owned && onSell ? (
          <footer className="profile-card-footer profile-card-footer-secondary" aria-label="Transfer">
            <div className="profile-actions profile-actions-single">
              <div className="profile-action-cell">
                <Hint
                  text={
                    saleBlockedReason ??
                    (!transferWindowOpen
                      ? t("transfer.profile.saleWindowOnly", { hint: transferWindowHint() })
                      : t("transfer.profile.saleHint"))
                  }
                  block
                >
                  <ProfileActionButton
                    label={t("transfer.profile.sell")}
                    amount={saleOffer ? `ca. ${formatMoney(saleOffer)}` : undefined}
                    className={[
                      "ui-btn--ghost",
                      !transferWindowOpen || saleBlockedReason ? "is-blocked" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={handleSaleClick}
                    aria-disabled={!transferWindowOpen || Boolean(saleBlockedReason)}
                  />
                </Hint>
              </div>
            </div>
          </footer>
        ) : null}
      </article>

      {onOpenYouth ? (
        <button type="button" className="profile-next" onClick={onOpenYouth}>
          → Zur Jahrgangsliste
        </button>
      ) : null}

      {blindBuyOpen ? (
        <BlindPurchaseWarningModal
          player={player}
          onCancel={() => setBlindBuyOpen(false)}
          onConfirm={() => {
            setBlindBuyOpen(false);
            onPurchase?.();
          }}
        />
      ) : null}

      {saleConfirmOpen && saleOffer !== undefined && onSell ? (
        <SaleConfirmModal
          player={player}
          offerEstimate={saleOffer}
          onCancel={() => setSaleConfirmOpen(false)}
          onConfirm={() => {
            setSaleConfirmOpen(false);
            onSell();
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
            <span key={flag} title={flag}>💡</span>
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
        return (
          <text
            key={bar.key}
            className="profile-hex-label"
            x={labelAt.x}
            y={labelAt.y}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {attributeLabel(bar.key)}
          </text>
        );
      })}
    </svg>
  );
}

function FullSkillSheet({
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
    <div className="profile-sheet" aria-label="Alle Skills">
      {groups.map((group) => (
        <div key={group.id} className="profile-sheet-group">
          <p className="profile-section-label">{group.label}</p>
          {group.bars.map((bar) => {
            const cap = bar.key === "weak_foot" ? 100 : 199;
            const gate = stampGateTitle(bar.key, markers);
            return (
              <div
                key={bar.key}
                className={bar.dimmed ? "profile-bar-row is-footnote is-dimmed" : "profile-bar-row is-footnote"}
                title={gate}
              >
                <span className="profile-bar-label">
                  {attributeLabel(bar.key)}
                  {gate ? (
                    <span className="profile-gate-mark" aria-label={gate}>
                      ⚑
                    </span>
                  ) : null}
                </span>
                <div className="profile-bar-track">
                  {bar.showCi && bar.low !== undefined && bar.high !== undefined ? (
                    <span
                      className="profile-bar-ci"
                      style={{ left: `${(bar.low / cap) * 100}%`, width: `${((bar.high - bar.low) / cap) * 100}%` }}
                    />
                  ) : null}
                  <span className="profile-bar-fill" style={{ width: `${(bar.value / cap) * 100}%` }} />
                </div>
                <span className="profile-bar-value">{bar.showValue ? bar.value : "?"}</span>
              </div>
            );
          })}
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
