/** WIREFRAME: PRD 14.10 — spatial HUD inside text commentary view. */
import { useEffect, useRef, useState } from "react";
import type { MatchClock, MatchViewFrame } from "@fussballmanager/shared";
import {
  ballZone,
  pitchLateralLabel,
  pitchThirdLabel,
  type PitchLateral,
  type PitchThird,
} from "./pitch-zone.ts";
import { PITCH_H, PITCH_W, SimplePitchMarkings } from "./pitch-markings.tsx";

const THIRDS: PitchThird[] = ["defensive", "middle", "attacking"];
const LATERALS: PitchLateral[] = ["left", "center", "right"];
const MARKER_SMOOTH_MS = 420;

function formatHudClock(clock: MatchClock): string {
  const seconds = String(clock.second).padStart(2, "0");
  if (clock.stoppageMinute > 0) {
    return `${clock.minute}+${clock.stoppageMinute}'${seconds}`;
  }
  return `${clock.minute}'${seconds}`;
}

function clampPct(value: number): number {
  return Math.min(96, Math.max(4, value));
}

function PitchPanelBackground() {
  return (
    <svg
      className="events-hud-panel-bg"
      viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <SimplePitchMarkings />
    </svg>
  );
}

type EventsHudProps = {
  frame: MatchViewFrame;
  homeTeamId: string;
};

export function EventsHud({ frame, homeTeamId }: EventsHudProps) {
  const { third, lateral } = ballZone(frame.ball, frame.possessionTeamId, homeTeamId);
  const targetX = clampPct(frame.ball.x);
  const targetY = clampPct(frame.ball.y);
  const [marker, setMarker] = useState({ x: targetX, y: targetY });
  const markerRef = useRef(marker);
  markerRef.current = marker;

  useEffect(() => {
    const from = markerRef.current;
    const to = { x: targetX, y: targetY };
    if (from.x === to.x && from.y === to.y) return;

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / MARKER_SMOOTH_MS);
      const ease = 1 - (1 - t) ** 3;
      setMarker({
        x: from.x + (to.x - from.x) * ease,
        y: from.y + (to.y - from.y) * ease,
      });
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetX, targetY, frame.seq]);

  return (
    <div className="events-hud" aria-label="Spielraum">
      <div className="events-hud-panels">
        <div className="events-hud-panel">
          <p className="events-hud-panel-title">Drittel</p>
          <div className="events-hud-thirds" role="img" aria-label={pitchThirdLabel(third)}>
            <PitchPanelBackground />
            {THIRDS.map((zone) => (
              <span
                key={zone}
                className={["events-hud-zone", zone === third ? "is-active" : ""]
                  .filter(Boolean)
                  .join(" ")}
              >
                {pitchThirdLabel(zone)}
              </span>
            ))}
            <span
              className="events-hud-marker events-hud-marker--third"
              style={{ left: `${marker.x}%` }}
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="events-hud-panel">
          <p className="events-hud-panel-title">Seite</p>
          <div className="events-hud-lateral" role="img" aria-label={pitchLateralLabel(lateral)}>
            <PitchPanelBackground />
            {LATERALS.map((zone) => (
              <span
                key={zone}
                className={["events-hud-zone", zone === lateral ? "is-active" : ""]
                  .filter(Boolean)
                  .join(" ")}
              >
                {pitchLateralLabel(zone)}
              </span>
            ))}
            <span
              className="events-hud-marker events-hud-marker--lateral"
              style={{ top: `${marker.y}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      <p className="events-hud-caption" aria-live="polite">
        {pitchThirdLabel(third)} · {pitchLateralLabel(lateral)}
        <span className="events-hud-caption-meta"> · {formatHudClock(frame.clock)}</span>
      </p>
    </div>
  );
}
