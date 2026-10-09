import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useT } from "../i18n/react.ts";
import { MatchPresentationToggle } from "./MatchPresentationToggle.tsx";
import type { MatchPresentationMode } from "./match-presentation-mode.ts";
import { CAREER_MATCH_SPEED_OPTIONS } from "./match-playback-speed.ts";

export function MatchdayHeroControls({
  presentationMode,
  onPresentationModeChange,
  speed,
  onSpeedChange,
  playing,
  onStepBack,
  onStepForward,
  onPlayPause,
  stepBackDisabled,
  stepForwardDisabled,
  disabled,
}: {
  presentationMode: MatchPresentationMode;
  onPresentationModeChange: (mode: MatchPresentationMode) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  playing: boolean;
  onStepBack: () => void;
  onStepForward: () => void;
  onPlayPause: () => void;
  stepBackDisabled?: boolean;
  stepForwardDisabled?: boolean;
  disabled?: boolean;
}) {
  const t = useT();
  const transportDisabled = disabled ?? false;

  return (
    <div className="matchday-hero-controls segmented-control" aria-label="Match-Ansicht und Tempo">
      <MatchPresentationToggle
        value={presentationMode}
        onChange={onPresentationModeChange}
        disabled={disabled}
      />
      <span className="matchday-hero-controls-sep" aria-hidden="true" />
      <div className="matchday-hero-playback" role="group" aria-label={t("match.career.debug.transport")}>
        <button
          type="button"
          className="matchday-hero-playback-btn"
          onClick={onStepBack}
          disabled={transportDisabled || stepBackDisabled}
          aria-label={t("match.career.debug.stepBack")}
        >
          <ChevronLeft size={18} strokeWidth={2.5} aria-hidden />
        </button>
        <button
          type="button"
          className="matchday-hero-playback-btn"
          onClick={onPlayPause}
          disabled={transportDisabled}
          aria-label={playing ? t("match.career.nav.pauseSim") : t("match.career.nav.resumeSim")}
        >
          {playing ? (
            <Pause size={18} strokeWidth={2.5} aria-hidden />
          ) : (
            <Play size={18} strokeWidth={2.5} aria-hidden />
          )}
        </button>
        <button
          type="button"
          className="matchday-hero-playback-btn"
          onClick={onStepForward}
          disabled={transportDisabled || stepForwardDisabled}
          aria-label={t("match.career.debug.stepForward")}
        >
          <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
        </button>
      </div>
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
