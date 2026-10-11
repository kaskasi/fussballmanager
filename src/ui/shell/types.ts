/** Shell navigation and header contract (extracted from App). */

import type { NavPrimaryAction } from "../nav-primary-action.ts";

export type Screen =
  | "hub"
  | "training"
  | "campus"
  | "matchday"
  | "scouting"
  | "transfers"
  | "squad"
  | "medical"
  | "finances"
  | "merchandising"
  | "stadium"
  | "leagues"
  | "help"
  | "club-events"
  | "calendar"
  | "postfach";

export const SCREEN_DOCUMENT_TITLE_KEYS: Record<Screen, string> = {
  hub: "shell.nav.pipeline",
  training: "shell.nav.training",
  campus: "shell.nav.campus",
  matchday: "shell.menu.matchdaySandbox",
  scouting: "shell.nav.scouting",
  transfers: "shell.nav.transfers",
  squad: "shell.nav.squad",
  medical: "shell.nav.medical",
  finances: "shell.nav.finances",
  merchandising: "shell.nav.merchandising",
  stadium: "shell.nav.stadium",
  leagues: "shell.nav.leagues",
  help: "shell.nav.help",
  "club-events": "shell.nav.clubEvents",
  calendar: "shell.nav.calendar",
  postfach: "shell.nav.postfach",
};

export interface HubNavActions {
  week: number;
  weekday: number;
  simulating: boolean;
  openDecisionCount: number;
  /** Terra badge on header NEXT (hub: hub-blockers count; else postfach open count). */
  nextHeaderBadgeCount: number;
  nextHeaderBadgeAria?: string;
  onNext: () => void;
  onHeaderPrimaryClick?: () => void;
  onNewGame: () => void;
  onOpenSaves: () => void;
  /** When true, header NEXT must never fall back to smart-skip (match lineup / live). */
  matchFlowActive?: boolean;
  primaryAction?: NavPrimaryAction | null;
  matchSkipToReport?: (() => void) | null;
  nextHeaderTitle?: string;
  nextHeaderButtonLabel?: string;
  nextHeaderButtonTitle?: string;
}
