/** WIREFRAME: docs/prd/design.md §9.15 — Live-Regeln (rechte Spalte) */
import { useCallback, useEffect, useRef, useState } from "react";
import type { MatchView, MatchViewFrame, MatchViewLine } from "@fussballmanager/shared";
import { EventsHud } from "./EventsHud.tsx";
import { Lineup } from "./Lineup.tsx";
import { MatchPresentationToggle } from "./MatchPresentationToggle.tsx";
import { MatchStats } from "./MatchStats.tsx";
import type { MatchPresentationMode } from "./match-presentation-mode.ts";
import { localizeMatchLine } from "./localize-match-line.ts";
import { eventLineTone } from "./match-presentation-mode.ts";
import { CAREER_MATCH_SPEED_OPTIONS } from "./match-playback-speed.ts";

type SideTab = "events" | "stats" | "lineups";

export function MatchdayLivePanel({
  view,
  frame,
  visibleLines,
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
  const eventLogRef = useRef<HTMLOListElement>(null);

  const handlePresentationChange = useCallback(
    (mode: MatchPresentationMode) => {
      onPresentationModeChange(mode);
      if (mode === "events") {
        setSideTab("events");
      }
    },
    [onPresentationModeChange],
  );

  const selectSideTab = useCallback(
    (id: SideTab) => {
      setSideTab(id);
      onPresentationModeChange(id === "events" ? "events" : "pitch");
    },
    [onPresentationModeChange],
  );

  useEffect(() => {
    if (sideTab !== "events") {
      return;
    }
    const list = eventLogRef.current;
    if (!list) {
      return;
    }
    list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [sideTab, visibleLines.length, visibleLines.at(-1)?.seq, visibleLines.at(-1)?.voice]);

  return (
    <aside
      className={[
        "matchday-cockpit-side",
        "game-panel",
        presentationMode === "events" ? "matchday-cockpit-side--stream-events" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Live-Regeln"
    >
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
          onChange={handlePresentationChange}
          disabled={disabled}
        />
        <label className="career-match-speed">
          Speed
          <select
            value={speed}
            onChange={(event) => onSpeedChange(Number(event.target.value))}
            disabled={disabled}
          >
            {CAREER_MATCH_SPEED_OPTIONS.map((rate) => (
              <option key={rate} value={rate}>
                {rate}×
              </option>
            ))}
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
            onClick={() => selectSideTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="matchday-side-panel" role="tabpanel">
        {sideTab === "events" ? (
          <ol ref={eventLogRef} className="match-timeline-log">
            {visibleLines.length === 0 ? (
              <li className="match-timeline-log-line is-muted">Anpfiff steht bevor.</li>
            ) : (
              visibleLines.map((line, index) => {
                const text = localizeMatchLine(line);
                const tone = eventLineTone(text);
                const isLatest = index === visibleLines.length - 1;
                return (
                  <li
                    key={`${line.seq}-${index}`}
                    className={[
                      "match-timeline-log-line",
                      tone === "goal" ? "is-goal" : "",
                      tone === "shot" ? "is-shot" : "",
                      tone === "danger" ? "is-danger" : "",
                      line.voice === "color" ? "is-expert" : "",
                      isLatest ? "is-latest" : "",
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

      <EventsHud frame={frame} homeTeamId={view.home.id} />
    </aside>
  );
}
