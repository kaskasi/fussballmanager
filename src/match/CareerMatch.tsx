import { useCallback, useEffect, useState } from "react";
import type { SandboxPlan, Squad } from "@fussballmanager/shared";
import type { TacticsPresetId, TacticsPresetSlot } from "./tactics-presets.ts";
import type { Player } from "../types/player.ts";
import type { NavPrimaryAction } from "../ui/nav-primary-action.ts";
import type { CareerMatchSetup } from "../sim/career-match-setup.ts";
import { fetchCareerMatchView } from "./fetch-career-match.ts";
import {
  watchedMatchFromView,
  type WatchedPlayerMatch,
} from "../sim/watched-player-match.ts";
import { CareerLineupScreen } from "./CareerLineupScreen.tsx";
import type { MatchLineupState } from "./lineup-board.ts";
import { CommentaryFeed } from "./CommentaryFeed.tsx";
import { Lineup } from "./Lineup.tsx";
import { Pitch } from "./Pitch.tsx";
import { Scoreboard } from "./Scoreboard.tsx";
import { useMatchPlayback } from "./useMatchPlayback.ts";

export function CareerMatch({
  setup,
  players,
  week,
  weekday,
  tacticsPresets,
  matchLineup,
  rivalPlayers,
  onSaveTacticsPreset,
  onSaveMatchLineup,
  simulating,
  onComplete,
  onSkip,
  onNavActionChange,
}: {
  setup: CareerMatchSetup;
  players: readonly Player[];
  week: number;
  weekday: number;
  tacticsPresets: readonly TacticsPresetSlot[];
  matchLineup: MatchLineupState | undefined;
  rivalPlayers: readonly Player[];
  onSaveTacticsPreset: (id: TacticsPresetId, plan: SandboxPlan) => void;
  onSaveMatchLineup: (lineup: MatchLineupState) => void;
  simulating: boolean;
  onComplete: (outcome: WatchedPlayerMatch) => void;
  onSkip: (outcome: WatchedPlayerMatch) => void;
  onNavActionChange: (action: NavPrimaryAction | null) => void;
}) {
  const [playerClubSquad, setPlayerClubSquad] = useState<Squad | null>(null);

  useEffect(() => {
    if (!playerClubSquad) return;
    return () => onNavActionChange(null);
  }, [playerClubSquad, onNavActionChange]);

  if (!playerClubSquad) {
    return (
      <CareerLineupScreen
        setup={setup}
        players={players}
        week={week}
        weekday={weekday}
        tacticsPresets={tacticsPresets}
        matchLineup={matchLineup}
        rivalPlayers={rivalPlayers}
        onSaveTacticsPreset={onSaveTacticsPreset}
        onSaveMatchLineup={onSaveMatchLineup}
        onConfirm={setPlayerClubSquad}
        onNavActionChange={onNavActionChange}
      />
    );
  }

  return (
    <CareerMatchPlayback
      setup={setup}
      playerClubSquad={playerClubSquad}
      week={week}
      weekday={weekday}
      simulating={simulating}
      onComplete={onComplete}
      onSkip={onSkip}
      onNavActionChange={onNavActionChange}
    />
  );
}

function CareerMatchPlayback({
  setup,
  playerClubSquad,
  week,
  weekday,
  simulating,
  onComplete,
  onSkip,
  onNavActionChange,
}: {
  setup: CareerMatchSetup;
  playerClubSquad: Squad;
  week: number;
  weekday: number;
  simulating: boolean;
  onComplete: (outcome: WatchedPlayerMatch) => void;
  onSkip: (outcome: WatchedPlayerMatch) => void;
  onNavActionChange: (action: NavPrimaryAction | null) => void;
}) {
  const [view, setView] = useState<Awaited<ReturnType<typeof fetchCareerMatchView>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const playback = useMatchPlayback(view);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchCareerMatchView({
        seed: setup.seed,
        homeTeamId: setup.homeTeamId,
        awayTeamId: setup.awayTeamId,
        playerClubSquad,
      });
      setView(next);
    } catch (caught) {
      setView(null);
      setError(caught instanceof Error ? caught.message : "Spiel konnte nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, [setup, playerClubSquad]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        playback.toggle();
      } else if (event.code === "ArrowRight") {
        event.preventDefault();
        playback.stepForward();
      } else if (event.code === "ArrowLeft") {
        event.preventDefault();
        playback.stepBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playback.toggle, playback.stepForward, playback.stepBack]);

  const frame = playback.frame;
  const finished = view ? playback.index >= view.frames.length - 1 : false;

  useEffect(() => {
    const outcome = view ? watchedMatchFromView(setup, view) : null;
    onNavActionChange({
      label: simulating
        ? "…"
        : finished
          ? "Spieltag abschließen"
          : "Spiel simulieren",
      onClick: () => {
        if (!outcome) return;
        if (finished) onComplete(outcome);
        else onSkip(outcome);
      },
      disabled: simulating || loading || !outcome,
      title: finished ? "Ergebnis übernehmen und zum Sonntag" : "Spiel überspringen und Woche simulieren",
    });
    return () => onNavActionChange(null);
  }, [finished, simulating, loading, view, setup, onComplete, onSkip, onNavActionChange]);

  return (
    <main className="matchday career-match">
      <div className="career-match-hud">
        {view && frame ? (
          <Scoreboard view={view} frame={frame} compact />
        ) : (
          <header className="scoreboard scoreboard--compact">
            <p className="eyebrow">Spieltag {setup.matchday}</p>
            <h1 className="career-match-placeholder-title">
              {setup.isHome ? "Heim" : "Auswärts"} vs {setup.opponentShortName}
            </h1>
          </header>
        )}

        <div className="career-match-actions career-match-actions--inline">
          <div className="transport">
            <button
              type="button"
              className="step"
              onClick={playback.stepBack}
              disabled={!view || loading}
              aria-label="Schritt zurück"
            >
              ‹
            </button>
            <button
              type="button"
              className={`playpause ${playback.playing ? "is-playing" : ""}`}
              onClick={playback.toggle}
              disabled={!view || loading}
            >
              {playback.playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              className="step"
              onClick={playback.stepForward}
              disabled={!view || loading}
              aria-label="Schritt vor"
            >
              ›
            </button>
          </div>
          <label className="career-match-speed">
            Speed
            <select
              value={playback.speed}
              onChange={(event) => playback.setSpeed(Number(event.target.value))}
              disabled={!view || loading}
            >
              <option value={1}>1×</option>
              <option value={2}>2×</option>
              <option value={4}>4×</option>
              <option value={8}>8×</option>
              <option value={16}>16×</option>
            </select>
          </label>
        </div>
      </div>

      {loading ? <p className="status">Spiel wird vorbereitet…</p> : null}
      {error ? <p className="status error">{error}</p> : null}

      {view && frame ? (
        <>
          <div className="match-stage career-match-stage">
            <Pitch
              from={playback.previous ?? frame}
              to={frame}
              playing={playback.playing}
              durationMs={playback.frameDurationMs}
              homeId={view.home.id}
              home={view.home}
              away={view.away}
              roster={view.roster}
              cue={frame.cue}
              cueDetail={frame.cueDetail}
            />
            <CommentaryFeed lines={playback.visibleLines} />
          </div>
          <details className="career-match-lineups">
            <summary>Aufstellungen</summary>
            <Lineup view={view} frame={frame} />
          </details>
        </>
      ) : null}
    </main>
  );
}
