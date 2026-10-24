/** Tactics menu screen — lineup, play style and opponent analysis for the next league fixture. */
import type { SandboxPlan } from "@fussballmanager/shared";
import { CareerLineupScreen } from "../../match/CareerLineupScreen.tsx";
import type { MatchLineupState } from "../../match/lineup-board.ts";
import type { TacticsPresetId, TacticsPresetSlot } from "../../match/tactics-presets.ts";
import { tacticsModeForCurtain, resolveFeatureCurtain } from "../../narrative/career-presentation.ts";
import type { StoryState } from "../../narrative/story-state.ts";
import type { ScoutBoard } from "../../scouting/scout-board.ts";
import type { ScoutNetworkState } from "../../scouting/scout-network.ts";
import type { CareerMatchSetup } from "../../sim/career-match-setup.ts";
import { matchdayCapacity, type ClubStadium } from "../../stadium/club-stadium.ts";
import { matchdayCashBreakdown } from "../../stadium/matchday-commerce.ts";
import type { Player } from "../../types/player.ts";
import { useT } from "../../i18n/react.ts";

export function TacticsScreen({
  setup,
  players,
  rivalPlayers,
  season,
  week,
  weekday,
  stadium,
  storyState,
  tacticsPresets,
  matchLineup,
  scoutBoard,
  scoutNetwork,
  onSaveTacticsPreset,
  onSaveMatchLineup,
  onStartOpponentScout,
  onApplyOpponentScoutPlan,
  onOpenPlayer,
}: {
  setup: CareerMatchSetup | null;
  players: readonly Player[];
  rivalPlayers: readonly Player[];
  season: number;
  week: number;
  weekday: number;
  stadium: ClubStadium;
  storyState: StoryState;
  tacticsPresets: readonly TacticsPresetSlot[];
  matchLineup: MatchLineupState | undefined;
  scoutBoard: ScoutBoard;
  scoutNetwork: ScoutNetworkState;
  onSaveTacticsPreset: (id: TacticsPresetId, plan: SandboxPlan) => void;
  onSaveMatchLineup: (lineup: MatchLineupState) => void;
  onStartOpponentScout: () => void;
  onApplyOpponentScoutPlan: (plan: SandboxPlan) => void;
  onOpenPlayer: (playerId: string) => void;
}) {
  const t = useT();
  if (!setup) {
    return (
      <main className="matchday career-lineup tc-lineup">
        <p className="tc-callout" role="status">
          {t("tactics.noFixture")}
        </p>
      </main>
    );
  }
  const curtain = resolveFeatureCurtain(storyState);
  return (
    <CareerLineupScreen
      variant="menu"
      setup={setup}
      players={players}
      week={week}
      weekday={weekday}
      season={season}
      tacticsPresets={tacticsPresets}
      matchLineup={matchLineup}
      rivalPlayers={rivalPlayers}
      onSaveTacticsPreset={onSaveTacticsPreset}
      onSaveMatchLineup={onSaveMatchLineup}
      onConfirm={() => undefined}
      onNavActionChange={() => undefined}
      homeStadiumCapacity={matchdayCapacity(stadium, season, week)}
      kasse={matchdayCashBreakdown(stadium, setup.isHome, season, week)}
      scoutBoard={scoutBoard}
      scoutNetwork={scoutNetwork}
      tacticsMode={tacticsModeForCurtain(curtain)}
      showOpponentScout={curtain.opponent_scout_module}
      onStartOpponentScout={onStartOpponentScout}
      onApplyOpponentScoutPlan={onApplyOpponentScoutPlan}
      onOpenPlayer={onOpenPlayer}
    />
  );
}
