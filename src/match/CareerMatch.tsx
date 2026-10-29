/** WIREFRAME: docs/prd/design.md §9.15 — Matchday live */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { TacticsMode } from "../narrative/career-presentation.ts";
import type { BroadcastStoryContext, MatchViewLine, SandboxPlan, Squad } from "@fussballmanager/shared";
import { formatMatchMinuteLabel } from "@fussballmanager/shared";
import type { MatchSubstitutionRequest } from "../../server/src/api/manual-substitution.ts";
import type { CareerMatchBuildInput } from "./build-career-match-view.ts";
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
import { matchClockLabel } from "./Scoreboard.tsx";
import { MatchScoreHead } from "./MatchScoreHead.tsx";
import { formatLeagueMatchKickoffLabel } from "./match-kickoff-format.ts";
import { buildPreMatchBrief } from "./pre-match-brief.ts";
import { clampCareerMatchSpeed } from "./match-playback-speed.ts";
import { frameAt, useMatchPlayback } from "./useMatchPlayback.ts";
import { frameIndexForSeq, lineMinuteLabel } from "./text-playback.ts";
import { useMatchHighlightLevel } from "./match-highlight-level.ts";
import { MatchCommentaryStream } from "./MatchCommentaryStream.tsx";
import { MatchMomentum } from "./MatchMomentum.tsx";
import { MatchZoneStrip } from "./MatchZoneStrip.tsx";
import { MatchReportScreen } from "./MatchReportScreen.tsx";
import { MatchdayLivePanel, type MatchSideTab } from "./MatchdayLivePanel.tsx";
import { MatchSubstitutionPanel, type MatchPortraitLookup } from "./MatchSubstitutionPanel.tsx";
import { MatchHalfTimePrompt, MatchInjuryPrompt } from "./MatchPausePrompt.tsx";
import {
  halfTimeSeq,
  liveSubstitutionState,
  ownInjurySeqs,
  substituteSuggestions,
} from "./live-substitutions.ts";
import { estimateCa } from "../transfers/market-value.ts";
import { MatchdayPreviewPanel } from "./MatchdayPreviewPanel.tsx";
import { MatchdayLeagueSidePanel } from "./MatchdayLeagueSidePanel.tsx";
import type { LeagueState } from "../persistence/league-state.ts";
import type { WorldClub } from "../world/world-generator.ts";
import type { MatchdayCashBreakdown } from "../stadium/matchday-commerce.ts";
import { useT } from "../i18n/react.ts";
import type { FanbaseMood } from "../stadium/fanbase.ts";
import { t } from "../i18n/index.ts";
import type { ScoutBoard } from "../scouting/scout-board.ts";
import type { PressConference } from "../press/press-conference.ts";
import { pressMatchContext, type PressResolution } from "../press/press-session.ts";
import { standoutPlayerId, withMoraleForms } from "../press/press-squad.ts";
import { PressConferenceStep, type PressConferenceBridge } from "./PressConferenceStep.tsx";

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
  tacticsMode = "full",
  showOpponentScout = true,
  press,
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
  tacticsMode?: TacticsMode;
  showOpponentScout?: boolean;
  /** PRD 28 — pressers around this match (absent in tests / sandbox). */
  press?: PressConferenceBridge;
}) {
  const t = useT();
  const [playerClubSquad, setPlayerClubSquad] = useState<Squad | null>(null);
  const [preMatchPress, setPreMatchPress] = useState<{ conference: PressConference; squad: Squad } | null>(null);
  const capacity = homeStadiumCapacity ?? 8_000;
  const mood = fanbaseMood ?? "steady";

  useEffect(() => {
    setPlayerClubSquad(null);
    setPreMatchPress(null);
  }, [setup.playerClubId, setup.homeTeamId, setup.awayTeamId]);

  useEffect(() => {
    onLineupPhaseChange?.(playerClubSquad == null);
  }, [playerClubSquad, onLineupPhaseChange]);

  // PRD 28: the pre-match presser follows squad selection, so journalists can ask about the XI.
  const handleLineupConfirm = useCallback(
    (squad: Squad) => {
      const conference = press?.conferenceFor(
        "pre",
        pressMatchContext(setup, { starterIds: squad.starters.map((place) => place.player.id) }),
      );
      if (conference) {
        setPreMatchPress({ conference, squad });
        return;
      }
      setPlayerClubSquad(squad);
    },
    [press, setup],
  );

  // The presser's morale swing reaches the engine squad confirmed before it.
  const handlePreMatchPressDone = useCallback(
    (resolution: PressResolution) => {
      if (!preMatchPress) return;
      setPlayerClubSquad(withMoraleForms(preMatchPress.squad, resolution.session.players));
      setPreMatchPress(null);
    },
    [preMatchPress],
  );

  useEffect(() => {
    if (!playerClubSquad) return;
    return () => onNavActionChange(null);
  }, [playerClubSquad, onNavActionChange]);

  if (!playerClubSquad && preMatchPress && press) {
    return (
      <PressConferenceStep
        conference={preMatchPress.conference}
        bridge={press}
        opponentName={setup.opponentShortName}
        onNavActionChange={onNavActionChange}
        onDone={handlePreMatchPressDone}
      />
    );
  }

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
        tacticsMode={tacticsMode}
        showOpponentScout={showOpponentScout}
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
      league={league}
      worldClubs={worldClubs}
      season={season}
      masterSeed={masterSeed}
      press={press}
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
  league,
  worldClubs,
  season,
  masterSeed,
  press,
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
  league: LeagueState;
  worldClubs?: readonly WorldClub[];
  press?: PressConferenceBridge;
}) {
  const [view, setView] = useState<Awaited<ReturnType<typeof fetchCareerMatchView>> | null>(null);
  const [postMatchPress, setPostMatchPress] = useState<PressConference | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [fastSim, setFastSim] = useState(false);
  /** PRD 27 — the manager's changes so far; every new one replays the match from kickoff. */
  const [subRequests, setSubRequests] = useState<MatchSubstitutionRequest[]>([]);
  const [rebuilding, setRebuilding] = useState(false);
  const [prompt, setPrompt] = useState<{ kind: "injury" | "halftime"; seq: number } | null>(null);
  const [handledStops, setHandledStops] = useState<ReadonlySet<number>>(() => new Set());
  /** Seq of the stop playback is holding at; a change made now comes after it. */
  const [holdSeq, setHoldSeq] = useState<number | null>(null);
  const [sideTab, setSideTab] = useState<MatchSideTab>("events");

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
  const careerById = useMemo(
    () => new Map([...players, ...rivalPlayers].map((player) => [player.id, player])),
    [players, rivalPlayers],
  );
  const portraitFor = useCallback<MatchPortraitLookup>(
    (id) => {
      const player = careerById.get(id);
      return player
        ? { seed: player.portrait_seed, clubId: player.club_id, nationality: player.nationality }
        : undefined;
    },
    [careerById],
  );
  const ownTeamId = view ? (setup.isHome ? view.home.id : view.away.id) : setup.playerClubId;
  const halfTime = useMemo(() => (view ? halfTimeSeq(view) : null), [view]);
  const stops = useMemo(() => {
    if (!view) return [];
    const seqs = [...(halfTime !== null ? [halfTime] : []), ...ownInjurySeqs(view, ownTeamId)];
    return seqs.filter((seq) => !handledStops.has(seq)).sort((a, b) => a - b);
  }, [view, halfTime, ownTeamId, handledStops]);
  const onStop = useCallback(
    (seq: number) => {
      setHandledStops((current) => new Set(current).add(seq));
      setHoldSeq(seq);
      setPrompt({ kind: seq === halfTime ? "halftime" : "injury", seq });
    },
    [halfTime],
  );
  const [highlightLevel, setHighlightLevel] = useMatchHighlightLevel();
  const matchFetchKey = `${setup.seed}:${setup.homeTeamId}:${setup.awayTeamId}:${setup.playerClubId}`;
  const playback = useMatchPlayback(view, highlightLevel, { resetKey: matchFetchKey, stops, onStop });
  const minuteOf = useCallback(
    (line: MatchViewLine) =>
      view ? lineMinuteLabel(frameAt(view, frameIndexForSeq(view.frames, line.seq)).clock) : "",
    [view],
  );
  /** Set only on explicit user transport (play / step / skip) — never from index side-effects. */
  const userStartedPlaybackRef = useRef(false);
  const [userStartedPlayback, setUserStartedPlayback] = useState(false);
  const rivalPlayersRef = useRef(rivalPlayers);
  rivalPlayersRef.current = rivalPlayers;
  const broadcastStoryRef = useRef(broadcastStory);
  broadcastStoryRef.current = broadcastStory;
  const playerClubSquadRef = useRef(playerClubSquad);
  playerClubSquadRef.current = playerClubSquad;
  const subRequestsRef = useRef(subRequests);
  subRequestsRef.current = subRequests;
  const frameSeqRef = useRef(0);
  frameSeqRef.current = playback.frame?.seq ?? 0;
  const promptRef = useRef(prompt);
  promptRef.current = prompt;
  /** Skip to report waits for the assistant's replay, then jumps to the end. */
  const pendingEndRef = useRef(false);

  /** One simulation of this fixture; the manager's changes and the assistant hand-over replay on the same seed. */
  const loadView = useCallback(
    async (extra: Pick<CareerMatchBuildInput, "substitutions" | "assistantFromSeq"> = {}) => {
      const squad = playerClubSquadRef.current;
      const opponentId =
        setup.homeTeamId === setup.playerClubId ? setup.awayTeamId : setup.homeTeamId;
      const opponentSquad = squadForLeagueClub(opponentId, rivalPlayersRef.current);
      if (!opponentSquad) {
        throw new Error(t("match.career.loadRivalFailed"));
      }
      const homeSquad = setup.homeTeamId === setup.playerClubId ? squad : opponentSquad;
      const awaySquad = setup.awayTeamId === setup.playerClubId ? squad : opponentSquad;
      return fetchCareerMatchView({
        seed: setup.seed,
        homeTeamId: setup.homeTeamId,
        awayTeamId: setup.awayTeamId,
        homeSquad,
        awaySquad,
        playerClubSquad: squad,
        broadcastStory: broadcastStoryRef.current,
        ...extra,
      });
    },
    [setup.seed, setup.homeTeamId, setup.awayTeamId, setup.playerClubId, t],
  );
  const loadViewRef = useRef(loadView);
  loadViewRef.current = loadView;
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
    setSubRequests([]);
    setPrompt(null);
    setHandledStops(new Set());
    setHoldSeq(null);
    pendingEndRef.current = false;
    userStartedPlaybackRef.current = false;
    setUserStartedPlayback(false);

    void (async () => {
      try {
        const next = await loadViewRef.current();
        if (cancelled) return;
        setView(next);
      } catch (caught) {
        if (cancelled) return;
        setView(null);
        setError(caught instanceof Error ? caught.message : t("match.career.loadFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [matchFetchKey]);

  useEffect(() => {
    if (playback.playing) setHoldSeq(null);
  }, [playback.playing]);

  /**
   * PRD 27 — queue a change and replay: the stream is identical up to the paused tick, the new
   * player comes on at the next dead ball (at once for a man who already went off injured).
   */
  const requestSubstitution = useCallback(
    async (playerOffId: string, playerOnId: string | undefined, options: { atSeq?: number; resume?: boolean } = {}) => {
      playback.pause();
      const afterSeq = Math.max(options.atSeq ?? 0, holdSeq ?? 0, frameSeqRef.current);
      const next = [...subRequestsRef.current, { afterSeq, playerOffId, ...(playerOnId ? { playerOnId } : {}) }];
      setSubRequests(next);
      setRebuilding(true);
      try {
        const rebuilt = await loadViewRef.current({ substitutions: next });
        setView(rebuilt);
        if (options.resume) playback.play();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : t("match.career.loadFailed"));
      } finally {
        setRebuilding(false);
      }
    },
    [holdSeq, playback.pause, playback.play, t],
  );

  useEffect(() => {
    if (!pendingEndRef.current || !view) return;
    pendingEndRef.current = false;
    playback.goToEnd();
    setReportOpen(true);
  }, [view, playback.goToEnd]);

  const markUserStartedPlayback = useCallback(() => {
    userStartedPlaybackRef.current = true;
    setUserStartedPlayback(true);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        promptRef.current ||
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
      setPrompt(null);
      setFastSim(true);
      // "Simulate" hands the remaining changes to the assistant, like the AI (PRD 27).
      setRebuilding(true);
      void loadViewRef
        .current({ substitutions: subRequestsRef.current, assistantFromSeq: frameSeqRef.current })
        .then((rebuilt) => {
          pendingEndRef.current = true;
          setView(rebuilt);
        })
        .catch(() => {
          playback.goToEnd();
          setReportOpen(true);
        })
        .finally(() => setRebuilding(false));
    });
    return () => onRegisterSkipToReport(null);
  }, [loading, onRegisterSkipToReport, playback.goToEnd, reportOpen, userStartedPlayback, view]);

  useLayoutEffect(() => {
    // The post-match presser owns NEXT while it is open.
    if (postMatchPress) return;
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
          const conference = press?.conferenceFor(
            "post",
            pressMatchContext(setup, {
              homeGoals: outcome.homeGoals,
              awayGoals: outcome.awayGoals,
              standoutPlayerId: standoutPlayerId(outcome.playerClubStats),
            }),
          );
          if (conference) {
            setPostMatchPress(conference);
            return;
          }
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
      disabled: simulating || loading || rebuilding || prompt !== null || !outcome,
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
    postMatchPress,
    press,
    markUserStartedPlayback,
    playback.play,
    playback.playing,
    reportOpen,
    simulating,
    setup.seed,
    userStartedPlayback,
    view,
    rebuilding,
    prompt,
  ]);

  if (postMatchPress && press && view) {
    const outcome = watchedMatchFromView(setup, view);
    return (
      <PressConferenceStep
        conference={postMatchPress}
        bridge={press}
        opponentName={setup.opponentShortName}
        onNavActionChange={onNavActionChange}
        onDone={() => (fastSim ? onSkip(outcome) : onComplete(outcome))}
      />
    );
  }

  const live = Boolean(view && frame && !reportOpen && userStartedPlayback);
  const subsState = view && live ? liveSubstitutionState(view, playback.frameIndex, ownTeamId) : null;
  const ownSide: "home" | "away" = view && ownTeamId === view.away.id ? "away" : "home";
  const injuryFrame =
    prompt?.kind === "injury" && view ? view.frames.find((entry) => entry.seq === prompt.seq) : undefined;
  const injured = injuryFrame?.injury
    ? view?.roster.find((entry) => entry.id === injuryFrame.injury!.playerId)
    : undefined;
  const halfFrame =
    prompt?.kind === "halftime" && view ? (view.frames.find((entry) => entry.seq === prompt.seq) ?? frame) : null;
  const rankByCa = (id: string) => {
    const player = careerById.get(id);
    return player ? estimateCa(player.attributes, player.position) : 0;
  };
  const formations = view ? `${view.home.formation} vs ${view.away.formation}` : null;

  return (
    <main
      className={[
        "matchday",
        "career-match",
        "tc-match",
        reportOpen ? "career-match--report" : "",
        inPreview ? "career-match--preview" : "",
        live && !inPreview ? "career-match--live" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading ? <p className="tc-callout tc-match__status">{t("match.career.preparing")}</p> : null}
      {error ? <p className="tc-callout tc-callout--no tc-match__status">{error}</p> : null}

      {view && reportOpen ? (
        <MatchReportScreen
          view={view}
          setup={setup}
          week={week}
          weekday={weekday}
          kasse={kasse}
          portraitSeedForPlayerId={portraitSeedForPlayerId}
          onSelectPlayer={onSelectMatchPlayer}
        />
      ) : (
        <div className="tc-split tc-match__split">
          <div className="tc-stack tc-match__main">
            {view && heroFrame ? (
              <MatchScoreHead
                kicker={t("match.lineup.matchday", { matchday: setup.matchday })}
                home={view.home.name}
                away={view.away.name}
                center={
                  inPreview
                    ? formatLeagueMatchKickoffLabel(season, week, weekday)
                    : `${heroFrame.score.home} : ${heroFrame.score.away}`
                }
                meta={
                  inPreview
                    ? formations
                    : `${matchClockLabel(heroFrame.clock, t("match.scoreboard.fullTimeShort"))} · ${formations}`
                }
                live={live}
              />
            ) : (
              <MatchScoreHead
                kicker={t("match.lineup.matchday", { matchday: setup.matchday })}
                home={setup.isHome ? preMatch.playerClubShortName : preMatch.opponentShortName}
                away={setup.isHome ? preMatch.opponentShortName : preMatch.playerClubShortName}
                center="–"
                meta={formatLeagueMatchKickoffLabel(season, week, weekday)}
              />
            )}

            {view && inPreview ? (
              <MatchdayPreviewPanel view={view} brief={preMatch} ownTeamId={ownTeamId} />
            ) : null}

            {live && view && frame ? (
              <>
                <section className="tc-panel tc-match__pulse" aria-label={t("match.live.pulseAria")}>
                  <MatchMomentum view={view} frameIndex={playback.frameIndex} ownTeamId={ownTeamId} />
                  <MatchZoneStrip frame={frame} homeTeamId={view.home.id} ownTeamId={ownTeamId} />
                </section>
                <MatchCommentaryStream lines={playback.visibleLines} minuteOf={minuteOf} />
              </>
            ) : null}

            {!view && !error ? (
              <section className="tc-panel">
                <p className="tc-match__expert">
                  <span className="tc-match__badge">{t("match.commentary.expert")}</span>
                  {preMatch.colorLine}
                </p>
              </section>
            ) : null}
          </div>

          {live && view && frame ? (
            <MatchdayLivePanel
              view={view}
              frame={frame}
              ownTeamId={ownTeamId}
              playing={playback.playing}
              speed={playback.speed}
              onSpeedChange={(next) => playback.setSpeed(clampCareerMatchSpeed(next))}
              level={highlightLevel}
              onLevelChange={setHighlightLevel}
              onPlayPause={playback.toggle}
              onStepBack={playback.stepBack}
              onStepForward={playback.stepForward}
              stepBackDisabled={!playback.canStepBack}
              stepForwardDisabled={playback.atEnd}
              transportDisabled={rebuilding || prompt !== null}
              sideTab={sideTab}
              onSideTabChange={setSideTab}
              subsPanel={
                subsState ? (
                  <MatchSubstitutionPanel
                    state={subsState}
                    paused={!playback.playing}
                    busy={rebuilding}
                    portraitFor={portraitFor}
                    onPause={playback.pause}
                    onSubstitute={(offId, onId) => void requestSubstitution(offId, onId)}
                  />
                ) : undefined
              }
            />
          ) : !view && !error ? (
            <aside className="tc-panel" aria-label={t("match.preview.kicker")}>
              <p className="tc-label">{t("match.preview.kicker")}</p>
              <p className="tc-caption">{t("match.preview.confirmedHint")}</p>
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

      {live && view && subsState && prompt?.kind === "injury" && injured && injuryFrame?.injury ? (
        <MatchInjuryPrompt
          minuteLabel={formatMatchMinuteLabel(injuryFrame.clock)}
          injured={{ id: injured.id, name: injured.name }}
          left={injuryFrame.injury.left}
          suggestions={substituteSuggestions(subsState.bench, injured.role, rankByCa)}
          subsLeft={subsState.left}
          portraitFor={portraitFor}
          onSubstitute={(onId) => {
            setPrompt(null);
            void requestSubstitution(injured.id, onId, { atSeq: prompt.seq, resume: true });
          }}
          onAssistant={() => {
            setPrompt(null);
            void requestSubstitution(injured.id, undefined, { atSeq: prompt.seq, resume: true });
          }}
          onPlayOn={() => {
            setPrompt(null);
            playback.play();
          }}
        />
      ) : null}

      {live && view && subsState && halfFrame ? (
        <MatchHalfTimePrompt
          score={`${view.home.shortName} ${halfFrame.score.home} : ${halfFrame.score.away} ${view.away.shortName}`}
          stats={halfFrame.stats}
          ownSide={ownSide}
          tired={subsState.onPitch
            .filter((row) => (row.fatigue ?? 0) >= 45)
            .sort((a, b) => (b.fatigue ?? 0) - (a.fatigue ?? 0))
            .slice(0, 4)}
          subsLeft={subsState.left}
          portraitFor={portraitFor}
          onOpenSubs={() => {
            setPrompt(null);
            setSideTab("subs");
          }}
          onResume={() => {
            setPrompt(null);
            playback.play();
          }}
        />
      ) : null}
    </main>
  );
}
