import {
  campusTutorialEligible,
  phase2Eligible,
  phase3ScoutingEligible,
  phase4ScreenEligible,
} from "./tutorial-phase-gates.ts";
import { isStepCompleted } from "./tutorial-progress.ts";
import { COACH_TARGET } from "./tutorial-targets.ts";
import type { TutorialStepDefinition } from "./tutorial-types.ts";

/** Tab-bar overview before spotlight steps on the same screen. */
export const TUTORIAL_FINANCES_TABS: TutorialStepDefinition = {
  id: "finances.tabs",
  screen: "finances",
  mode: "spotlight",
  titleKey: "tutorial.finances.tabs.title",
  bodyKey: "tutorial.finances.tabs.body",
  target: COACH_TARGET.financesTabs,
  when: (session) => phase4ScreenEligible(session, "finances"),
};

export const TUTORIAL_SCOUTING_TABS: TutorialStepDefinition = {
  id: "scouting.tabs",
  screen: "scouting",
  mode: "spotlight",
  titleKey: "tutorial.scouting.tabs.title",
  bodyKey: "tutorial.scouting.tabs.body",
  target: COACH_TARGET.scoutingTabs,
  when: (session) => phase3ScoutingEligible(session),
};

export const TUTORIAL_MEDICAL_TABS: TutorialStepDefinition = {
  id: "medical.tabs",
  screen: "medical",
  mode: "spotlight",
  titleKey: "tutorial.medical.tabs.title",
  bodyKey: "tutorial.medical.tabs.body",
  target: COACH_TARGET.medicalTabs,
  when: (session) => phase4ScreenEligible(session, "medical"),
};

export const TUTORIAL_STADIUM_TABS: TutorialStepDefinition = {
  id: "stadium.tabs",
  screen: "stadium",
  mode: "spotlight",
  titleKey: "tutorial.stadium.tabs.title",
  bodyKey: "tutorial.stadium.tabs.body",
  target: COACH_TARGET.stadiumTabs,
  when: (session) => phase4ScreenEligible(session, "stadium"),
};

export const TUTORIAL_MERCH_TABS: TutorialStepDefinition = {
  id: "merch.tabs",
  screen: "merchandising",
  mode: "spotlight",
  titleKey: "tutorial.merch.tabs.title",
  bodyKey: "tutorial.merch.tabs.body",
  target: COACH_TARGET.merchTabs,
  when: (session) => phase4ScreenEligible(session, "merchandising"),
};

export const TUTORIAL_SQUAD_TABS: TutorialStepDefinition = {
  id: "squad.tabs",
  screen: "squad",
  mode: "spotlight",
  titleKey: "tutorial.squad.tabs.title",
  bodyKey: "tutorial.squad.tabs.body",
  target: COACH_TARGET.squadTabs,
  when: (session) =>
    phase2Eligible(session) && isStepCompleted(session.storyState, "scouting.pool_confidence"),
};

export const TUTORIAL_CAMPUS_TABS: TutorialStepDefinition = {
  id: "campus.tabs",
  screen: "campus",
  mode: "spotlight",
  titleKey: "tutorial.campus.tabs.title",
  bodyKey: "tutorial.campus.tabs.body",
  target: COACH_TARGET.campusTabs,
  when: (session) => campusTutorialEligible(session),
};

export const TUTORIAL_TRAINING_INDIVIDUAL_TAB: TutorialStepDefinition = {
  id: "training.individual_tab",
  screen: "training",
  mode: "spotlight",
  titleKey: "tutorial.training.individualTab.title",
  bodyKey: "tutorial.training.individualTab.body",
  target: COACH_TARGET.trainingTabs,
  when: (session) =>
    phase2Eligible(session) && isStepCompleted(session.storyState, "hub.top_development"),
};
