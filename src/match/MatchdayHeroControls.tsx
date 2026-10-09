import { MatchPresentationToggle } from "./MatchPresentationToggle.tsx";
import type { MatchPresentationMode } from "./match-presentation-mode.ts";
import { CAREER_MATCH_SPEED_OPTIONS } from "./match-playback-speed.ts";

export function MatchdayHeroControls({
  presentationMode,
  onPresentationModeChange,
  speed,
  onSpeedChange,
  disabled,
}: {
  presentationMode: MatchPresentationMode;
  onPresentationModeChange: (mode: MatchPresentationMode) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="matchday-hero-controls segmented-control" aria-label="Match-Ansicht und Tempo">
      <MatchPresentationToggle
        value={presentationMode}
        onChange={onPresentationModeChange}
        disabled={disabled}
      />
      <span className="matchday-hero-controls-sep" aria-hidden="true" />
      <label className="matchday-hero-speed">
        <span className="matchday-hero-speed-label">Speed</span>
        <select
          value={speed}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
          disabled={disabled}
          aria-label="Simulationsgeschwindigkeit"
        >
          {CAREER_MATCH_SPEED_OPTIONS.map((rate) => (
            <option key={rate} value={rate}>
              {rate}×
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
