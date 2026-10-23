/** WIREFRAME: design.md — club shell header nav + TEAM menu + NEXT. */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, HeartPulse, Package, TriangleAlert } from "lucide-react";
import { needsTrainingPlanForToday } from "../../development/training-plan-state.ts";
import type { TrainingSlot } from "../../development/training-units.ts";
import { hasMerchStockout } from "../../economy/merchandising.ts";
import { weeksOfWages } from "../../economy/spend-runway.ts";
import {
  filterTeamNavScreens,
  isNavScreenVisible,
  suppressTrainingPlanWarning,
} from "../../narrative/career-presentation.ts";
import type { StoryState } from "../../narrative/story-state.ts";
import type { ClubStadium } from "../../stadium/club-stadium.ts";
import type { AccessibilityPreferences } from "../accessibility.ts";
import { CashChip } from "../components/CashChip.tsx";
import { ClubCrest } from "../components/ClubCrest.tsx";
import { useT } from "../../i18n/react.ts";
import { COACH_TARGET } from "../../tutorial/index.ts";
import { titleBarColors, type KitColors } from "./title-bar-colors.ts";
import type { HubNavActions, Screen } from "./types.ts";

export function AppNav({
  screen,
  week,
  weekday,
  trainingPlan,
  storyState,
  stadium,
  clubName,
  clubInitials,
  clubLogoSrc,
  clubKit,
  leaguePlace: _leaguePlace,
  onNavigate,
  headerBack,
  onCloseProfile,
  onCampusNavigate,
  hubActions,
  accessibility,
  onAccessibilityChange,
  shellChrome = "card",
  medicalAttentionCount = 0,
  cash = 0,
  boardCashFloor = 0,
  weeklyWageBill = 0,
}: {
  screen: Screen;
  week: number;
  weekday: number;
  trainingPlan: TrainingSlot[];
  storyState: StoryState;
  stadium: ClubStadium;
  medicalAttentionCount?: number;
  cash?: number;
  boardCashFloor?: number;
  weeklyWageBill?: number;
  clubName: string;
  clubInitials: string;
  clubLogoSrc?: string;
  clubKit?: KitColors;
  leaguePlace: number | null;
  onNavigate: (screen: Screen) => void;
  headerBack?: { title: string; onBack: () => void; iconOnly?: boolean } | null;
  onCloseProfile?: () => void;
  onCampusNavigate?: () => void;
  hubActions: HubNavActions;
  accessibility: AccessibilityPreferences;
  onAccessibilityChange: (preferences: AccessibilityPreferences) => void;
  shellChrome?: "card" | "plain";
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [resetAsk, setResetAsk] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const tr = useT();
  const showTrainingPlanWarn =
    !suppressTrainingPlanWarning(storyState) &&
    needsTrainingPlanForToday(trainingPlan, weekday);
  const financesVisible = isNavScreenVisible("finances", storyState);
  const showMerchStockoutWarn =
    isNavScreenVisible("merchandising", storyState) && hasMerchStockout(stadium);
  const showMedicalWarn = medicalAttentionCount > 0;
  const runwayWeeks = weeksOfWages(cash, weeklyWageBill);
  const showCashWarn =
    financesVisible &&
    ((boardCashFloor > 0 && cash < boardCashFloor) ||
    (weeklyWageBill > 0 && runwayWeeks != null && runwayWeeks < 4));
  const cashChipWarn =
    boardCashFloor > 0 && cash < boardCashFloor
      ? true
      : weeklyWageBill > 0 && runwayWeeks != null && runwayWeeks < 4;
  const hasStatusAlerts =
    showTrainingPlanWarn || showMerchStockoutWarn || showMedicalWarn || showCashWarn;
  const titleBar = useMemo(() => titleBarColors(clubKit), [clubKit]);
  const titleBarStyle = useMemo(
    () => ({ "--club": titleBar.club, "--on-club": titleBar.onClub }) as CSSProperties,
    [titleBar],
  );

  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    meta?.setAttribute("content", titleBar.club);
  }, [titleBar.club]);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
        setResetAsk(false);
      }
    }
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, [menuOpen]);

  const teamMenu = filterTeamNavScreens(
    [
      { screen: "hub" as const, labelKey: "shell.nav.pipeline" },
      { screen: "postfach" as const, labelKey: "shell.nav.postfach" },
      { screen: "squad" as const, labelKey: "shell.nav.squad" },
      { screen: "training" as const, labelKey: "shell.nav.training" },
      { screen: "medical" as const, labelKey: "shell.nav.medical" },
      { screen: "campus" as const, labelKey: "shell.nav.campus" },
      { screen: "scouting" as const, labelKey: "shell.nav.scouting" },
      { screen: "transfers" as const, labelKey: "shell.nav.transfers" },
      { screen: "calendar" as const, labelKey: "shell.nav.calendar" },
      { screen: "leagues" as const, labelKey: "shell.nav.leagues" },
      { screen: "finances" as const, labelKey: "shell.nav.finances" },
      { screen: "merchandising" as const, labelKey: "shell.nav.merchandising" },
      { screen: "stadium" as const, labelKey: "shell.nav.stadium" },
      { screen: "help" as const, labelKey: "shell.nav.help" },
    ],
    storyState,
  );

  return (
    <nav
      className={`app-nav club-shell-header ${shellChrome === "card" ? "club-shell-card-head" : "club-shell-grid"}`}
      style={titleBarStyle}
      aria-label={tr("shell.nav.areas")}
    >
      <div
        className={`club-shell-identity${headerBack ? " has-header-back" : ""}${headerBack?.iconOnly ? " is-icon-only-back" : ""}`}
      >
        {headerBack ? (
          <>
            <button
              type="button"
              className="club-shell-header-back"
              onClick={headerBack.onBack}
              aria-label={tr("shell.menu.back")}
            >
              <ArrowLeft size={22} strokeWidth={2.5} aria-hidden="true" />
            </button>
            {!headerBack.iconOnly ? (
              <div className="club-shell-identity-text">
                <p className="club-shell-name club-shell-subscreen-title">{headerBack.title}</p>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <ClubCrest initials={clubInitials} logoSrc={clubLogoSrc} alt={clubName} />
            <div className="club-shell-identity-text">
              <p className="club-shell-name">{clubName}</p>
            </div>
          </>
        )}
      </div>
      <div className="app-nav-center" aria-live="polite">
        {hasStatusAlerts ? (
          <div className="app-nav-status-wrap">
            {showTrainingPlanWarn ? (
              <button
                type="button"
                className="app-nav-training-warn"
                onClick={() => onNavigate("training")}
                aria-label={tr("shell.training.todayMissing")}
                title={tr("shell.training.todayMissing")}
              >
                <TriangleAlert size={18} strokeWidth={2.35} aria-hidden />
              </button>
            ) : null}
            {showMerchStockoutWarn ? (
              <button
                type="button"
                className="app-nav-training-warn"
                onClick={() => onNavigate("merchandising")}
                aria-label={tr("shell.merch.stockout")}
                title={tr("shell.merch.stockout")}
              >
                <Package size={18} strokeWidth={2.35} aria-hidden />
              </button>
            ) : null}
            {showMedicalWarn ? (
              <button
                type="button"
                className="app-nav-training-warn"
                onClick={() => onNavigate("medical")}
                aria-label={tr("shell.medical.attention")}
                title={tr("shell.medical.attention")}
              >
                <HeartPulse size={18} strokeWidth={2.35} aria-hidden />
              </button>
            ) : null}
            {showCashWarn ? (
              <button
                type="button"
                className="app-nav-training-warn"
                onClick={() => onNavigate("finances")}
                aria-label={tr("shell.cash.warn")}
                title={tr("shell.cash.warn")}
              >
                <TriangleAlert size={18} strokeWidth={2.35} aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="app-nav-actions">
        <div className="app-nav-trailing-cluster">
          <CashChip
            cash={cash}
            compact
            warn={cashChipWarn}
            onClick={financesVisible ? () => onNavigate("finances") : undefined}
          />
          <div className="row-menu app-nav-menu" ref={menuRef}>
            <button
              type="button"
              className="row-menu-trigger app-nav-menu-trigger"
              data-coach-target={hubActions.matchSkipToReport ? COACH_TARGET.matchSkipMenu : undefined}
              aria-label={tr("shell.menu.moreActions")}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => {
                setMenuOpen((open) => !open);
                if (menuOpen) {
                  setResetAsk(false);
                }
              }}
            >
              <span className="app-nav-menu-link">Menu</span>
            </button>
            {menuOpen ? (
              <div className="row-menu-popover pipeline-menu-popover" role="menu">
                {resetAsk ? (
                  <>
                    <p className="pipeline-menu-note">{tr("shell.menu.newGameConfirm")}</p>
                    <button
                      type="button"
                      role="menuitem"
                      className="row-menu-item pipeline-menu-danger"
                      onClick={() => {
                        hubActions.onNewGame();
                        setResetAsk(false);
                        setMenuOpen(false);
                      }}
                    >
                      {tr("shell.menu.newGameYes")}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="row-menu-item"
                      onClick={() => setResetAsk(false)}
                    >
                      {tr("shell.menu.cancel")}
                    </button>
                  </>
                ) : (
                  <>
                    {hubActions.matchSkipToReport ? (
                      <>
                        <p className="pipeline-menu-section-title">{tr("shell.menu.match")}</p>
                        <button
                          type="button"
                          role="menuitem"
                          className="row-menu-item"
                          title={tr("shell.match.skipToReportHint")}
                          onClick={() => {
                            hubActions.matchSkipToReport?.();
                            setMenuOpen(false);
                          }}
                        >
                          {tr("shell.match.skipToReport")}
                        </button>
                      </>
                    ) : null}
                    <p className="pipeline-menu-section-title">TEAM</p>
                    {teamMenu.map((item) => (
                      <button
                        key={item.screen}
                        type="button"
                        role="menuitem"
                        className={`row-menu-item pipeline-menu-item${screen === item.screen ? " is-active" : ""}`}
                        onClick={() => {
                          onCloseProfile?.();
                          if (item.screen === "campus") {
                            onCampusNavigate?.();
                          }
                          onNavigate(item.screen);
                          setMenuOpen(false);
                        }}
                      >
                        <span className="pipeline-menu-item-label">{tr(item.labelKey)}</span>
                        {item.screen === "postfach" && hubActions.openDecisionCount > 0 ? (
                          <span className="pipeline-menu-badge" aria-label={tr("hub.inbox.decisions")}>
                            {hubActions.openDecisionCount}
                          </span>
                        ) : null}
                      </button>
                    ))}
                    <p className="pipeline-menu-section-title">{tr("shell.menu.options")}</p>
                    <button
                      type="button"
                      role="menuitem"
                      className="row-menu-item"
                      onClick={() => {
                        onCloseProfile?.();
                        onNavigate("settings");
                        setMenuOpen(false);
                      }}
                    >
                      {tr("shell.nav.settings")}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="row-menu-item pipeline-menu-danger"
                      onClick={() => setResetAsk(true)}
                    >
                      {tr("shell.menu.resetGame")}
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="app-nav-next"
            data-coach-target={COACH_TARGET.headerNext}
            onClick={() => {
              if (hubActions.onHeaderPrimaryClick) {
                hubActions.onHeaderPrimaryClick();
                return;
              }
              hubActions.primaryAction?.onClick?.() ?? hubActions.onNext();
            }}
            disabled={
              hubActions.matchFlowActive
                ? (hubActions.primaryAction?.disabled ?? !hubActions.primaryAction?.onClick)
                : (hubActions.primaryAction?.disabled ?? hubActions.simulating)
            }
            title={
              hubActions.primaryAction?.title ??
              hubActions.nextHeaderButtonTitle ??
              (hubActions.primaryAction
                ? hubActions.primaryAction.label
                : (hubActions.nextHeaderTitle ?? tr("shell.smartSkip")))
            }
          >
            <span className="app-nav-next-mobile">
              {hubActions.simulating && !hubActions.primaryAction
                ? "…"
                : (hubActions.primaryAction?.label ??
                  hubActions.nextHeaderButtonLabel ??
                  tr("shell.next"))}
            </span>
            <span className="app-nav-next-desktop">
              {hubActions.simulating && !hubActions.primaryAction
                ? "…"
                : (hubActions.primaryAction?.label ??
                  hubActions.nextHeaderButtonLabel ??
                  tr("shell.next"))}
              {hubActions.nextHeaderBadgeCount > 0 && !hubActions.primaryAction ? (
                <span
                  className="app-nav-next-badge"
                  aria-label={hubActions.nextHeaderBadgeAria ?? tr("hub.inbox.decisions")}
                >
                  {hubActions.nextHeaderBadgeCount}
                </span>
              ) : null}
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
