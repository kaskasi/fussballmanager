/** WIREFRAME: design.md — club shell header wrapper. */

import type { TrainingSlot } from "../../development/training-units.ts";
import type { StoryState } from "../../narrative/story-state.ts";
import type { ClubStadium } from "../../stadium/club-stadium.ts";
import type { AccessibilityPreferences } from "../accessibility.ts";
import { AppNav } from "./AppNav.tsx";
import type { KitColors } from "./title-bar-colors.ts";
import type { HubNavActions, Screen } from "./types.ts";
import { useClubAccent } from "./useClubAccent.ts";

export function AppChrome({
  week,
  weekday,
  trainingPlan,
  storyState,
  stadium,
  clubName,
  clubInitials,
  clubLogoSrc,
  clubKit,
  leaguePlace,
  screen,
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
  /** Managed club's kit; paints the title bar (design.md §2.4) and tints --accent (§2.5). */
  clubKit?: KitColors;
  leaguePlace: number | null;
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  headerBack?: { title: string; onBack: () => void; iconOnly?: boolean } | null;
  onCloseProfile?: () => void;
  onCampusNavigate?: () => void;
  hubActions: HubNavActions;
  accessibility: AccessibilityPreferences;
  onAccessibilityChange: (preferences: AccessibilityPreferences) => void;
  shellChrome?: "card" | "plain";
}) {
  useClubAccent(clubKit);
  return (
    <AppNav
      screen={screen}
      stadium={stadium}
      weekday={weekday}
      trainingPlan={trainingPlan}
      storyState={storyState}
      clubName={clubName}
      clubInitials={clubInitials}
      clubLogoSrc={clubLogoSrc}
      clubKit={clubKit}
      leaguePlace={leaguePlace}
      onNavigate={onNavigate}
      headerBack={headerBack}
      onCloseProfile={onCloseProfile}
      onCampusNavigate={onCampusNavigate}
      hubActions={hubActions}
      accessibility={accessibility}
      onAccessibilityChange={onAccessibilityChange}
      shellChrome={shellChrome}
      week={week}
      medicalAttentionCount={medicalAttentionCount}
      cash={cash}
      boardCashFloor={boardCashFloor}
      weeklyWageBill={weeklyWageBill}
    />
  );
}
