/** WIREFRAME: docs/prd/design.md §9.15 — Matchday live */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { MatchStage } from "./MatchStage.tsx";
import { useMatchPresentationMode } from "./match-presentation-mode.ts";
import { Scoreboard } from "./Scoreboard.tsx";
import { buildPreMatchBrief } from "./pre-match-brief.ts";
import { PreMatchBlock } from "./PreMatchBlock.tsx";
import { clampCareerMatchSpeed } from "./match-playback-speed.ts";
import { frameAt, useMatchPlayback } from "./useMatchPlayback.ts";
import { MatchReportScreen } from "./MatchReportScreen.tsx";
import { MatchdayLivePanel } from "./MatchdayLivePanel.tsx";
import { MatchdayHeroControls } from "./MatchdayHeroControls.tsx";
import { MatchdayPreviewPanel } from "./MatchdayPreviewPanel.tsx";
import { MatchdayLeagueSidePanel } from "./MatchdayLeagueSidePanel.tsx";
import type { LeagueState } from "../persistence/league-state.ts";
import type { WorldClub } from "../world/world-generator.ts";
import type { MatchdayCashBreakdown } from "../stadium/matchday-commerce.ts";
import { useT } from "../i18n/react.ts";
import type { FanbaseMood } from "../stadium/fanbase.ts";
import { matchAmbiencePhotoUrl } from "../ui/assets/mood-photos.ts";
import { t } from "../i18n/index.ts";
import type { ScoutBoard } from "../scouting/scout-board.ts";

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
  onSelectMatchPlayer,
  onRegisterSkipToReport,
  broadcastStory,
  kasse,
  homeStadiumCapacity,
  fanbaseMood,
  poorForm,
  season = 1,
  masterSeed,
  scoutBoard,
  onOpenOpponentScoutReport,
  onLineupPhaseChange,
  league,
  worldClubs,
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
  onSelectMatchPlayer?: (playerId: string) => void;
  onRegisterSkipToReport?: (fn: (() => void) | null) => void;
  broadcastStory?: BroadcastStoryContext;
  kasse?: MatchdayCashBreakdown;
  homeStadiumCapacity?: number;
  fanbaseMood?: FanbaseMood;
  poorForm?: boolean;
  season?: number;
  masterSeed: number;
  scoutBoard?: ScoutBoard;
  onOpenOpponentScoutReport?: (postfachItemId: string) => void;
  onLineupPhaseChange?: (inLineup: boolean) => void;
  league: LeagueState;
  worldClubs?: readonly WorldClub[];
}) {
  const t = useT();
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
    onLineupPhaseChange?.(playerClubSquad == null);
  }, [playerClubSquad, onLineupPhaseChange]);

  const handleLineupConfirm = useCallback((squad: Squad) => {
    setPlayerClubSquad(squad);
  }, []);

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
        onConfirm={handleLineupConfirm}
        onNavActionChange={onNavActionChange}
        homeStadiumCapacity={capacity}
        fanbaseMood={mood}
        poorForm={poorForm}
        season={season}
        scoutBoard={scoutBoard}
        onOpenOpponentScoutReport={onOpenOpponentScoutReport}
        onOpenPlayer={onSelectMatchPlayer}
        kasse={kasse}
      />
    );
  }

  return (
    <CareerMatchPlayback
      setup={setup}
      players={players}
      playerClubSquad={playerClubSquad}
      rivalPlayers={rivalPlayers}
      week={week}
      weekday={weekday}
      simulating={simulating}
      onComplete={onComplete}
      onSkip={onSkip}
      onNavActionChange={onNavActionChange}
      onSelectMatchPlayer={onSelectMatchPlayer}
      onRegisterSkipToReport={onRegisterSkipToReport}
      broadcastStory={broadcastStory}
      kasse={kasse}
      backdropPhotoUrl={backdropPhotoUrl}
      league={league}
      worldClubs={worldClubs}
      season={season}
      masterSeed={masterSeed}
    />
  );
}

function CareerMatchPlayback({
  setup,
  players,
  playerClubSquad,
  rivalPlayers,
  week,
  weekday,
  simulating,
  onComplete,
  onSkip,
  onNavActionChange,
  onSelectMatchPlayer,
  onRegisterSkipToReport,
  broadcastStory,
  kasse,
  backdropPhotoUrl,
  league,
  worldClubs,
  season,
  masterSeed,
}: {
  setup: CareerMatchSetup;
  players: readonly Player[];
  playerClubSquad: Squad;
  rivalPlayers: readonly Player[];
  week: number;
  weekday: number;
  season: number;
  masterSeed: number;
  simulating: boolean;
  onComplete: (outcome: WatchedPlayerMatch) => void;
  onSkip: (outcome: WatchedPlayerMatch) => void;
  onNavActionChange: (action: NavPrimaryAction | null) => void;
  onSelectMatchPlayer?: (playerId: string) => void;
  onRegisterSkipToReport?: (fn: (() => void) | null) => void;
  broadcastStory?: BroadcastStoryContext;
  kasse?: MatchdayCashBreakdown;
  backdropPhotoUrl?: string;
  league: LeagueState;
  worldClubs?: readonly WorldClub[];
}) {
  const [view, setView] = useState<Awaited<ReturnType<typeof fetchCareerMatchView>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [fastSim, setFastSim] = useState(false);

  const portraitSeedForPlayerId = useMemo(() => {
    const map = new Map<string, number>();
    for (const player of players) {
      map.set(player.id, player.portrait_seed);
    }
    for (const player of rivalPlayers) {
      map.set(player.id, player.portrait_seed);
    }
    return (id: string) => map.get(id);
  }, [players, rivalPlayers]);
  const playback = useMatchPlayback(view);
  /** Set only on explicit user transport (play / step / skip) — never from index side-effects. */
  const userStartedPlaybackRef = useRef(false);
  const [userStartedPlayback, setUserStartedPlayback] = useState(false);
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
    userStartedPlaybackRef.current = false;
    setUserStartedPlayback(false);

    void (async () => {
      try {
        const squad = playerClubSquadRef.current;
        const opponentId =
          setup.homeTeamId === setup.playerClubId ? setup.awayTeamId : setup.homeTeamId;
        const opponentSquad = squadForLeagueClub(opponentId, rivalPlayersRef.current);
        if (!opponentSquad) {
          throw new Error(t("match.career.loadRivalFailed"));
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

  const markUserStartedPlayback = useCallback(() => {
    userStartedPlaybackRef.current = true;
    setUserStartedPlayback(true);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (!userStartedPlaybackRef.current) {
        if (event.code === "Space" && view && !loading && !reportOpen) {
          event.preventDefault();
          markUserStartedPlayback();
          playback.play();
        }
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
  }, [
    loading,
    markUserStartedPlayback,
    playback.play,
    playback.stepBack,
    playback.stepForward,
    playback.toggle,
    reportOpen,
    view,
  ]);

  const frame = playback.frame;
  const inPreview = Boolean(view && !loading && !reportOpen && !userStartedPlayback);
  const kickoffFrame = view ? frameAt(view, 0) : null;
  const heroFrame = inPreview && kickoffFrame ? kickoffFrame : frame;
  const finished = playback.atEnd;

  useEffect(() => {
    if (!view || loading || reportOpen || !finished) return;
    if (!userStartedPlaybackRef.current) {
      return;
    }
    setFastSim(false);
    setReportOpen(true);
  }, [finished, loading, playback.index, playback.playing, playback.presentedFrameCount, reportOpen, view]);

  useEffect(() => {
    if (!onRegisterSkipToReport) return;
    if (reportOpen || !view || loading || !userStartedPlayback) {
      onRegisterSkipToReport(null);
      return;
    }
    onRegisterSkipToReport(() => {
      userStartedPlaybackRef.current = true;
      setUserStartedPlayback(true);
      playback.goToEnd();
      setFastSim(true);
      setReportOpen(true);
    });
    return () => onRegisterSkipToReport(null);
  }, [loading, onRegisterSkipToReport, playback.goToEnd, reportOpen, userStartedPlayback, view]);

  useLayoutEffect(() => {
    const outcome = view ? watchedMatchFromView(setup, view) : null;
    const awaitingKickoff = Boolean(view && !loading && !reportOpen && !userStartedPlayback);
    const navLabel = simulating
      ? "…"
      : reportOpen
        ? t("match.career.nav.finishMatchday")
        : awaitingKickoff
          ? t("match.career.nav.start")
          : playback.playing
            ? t("match.career.nav.pause")
            : t("match.career.nav.resume");
    onNavActionChange({
      label: navLabel,
      onClick: () => {
        if (!outcome) return;
        if (reportOpen) {
          if (fastSim) onSkip(outcome);
          else onComplete(outcome);
          return;
        }
        if (playback.playing) {
          playback.pause();
          return;
        }
        markUserStartedPlayback();
        playback.play();
      },
      disabled: simulating || loading || !outcome,
      title: reportOpen
        ? t("match.career.nav.finishHint")
        : awaitingKickoff
          ? t("match.career.nav.startLive")
          : playback.playing
            ? t("match.career.nav.pauseSim")
            : t("match.career.nav.resumeSim"),
    });
    return () => onNavActionChange(null);
  }, [
    fastSim,
    loading,
    onComplete,
    onNavActionChange,
    onSkip,
    playback.pause,
    markUserStartedPlayback,
    playback.play,
    playback.playing,
    reportOpen,
    simulating,
    setup.seed,
    userStartedPlayback,
    view,
  ]);

  return (
    <main
      className={[
        "matchday",
        "career-match",
        reportOpen ? "career-match--report" : "",
        inPreview ? "career-match--preview" : "",
        view && userStartedPlayback && !reportOpen && !inPreview ? "career-match--live" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading ? <p className="status">Spiel wird vorbereitet…</p> : null}
      {error ? <p className="status error">{error}</p> : null}

      {view && reportOpen ? (
        <MatchReportScreen
          view={view}
          setup={setup}
          week={week}
          weekday={weekday}
          kasse={kasse}
          stadiumPhotoUrl={backdropPhotoUrl}
          portraitSeedForPlayerId={portraitSeedForPlayerId}
          onSelectPlayer={onSelectMatchPlayer}
        />
      ) : (
        <div className="matchday-cockpit">
          <div className="matchday-cockpit-hero">
            {view && heroFrame ? (
              <Scoreboard
                view={view}
                frame={heroFrame}
                compact
                fullClubNames
                previewKickoff={
                  inPreview ? { season, week, weekday } : undefined
                }
              />
            ) : (
              <header className="scoreboard scoreboard--compact matchday-preview-score">
                <p className="eyebrow">Spieltag {setup.matchday}</p>
                <h1 className="career-match-placeholder-title">
                  {setup.isHome ? t("match.career.side.home") : t("match.career.side.away")} vs{" "}
                  {setup.opponentShortName}
                </h1>
              </header>
            )}

            {view && inPreview ? <MatchdayPreviewPanel view={view} /> : null}

            {view && !reportOpen && userStartedPlayback && !inPreview ? (
              <MatchdayHeroControls
                presentationMode={presentationMode}
                onPresentationModeChange={setPresentationMode}
                speed={playback.speed}
                onSpeedChange={(next) => playback.setSpeed(clampCareerMatchSpeed(next))}
                playing={playback.playing}
                onStepBack={playback.stepBack}
                onStepForward={playback.stepForward}
                onPlayPause={playback.toggle}
                stepBackDisabled={playback.index <= 0}
                stepForwardDisabled={playback.atEnd}
                disabled={loading}
              />
            ) : null}

            {view && frame && !reportOpen && userStartedPlayback ? (
              <MatchStage
                mode={presentationMode}
                view={view}
                frame={frame}
                previous={playback.previous}
                playing={playback.playing}
                frameDurationMs={playback.frameDurationMs}
                visibleLines={playback.visibleLines}
                preMatch={null}
                className="career-match-stage"
                backdropPhotoUrl={backdropPhotoUrl}
              />
            ) : null}

            {!view && !error ? <PreMatchBlock brief={preMatch} /> : null}
          </div>

          {view && frame && !reportOpen && userStartedPlayback ? (
            <MatchdayLivePanel view={view} frame={frame} />
          ) : !view && !error ? (
            <aside
              className="matchday-cockpit-side matchday-cockpit-side--preview game-panel"
              aria-label={t("match.preview.kicker")}
            >
              <h2 className="match-report-section-title">{t("match.preview.kicker")}</h2>
              <p className="matchday-preview-copy">{t("match.preview.confirmedHint")}</p>
            </aside>
          ) : view && inPreview ? (
            <MatchdayLeagueSidePanel
              league={league}
              setup={setup}
              season={season}
              masterSeed={masterSeed}
              rivalPlayers={rivalPlayers}
              worldClubs={worldClubs}
            />
          ) : null}
        </div>
      )}
    </main>
  );
}
