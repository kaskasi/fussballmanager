/** WIREFRAME: PRD 14.10 — compact spatial HUD for events-first matchday view. */
import { useEffect, useState } from "react";
import type { MatchClock, MatchViewFrame } from "@fussballmanager/shared";
import {
  ballZone,
  pitchLateralLabel,
  pitchThirdLabel,
  type PitchLateral,
  type PitchThird,
} from "./pitch-zone.ts";

const THIRDS: PitchThird[] = ["defensive", "middle", "attacking"];
const LATERALS: PitchLateral[] = ["left", "center", "right"];

const SHOT_HOLD_MS = 900;

function formatHudClock(clock: MatchClock): string {
  const seconds = String(clock.second).padStart(2, "0");
  if (clock.stoppageMinute > 0) {
    return `${clock.minute}+${clock.stoppageMinute}'${seconds}`;
  }
  return `${clock.minute}'${seconds}`;
}

type EventsHudProps = {
  frame: MatchViewFrame;
  homeTeamId: string;
};

function ShotIcon({ active }: { active: boolean }) {
  return (
    <div
      className={["events-hud-shot", active ? "is-active" : ""].filter(Boolean).join(" ")}
      aria-hidden={!active}
    >
      <svg viewBox="0 0 32 32" width="38" height="38" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
        <path
          d="M16 6 L20 14 L28 16 L20 18 L16 26 L12 18 L4 16 L12 14 Z"
          fill="currentColor"
        />
      </svg>
      <span className="events-hud-shot-label">Schuss</span>
    </div>
  );
}

export function EventsHud({ frame, homeTeamId }: EventsHudProps) {
  const { third, lateral } = ballZone(frame.ball, frame.possessionTeamId, homeTeamId);
  const [shotFlash, setShotFlash] = useState(false);

  useEffect(() => {
    if (frame.cue !== "shot") return;
    setShotFlash(true);
    const timer = window.setTimeout(() => setShotFlash(false), SHOT_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [frame.cue, frame.seq]);

  return (
    <div className="events-hud" aria-label="Spielraum">
      <div className="events-hud-panels">
        <div className="events-hud-panel">
          <p className="events-hud-panel-title">Drittel</p>
          <div className="events-hud-thirds" role="img" aria-label={pitchThirdLabel(third)}>
            {THIRDS.map((zone) => (
              <span
                key={zone}
                className={[
                  "events-hud-zone",
                  zone === third ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {pitchThirdLabel(zone)}
              </span>
            ))}
            <span
              className="events-hud-marker events-hud-marker--third"
              style={{ left: `${Math.min(96, Math.max(4, frame.ball.x))}%` }}
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="events-hud-panel">
          <p className="events-hud-panel-title">Seite</p>
          <div className="events-hud-lateral" role="img" aria-label={pitchLateralLabel(lateral)}>
            {LATERALS.map((zone) => (
              <span
                key={zone}
                className={[
                  "events-hud-zone",
                  zone === lateral ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {pitchLateralLabel(zone)}
              </span>
            ))}
            <span
              className="events-hud-marker events-hud-marker--lateral"
              style={{ top: `${Math.min(96, Math.max(4, frame.ball.y))}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      <ShotIcon active={shotFlash} />

      <p className="events-hud-caption" aria-live="polite">
        {pitchThirdLabel(third)} · {pitchLateralLabel(lateral)}
        <span className="events-hud-caption-meta">
          {" "}
          · {formatHudClock(frame.clock)}
        </span>
      </p>
    </div>
  );
}
