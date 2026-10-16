/** WIREFRAME: design.md — full-screen career matchday (header + CareerMatch). */

import type { ComponentProps, ReactNode } from "react";
import { boardCashFloor } from "../../economy/spend-runway.ts";
import { weeklyWageBill } from "../../economy/club-finances.ts";
import { matchdayCashBreakdown } from "../../stadium/matchday-commerce.ts";
import { matchdayCapacity } from "../../stadium/club-stadium.ts";
import { CareerMatch } from "../../match/CareerMatch.tsx";
import type { CareerMatchSetup } from "../../sim/career-match-setup.ts";
import type { BroadcastStoryContext } from "@fussballmanager/shared";
import type { FanbaseMood } from "../../stadium/fanbase.ts";
import type { GameSession } from "../../persistence/game-session.ts";
import type { Player } from "../../types/player.ts";
import type { AccessibilityPreferences } from "../accessibility.ts";
import type { NavPrimaryAction } from "../nav-primary-action.ts";
import type { HubNavActions } from "./types.ts";
import { AppChrome } from "./AppChrome.tsx";

export function CareerMatchLiveShell({
  setup,
  session,
  players,
  rivalPlayers,
  shellClub,
  navActions,
  accessibility,
  onAccessibilityChange,
  onNavigate,
  medicalAttentionCount,
  simulating,
  onSaveTacticsPreset,
  onSaveMatchLineup,
  onComplete,
  onSkip,
  onNavActionChange,
  onSelectMatchPlayer,
  onRegisterSkipToReport,
  broadcastStory,
  fanbaseMood,
  poorForm,
  onOpenOpponentScoutReport,
  onLineupPhaseChange,
  overlays,
}: {
  setup: CareerMatchSetup;
  session: GameSession;
  players: readonly Player[];
  rivalPlayers: readonly Player[];
  shellClub: {
    name: string;
    initials: string;
    logoSrc?: string;
    leaguePlace: number | null;
  };
  navActions: HubNavActions;
  accessibility: AccessibilityPreferences;
  onAccessibilityChange: (preferences: AccessibilityPreferences) => void;
  onNavigate: (screen: import("./types.ts").Screen) => void;
  medicalAttentionCount: number;
  simulating: boolean;
  onSaveTacticsPreset: ComponentProps<typeof CareerMatch>["onSaveTacticsPreset"];
  onSaveMatchLineup: ComponentProps<typeof CareerMatch>["onSaveMatchLineup"];
  onComplete: ComponentProps<typeof CareerMatch>["onComplete"];
  onSkip: ComponentProps<typeof CareerMatch>["onSkip"];
  onNavActionChange: (action: NavPrimaryAction | null) => void;
  onSelectMatchPlayer: (playerId: string) => void;
  onRegisterSkipToReport: (handler: (() => void) | null) => void;
  broadcastStory?: BroadcastStoryContext;
  fanbaseMood: FanbaseMood;
  poorForm: boolean;
  onOpenOpponentScoutReport: (itemId: string) => void;
  onLineupPhaseChange: (inLineup: boolean) => void;
  overlays: ReactNode;
}) {
  const { week, weekday, trainingPlan, storyState, stadium, finances, board, tacticsPresets, matchLineup, masterSeed, league, world, scoutBoard, season } =
    session;

  return (
    <>
      <AppChrome
        screen="hub"
        week={week}
        weekday={weekday}
        trainingPlan={trainingPlan}
        storyState={storyState}
        stadium={stadium}
        clubName={shellClub.name}
        clubInitials={shellClub.initials}
        clubLogoSrc={shellClub.logoSrc}
        leaguePlace={shellClub.leaguePlace}
        onNavigate={onNavigate}
        onCampusNavigate={() => undefined}
        hubActions={navActions}
        accessibility={accessibility}
        onAccessibilityChange={onAccessibilityChange}
        shellChrome="plain"
        medicalAttentionCount={medicalAttentionCount}
        cash={finances.cash}
        boardCashFloor={boardCashFloor(board)}
        weeklyWageBill={weeklyWageBill(players, session.clubId)}
      />
      <CareerMatch
        setup={setup}
        players={players}
        week={week}
        weekday={weekday}
        tacticsPresets={tacticsPresets}
        matchLineup={matchLineup}
        rivalPlayers={rivalPlayers}
        onSaveTacticsPreset={onSaveTacticsPreset}
        onSaveMatchLineup={onSaveMatchLineup}
        simulating={simulating}
        onComplete={onComplete}
        onSkip={onSkip}
        onNavActionChange={onNavActionChange}
        onSelectMatchPlayer={onSelectMatchPlayer}
        onRegisterSkipToReport={onRegisterSkipToReport}
        broadcastStory={broadcastStory}
        kasse={matchdayCashBreakdown(stadium, setup.isHome)}
        homeStadiumCapacity={matchdayCapacity(stadium, season, week)}
        fanbaseMood={fanbaseMood}
        poorForm={poorForm}
        season={season}
        masterSeed={masterSeed}
        league={league}
        worldClubs={world.clubs}
        scoutBoard={scoutBoard}
        onOpenOpponentScoutReport={onOpenOpponentScoutReport}
        onLineupPhaseChange={onLineupPhaseChange}
      />
      {overlays}
    </>
  );
}
