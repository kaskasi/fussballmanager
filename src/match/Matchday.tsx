import { useCallback, useEffect, useState } from "react";
import type { MatchView, SandboxPlan } from "@fussballmanager/shared";
import {
  sandboxPlanFromTactics,
  SEED_MATCHUP,
} from "@fussballmanager/shared";
import { Lineup } from "./Lineup";
import { MatchPresentationToggle } from "./MatchPresentationToggle";
import { MatchStage } from "./MatchStage";
import { useMatchPresentationMode } from "./match-presentation-mode";
import { Scoreboard } from "./Scoreboard";
import { TacticsBoard } from "./TacticsBoard";
import { useMatchPlayback } from "./useMatchPlayback";

async function loadMatch(input: {
  seed: number;
  home: SandboxPlan;
  away: SandboxPlan;
}): Promise<MatchView> {
  const response = await fetch("/api/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`Match request failed (${response.status})`);
  }
  return (await response.json()) as MatchView;
}

export function Matchday() {
  const [seedInput, setSeedInput] = useState("2026");
  const [seed, setSeed] = useState(2026);
  const [view, setView] = useState<MatchView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [homePlan, setHomePlan] = useState<SandboxPlan>(() =>
    sandboxPlanFromTactics(SEED_MATCHUP.home.tactics),
  );
  const [awayPlan, setAwayPlan] = useState<SandboxPlan>(() =>
    sandboxPlanFromTactics(SEED_MATCHUP.away.tactics),
  );
  const playback = useMatchPlayback(view);
  const [presentationMode, setPresentationMode] = useMatchPresentationMode();

  const load = useCallback(
    async (nextSeed: number, home: SandboxPlan, away: SandboxPlan) => {
      setLoading(true);
      setError(null);
      try {
        const next = await loadMatch({ seed: nextSeed, home, away });
        setView(next);
        setSeed(next.seed);
      } catch (caught) {
        setView(null);
        setError(
          caught instanceof Error ? caught.message : "Could not load match",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(
      2026,
      sandboxPlanFromTactics(SEED_MATCHUP.home.tactics),
      sandboxPlanFromTactics(SEED_MATCHUP.away.tactics),
    );
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

  return (
    <main className="matchday">
      {view && frame ? <Scoreboard view={view} frame={frame} /> : (
        <header className="scoreboard">
          <p className="eyebrow">Matchday</p>
          <h1>Kickoff</h1>
        </header>
      )}

      <div className="controls">
        <label>
          Seed
          <input
            value={seedInput}
            onChange={(event) => setSeedInput(event.target.value)}
            inputMode="numeric"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            const parsed = Number.parseInt(seedInput, 10);
            const next = Number.isFinite(parsed) ? parsed : 2026;
            setSeedInput(String(next));
            void load(next, homePlan, awayPlan);
          }}
        >
          Simulate
        </button>
        <div className="transport">
          <button
            type="button"
            className="step"
            onClick={playback.stepBack}
            disabled={!view || loading}
            aria-label="Step back"
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
            aria-label="Step forward"
          >
            ›
          </button>
        </div>
        <button type="button" onClick={playback.restart} disabled={!view}>
          Restart
        </button>
        <MatchPresentationToggle
          value={presentationMode}
          onChange={setPresentationMode}
          disabled={!view || loading}
        />
        <label>
          Speed
          <select
            value={playback.speed}
            onChange={(event) => playback.setSpeed(Number(event.target.value))}
          >
            <option value={1}>1×</option>
            <option value={2}>2×</option>
            <option value={4}>4×</option>
            <option value={8}>8×</option>
            <option value={16}>16×</option>
            <option value={32}>32×</option>
          </select>
        </label>
        <p className="hint">Space play/pause · arrows step</p>
      </div>

      <TacticsBoard
        home={homePlan}
        away={awayPlan}
        onHome={setHomePlan}
        onAway={setAwayPlan}
      />

      {loading ? <p className="status">Simulating match…</p> : null}
      {error ? <p className="status error">{error}</p> : null}

      {view && frame ? (
        <>
          <MatchStage
            mode={presentationMode}
            view={view}
            frame={frame}
            previous={playback.previous}
            playing={playback.playing}
            frameDurationMs={playback.frameDurationMs}
            visibleLines={playback.visibleLines}
          />
          <Lineup view={view} frame={frame} />
        </>
      ) : null}
    </main>
  );
}
