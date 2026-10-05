/** WIREFRAME: docs/prd/design.md §9.15 — Live-Regeln (rechte Spalte) */
import { useState } from "react";
import type { MatchView, MatchViewFrame, MatchViewLine } from "@fussballmanager/shared";
import { EventsHud } from "./EventsHud.tsx";
import { Lineup } from "./Lineup.tsx";
import { MatchPresentationToggle } from "./MatchPresentationToggle.tsx";
import { MatchStats } from "./MatchStats.tsx";
import type { MatchPresentationMode } from "./match-presentation-mode.ts";
import type { PreMatchBrief } from "./pre-match-brief.ts";
import { localizeMatchLine } from "./localize-match-line.ts";
import { eventLineTone } from "./match-presentation-mode.ts";

type SideTab = "events" | "stats" | "lineups";

export function MatchdayLivePanel({
  view,
  frame,
  visibleLines,
  preMatch,
  presentationMode,
  onPresentationModeChange,
  playing,
  onTogglePlay,
  onStepBack,
  onStepForward,
  speed,
  onSpeedChange,
  disabled,
}: {
  view: MatchView;
  frame: MatchViewFrame;
  visibleLines: MatchViewLine[];
  preMatch?: PreMatchBrief | null;
  presentationMode: MatchPresentationMode;
  onPresentationModeChange: (mode: MatchPresentationMode) => void;
  playing: boolean;
  onTogglePlay: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  disabled?: boolean;
}) {
  const [sideTab, setSideTab] = useState<SideTab>("events");

  return (
    <aside className="matchday-cockpit-side game-panel" aria-label="Live-Regeln">
      <div className="matchday-side-toolbar">
        <div className="transport matchday-side-transport">
          <button type="button" className="step" onClick={onStepBack} disabled={disabled} aria-label="Schritt zurück">
            ‹
          </button>
          <button
            type="button"
            className={`playpause ${playing ? "is-playing" : ""}`}
            onClick={onTogglePlay}
            disabled={disabled}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button type="button" className="step" onClick={onStepForward} disabled={disabled} aria-label="Schritt vor">
            ›
          </button>
        </div>
        <MatchPresentationToggle
          value={presentationMode}
          onChange={onPresentationModeChange}
          disabled={disabled}
        />
        <label className="career-match-speed">
          Speed
          <select
            value={speed}
            onChange={(event) => onSpeedChange(Number(event.target.value))}
            disabled={disabled}
          >
            <option value={1}>1×</option>
            <option value={2}>2×</option>
            <option value={4}>4×</option>
            <option value={8}>8×</option>
          </select>
        </label>
      </div>

      <div className="matchday-side-tabs" role="tablist" aria-label="Live-Inhalt">
        {(
          [
            ["events", "Ereignisse"],
            ["stats", "Statistik"],
            ["lineups", "Aufstellungen"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={sideTab === id}
            className={sideTab === id ? "matchday-side-tab is-active" : "matchday-side-tab"}
            onClick={() => setSideTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="matchday-side-panel" role="tabpanel">
        {sideTab === "events" ? (
          <ol className="match-timeline-log">
            {visibleLines.length === 0 ? (
              <li className="match-timeline-log-line is-muted">Anpfiff steht bevor.</li>
            ) : (
              visibleLines.map((line, index) => {
                const text = localizeMatchLine(line);
                const tone = eventLineTone(text);
                return (
                  <li
                    key={`${line.seq}-${index}`}
                    className={[
                      "match-timeline-log-line",
                      tone === "goal" ? "is-goal" : "",
                      line.voice === "color" ? "is-expert" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {line.voice === "color" ? (
                      <span className="match-voice-badge">Experte</span>
                    ) : null}
                    {text}
                  </li>
                );
              })
            )}
          </ol>
        ) : null}

        {sideTab === "stats" ? <MatchStats view={view} stats={frame.stats} compact /> : null}

        {sideTab === "lineups" ? (
          <div className="matchday-side-lineups">
            <Lineup view={view} frame={frame} />
          </div>
        ) : null}
      </div>

      {preMatch ? (
        <p className="matchday-fan-voice">
          <span className="match-voice-badge">Experte</span>
          {preMatch.colorLine}
        </p>
      ) : null}

      <EventsHud frame={frame} homeTeamId={view.home.id} />
    </aside>
  );
}
