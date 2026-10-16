import type { GameSession } from "../persistence/game-session.ts";
import { KICKER_DELIVERY_WEEKDAY, hasOpenKickerItem } from "../inbox/kicker-inbox.ts";
import { prepareCareerMatch } from "../sim/career-match-setup.ts";
import { pendingInboxItems } from "../youth/decision-inbox.ts";
import { resolveFeatureCurtain } from "../narrative/career-presentation.ts";
import {
  campusTutorialEligible,
  phase2Eligible,
  phase3ScoutingEligible,
  phase4ScreenEligible,
} from "./tutorial-phase-gates.ts";
import { isStepCompleted } from "./tutorial-progress.ts";
import { COACH_TARGET } from "./tutorial-targets.ts";
import type { TutorialStepDefinition } from "./tutorial-types.ts";
import {
  TUTORIAL_CAMPUS_TABS,
  TUTORIAL_FINANCES_TABS,
  TUTORIAL_MEDICAL_TABS,
  TUTORIAL_MERCH_TABS,
  TUTORIAL_SCOUTING_TABS,
  TUTORIAL_SQUAD_TABS,
  TUTORIAL_STADIUM_TABS,
} from "./tutorial-steps-tabs.ts";

function hasPendingInbox(session: GameSession): boolean {
  return pendingInboxItems(session.youthInbox, session.players).length > 0;
}

function hasYouthPromoteInbox(session: GameSession): boolean {
  return pendingInboxItems(session.youthInbox, session.players).some(
    (item) => item.kind === "promotion" || item.kind === "departure_risk",
  );
}

export const TUTORIAL_STEPS_PHASES_2_4: readonly TutorialStepDefinition[] = [
  // —— Phase 2: postfach + match + hub ——
  {
    id: "postfach.inbox_queue",
    screen: "postfach",
    alsoOnScreens: ["hub"],
    mode: "spotlight",
    titleKey: "tutorial.postfach.inboxQueue.title",
    bodyKey: "tutorial.postfach.inboxQueue.body",
    target: COACH_TARGET.postfachQueue,
    targetByScreen: { hub: COACH_TARGET.hubPostfach },
    completeOnTargetClick: true,
    when: (session) => phase2Eligible(session) && hasPendingInbox(session),
  },
  {
    id: "postfach.resolve_decision",
    screen: "postfach",
    mode: "spotlight",
    titleKey: "tutorial.postfach.resolveDecision.title",
    bodyKey: "tutorial.postfach.resolveDecision.body",
    target: COACH_TARGET.postfachInboxActions,
    when: (session) =>
      phase2Eligible(session) &&
      isStepCompleted(session.storyState, "postfach.inbox_queue") &&
      hasPendingInbox(session),
  },
  {
    id: "postfach.treter_thursday",
    screen: "postfach",
    mode: "spotlight",
    titleKey: "tutorial.postfach.treterThursday.title",
    bodyKey: "tutorial.postfach.treterThursday.body",
    target: COACH_TARGET.postfachTreter,
    when: (session) =>
      phase2Eligible(session) &&
      isStepCompleted(session.storyState, "postfach.resolve_decision") &&
      session.weekday >= KICKER_DELIVERY_WEEKDAY &&
      hasOpenKickerItem(session.youthInbox, session.season, session.week),
  },
  {
    id: "matchday.lineup_next",
    screen: "matchday",
    mode: "spotlight",
    titleKey: "tutorial.matchday.lineupNext.title",
    bodyKey: "tutorial.matchday.lineupNext.body",
    target: COACH_TARGET.headerNext,
    completeOnTargetClick: true,
    when: (session) => phase2Eligible(session) && prepareCareerMatch(session) != null,
  },
  {
    id: "matchday.skip_menu",
    screen: "matchday",
    mode: "spotlight",
    titleKey: "tutorial.matchday.skipMenu.title",
    bodyKey: "tutorial.matchday.skipMenu.body",
    target: COACH_TARGET.matchSkipMenu,
    when: (session) =>
      phase2Eligible(session) && isStepCompleted(session.storyState, "matchday.lineup_next"),
  },
  {
    id: "hub.scout_match_week",
    screen: "hub",
    mode: "spotlight",
    titleKey: "tutorial.hub.scoutMatchWeek.title",
    bodyKey: "tutorial.hub.scoutMatchWeek.body",
    target: COACH_TARGET.hubOpponentScout,
    completeOnTargetClick: true,
    when: (session) => {
      if (!phase2Eligible(session)) return false;
      if (prepareCareerMatch(session) == null) return false;
      return resolveFeatureCurtain(session.storyState).opponent_scout_module;
    },
  },
  {
    id: "hub.duty_blockers",
    screen: "hub",
    mode: "spotlight",
    titleKey: "tutorial.hub.dutyBlockers.title",
    bodyKey: "tutorial.hub.dutyBlockers.body",
    target: COACH_TARGET.hubScoutingTransfer,
    when: (session) =>
      phase2Eligible(session) &&
      (session.transferState.sale_listings?.length ?? 0) > 0,
  },

  // —— Phase 3: scouting, squad, campus ——
  TUTORIAL_SCOUTING_TABS,
  {
    id: "scouting.map_trip",
    screen: "scouting",
    mode: "spotlight",
    titleKey: "tutorial.scouting.mapTrip.title",
    bodyKey: "tutorial.scouting.mapTrip.body",
    target: COACH_TARGET.scoutingMap,
    when: (session) =>
      phase3ScoutingEligible(session) &&
      isStepCompleted(session.storyState, "scouting.tabs"),
  },
  {
    id: "scouting.pool_confidence",
    screen: "scouting",
    mode: "spotlight",
    titleKey: "tutorial.scouting.poolConfidence.title",
    bodyKey: "tutorial.scouting.poolConfidence.body",
    target: COACH_TARGET.scoutingPool,
    when: (session) =>
      phase3ScoutingEligible(session) &&
      isStepCompleted(session.storyState, "scouting.map_trip"),
  },
  {
    id: "scouting.opponent_report",
    screen: "scouting",
    mode: "spotlight",
    titleKey: "tutorial.scouting.opponentReport.title",
    bodyKey: "tutorial.scouting.opponentReport.body",
    target: COACH_TARGET.scoutingOpponentReport,
    when: (session) =>
      phase3ScoutingEligible(session) &&
      isStepCompleted(session.storyState, "scouting.pool_confidence"),
  },
  TUTORIAL_SQUAD_TABS,
  {
    id: "squad.open_profile",
    screen: "squad",
    mode: "spotlight",
    titleKey: "tutorial.squad.openProfile.title",
    bodyKey: "tutorial.squad.openProfile.body",
    target: COACH_TARGET.squadFirstRow,
    completeOnTargetClick: true,
    when: (session) =>
      phase2Eligible(session) &&
      isStepCompleted(session.storyState, "scouting.pool_confidence") &&
      isStepCompleted(session.storyState, "squad.tabs"),
  },
  TUTORIAL_CAMPUS_TABS,
  {
    id: "campus.auto_youth",
    screen: "campus",
    mode: "spotlight",
    titleKey: "tutorial.campus.autoYouth.title",
    bodyKey: "tutorial.campus.autoYouth.body",
    target: COACH_TARGET.campusOverview,
    when: (session) =>
      campusTutorialEligible(session) &&
      isStepCompleted(session.storyState, "campus.tabs"),
  },
  {
    id: "campus.inbox_promote",
    screen: "campus",
    alsoOnScreens: ["postfach"],
    mode: "spotlight",
    titleKey: "tutorial.campus.inboxPromote.title",
    bodyKey: "tutorial.campus.inboxPromote.body",
    target: COACH_TARGET.campusYouthInbox,
    targetByScreen: { postfach: COACH_TARGET.postfachInboxActions },
    when: (session) =>
      campusTutorialEligible(session) &&
      isStepCompleted(session.storyState, "campus.auto_youth") &&
      hasYouthPromoteInbox(session),
  },

  // —— Phase 4: club systems (curtain-aware) ——
  TUTORIAL_FINANCES_TABS,
  {
    id: "finances.cashflow_split",
    screen: "finances",
    mode: "panel",
    titleKey: "tutorial.finances.cashflowSplit.title",
    bodyKey: "tutorial.finances.cashflowSplit.body",
    target: COACH_TARGET.financesCashflow,
    when: (session) =>
      phase4ScreenEligible(session, "finances") &&
      isStepCompleted(session.storyState, "finances.tabs"),
  },
  TUTORIAL_STADIUM_TABS,
  {
    id: "stadium.precinct_not_3d",
    screen: "stadium",
    mode: "spotlight",
    titleKey: "tutorial.stadium.precinctNot3d.title",
    bodyKey: "tutorial.stadium.precinctNot3d.body",
    target: COACH_TARGET.stadiumPrecinct,
    when: (session) =>
      phase4ScreenEligible(session, "stadium") &&
      isStepCompleted(session.storyState, "stadium.tabs"),
  },
  TUTORIAL_MERCH_TABS,
  {
    id: "merch.matchday_orders",
    screen: "merchandising",
    mode: "spotlight",
    titleKey: "tutorial.merch.matchdayOrders.title",
    bodyKey: "tutorial.merch.matchdayOrders.body",
    target: COACH_TARGET.merchOrders,
    when: (session) =>
      phase4ScreenEligible(session, "merchandising") &&
      isStepCompleted(session.storyState, "merch.tabs"),
  },
  {
    id: "transfers.market_basics",
    screen: "transfers",
    mode: "spotlight",
    titleKey: "tutorial.transfers.marketBasics.title",
    bodyKey: "tutorial.transfers.marketBasics.body",
    target: COACH_TARGET.transfersMarket,
    when: (session) =>
      phase4ScreenEligible(session, "transfers") &&
      resolveFeatureCurtain(session.storyState).transfers_nav,
  },
  TUTORIAL_MEDICAL_TABS,
  {
    id: "medical.fitness_risk",
    screen: "medical",
    mode: "spotlight",
    titleKey: "tutorial.medical.fitnessRisk.title",
    bodyKey: "tutorial.medical.fitnessRisk.body",
    target: COACH_TARGET.medicalFitness,
    when: (session) =>
      phase4ScreenEligible(session, "medical") &&
      isStepCompleted(session.storyState, "medical.tabs"),
  },
  {
    id: "leagues.table_context",
    screen: "leagues",
    mode: "spotlight",
    titleKey: "tutorial.leagues.tableContext.title",
    bodyKey: "tutorial.leagues.tableContext.body",
    target: COACH_TARGET.leaguesTable,
    when: (session) => phase4ScreenEligible(session, "leagues"),
  },
  {
    id: "settings.save_export",
    screen: "settings",
    mode: "spotlight",
    titleKey: "tutorial.settings.saveExport.title",
    bodyKey: "tutorial.settings.saveExport.body",
    target: COACH_TARGET.settingsSaveExport,
    when: (session) => phase4ScreenEligible(session, "settings"),
  },
  {
    id: "calendar.milestones",
    screen: "calendar",
    mode: "spotlight",
    titleKey: "tutorial.calendar.milestones.title",
    bodyKey: "tutorial.calendar.milestones.body",
    target: COACH_TARGET.calendarMilestones,
    when: (session) => phase4ScreenEligible(session, "calendar"),
  },
  {
    id: "help.reset_tips",
    screen: "help",
    mode: "spotlight",
    titleKey: "tutorial.help.resetTips.title",
    bodyKey: "tutorial.help.resetTips.body",
    target: COACH_TARGET.helpResetTips,
    when: (session) => phase4ScreenEligible(session, "help"),
  },
];
