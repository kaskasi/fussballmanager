import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BroadcastStoryContext, SandboxPlan, Squad } from "@fussballmanager/shared";
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
import { squadForLeagueClub } from "../sim/league-divisions.ts";
import type { MatchLineupState } from "./lineup-board.ts";
import { Lineup } from "./Lineup.tsx";
import { MatchPresentationToggle } from "./MatchPresentationToggle.tsx";
import { MatchStage } from "./MatchStage.tsx";
import { useMatchPresentationMode } from "./match-presentation-mode.ts";
import { Scoreboard } from "./Scoreboard.tsx";
import { buildPreMatchBrief } from "./pre-match-brief.ts";
import { PreMatchBlock } from "./PreMatchBlock.tsx";
import { useMatchPlayback } from "./useMatchPlayback.ts";
import { MatchReportScreen } from "./MatchReportScreen.tsx";
import type { MatchdayCashBreakdown } from "../stadium/matchday-commerce.ts";
import type { FanbaseMood } from "../stadium/fanbase.ts";
import { matchAmbiencePhotoUrl } from "../ui/assets/mood-photos.ts";

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
  broadcastStory,
  kasse,
  homeStadiumCapacity,
  fanbaseMood,
  poorForm,
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
  broadcastStory?: BroadcastStoryContext;
  kasse?: MatchdayCashBreakdown;
  homeStadiumCapacity?: number;
  fanbaseMood?: FanbaseMood;
  poorForm?: boolean;
}) {
  const [playerClubSquad, setPlayerClubSquad] = useState<Squad | null>(null);
  const capacity = homeStadiumCapacity ?? 8_000;
  const mood = fanbaseMood ?? "steady";
  const backdropPhotoUrl = matchAmbiencePhotoUrl({
    isHome: setup.isHome,
    homeCapacity: capacity,
    fanbaseMood: mood,
    poorForm: poorForm ?? false,
  });

  useEffect(() => {
    setPlayerClubSquad(null);
  }, [setup.playerClubId, setup.homeTeamId, setup.awayTeamId]);

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
        homeStadiumCapacity={capacity}
        fanbaseMood={mood}
        poorForm={poorForm}
      />
    );
  }

  return (
    <CareerMatchPlayback
      setup={setup}
      playerClubSquad={playerClubSquad}
      rivalPlayers={rivalPlayers}
      week={week}
      weekday={weekday}
      simulating={simulating}
      onComplete={onComplete}
      onSkip={onSkip}
      onNavActionChange={onNavActionChange}
      broadcastStory={broadcastStory}
      kasse={kasse}
      backdropPhotoUrl={backdropPhotoUrl}
    />
  );
}

function CareerMatchPlayback({
  setup,
  playerClubSquad,
  rivalPlayers,
  week,
  weekday,
  simulating,
  onComplete,
  onSkip,
  onNavActionChange,
  broadcastStory,
  kasse,
  backdropPhotoUrl,
}: {
  setup: CareerMatchSetup;
  playerClubSquad: Squad;
  rivalPlayers: readonly Player[];
  week: number;
  weekday: number;
  simulating: boolean;
  onComplete: (outcome: WatchedPlayerMatch) => void;
  onSkip: (outcome: WatchedPlayerMatch) => void;
  onNavActionChange: (action: NavPrimaryAction | null) => void;
  broadcastStory?: BroadcastStoryContext;
  kasse?: MatchdayCashBreakdown;
  backdropPhotoUrl?: string;
}) {
  const [view, setView] = useState<Awaited<ReturnType<typeof fetchCareerMatchView>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [fastSim, setFastSim] = useState(false);
  const playback = useMatchPlayback(view);
  const [presentationMode, setPresentationMode] = useMatchPresentationMode();
  const rivalPlayersRef = useRef(rivalPlayers);
  rivalPlayersRef.current = rivalPlayers;
  const broadcastStoryRef = useRef(broadcastStory);
  broadcastStoryRef.current = broadcastStory;
  const playerClubSquadRef = useRef(playerClubSquad);
  playerClubSquadRef.current = playerClubSquad;
  const matchFetchKey = `${setup.seed}:${setup.homeTeamId}:${setup.awayTeamId}:${setup.playerClubId}`;
  const preMatch = useMemo(
    () => buildPreMatchBrief(setup, playerClubSquad.tactics.formation, rivalPlayers),
    [setup, playerClubSquad.tactics.formation, rivalPlayers],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setReportOpen(false);
    setFastSim(false);

    void (async () => {
      try {
        const squad = playerClubSquadRef.current;
        const opponentId =
          setup.homeTeamId === setup.playerClubId ? setup.awayTeamId : setup.homeTeamId;
        const opponentSquad = squadForLeagueClub(opponentId, rivalPlayersRef.current);
        if (!opponentSquad) {
          throw new Error("Gegnerkader konnte nicht geladen werden.");
        }
        const homeSquad =
          setup.homeTeamId === setup.playerClubId ? squad : opponentSquad;
        const awaySquad =
          setup.awayTeamId === setup.playerClubId ? squad : opponentSquad;
        const next = await fetchCareerMatchView({
          seed: setup.seed,
          homeTeamId: setup.homeTeamId,
          awayTeamId: setup.awayTeamId,
          homeSquad,
          awaySquad,
          playerClubSquad: squad,
          broadcastStory: broadcastStoryRef.current,
        });
        if (cancelled) return;
        setView(next);
      } catch (caught) {
        if (cancelled) return;
        setView(null);
        setError(caught instanceof Error ? caught.message : "Spiel konnte nicht geladen werden");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [matchFetchKey]);

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

  const openReport = useCallback(
    (simulated: boolean) => {
      playback.goToEnd();
      setFastSim(simulated);
      setReportOpen(true);
    },
    [playback.goToEnd],
  );

  useEffect(() => {
    if (finished && view && !reportOpen && !loading) {
      setFastSim(false);
      setReportOpen(true);
    }
  }, [finished, view, reportOpen, loading]);

  useEffect(() => {
    const outcome = view ? watchedMatchFromView(setup, view) : null;
    onNavActionChange({
      label: simulating
        ? "…"
        : reportOpen
          ? "Spieltag abschließen"
          : "Spiel simulieren",
      onClick: () => {
        if (!outcome) return;
        if (reportOpen) {
          if (fastSim) onSkip(outcome);
          else onComplete(outcome);
          return;
        }
        openReport(true);
      },
      disabled: simulating || loading || !outcome,
      title: reportOpen
        ? "Ergebnis übernehmen und zum Sonntag"
        : "Spiel überspringen — Spielbericht anzeigen",
    });
    return () => onNavActionChange(null);
  }, [
    fastSim,
    loading,
    onComplete,
    onNavActionChange,
    onSkip,
    openReport,
    reportOpen,
    simulating,
    setup.seed,
    view,
  ]);

  return (
    <main
      className={[
        "matchday",
        "career-match",
        reportOpen ? "career-match--report" : "",
        !reportOpen && presentationMode === "events" ? "career-match--events" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {!reportOpen ? (
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
          <MatchPresentationToggle
            value={presentationMode}
            onChange={setPresentationMode}
            disabled={!view || loading}
          />
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
      ) : null}

      {loading ? <p className="status">Spiel wird vorbereitet…</p> : null}
      {error ? <p className="status error">{error}</p> : null}

      {!view && !error ? <PreMatchBlock brief={preMatch} /> : null}

      {view && reportOpen ? (
        <MatchReportScreen
          view={view}
          setup={setup}
          week={week}
          weekday={weekday}
          kasse={kasse}
        />
      ) : null}

      {view && frame && !reportOpen ? (
        <>
          <MatchStage
            mode={presentationMode}
            view={view}
            frame={frame}
            previous={playback.previous}
            playing={playback.playing}
            frameDurationMs={playback.frameDurationMs}
            visibleLines={playback.visibleLines}
            preMatch={preMatch}
            className="career-match-stage"
            backdropPhotoUrl={backdropPhotoUrl}
          />
          <details className="career-match-lineups">
            <summary>Aufstellungen</summary>
            <Lineup view={view} frame={frame} />
          </details>
        </>
      ) : null}
    </main>
  );
}
