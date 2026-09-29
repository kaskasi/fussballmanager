import type { MatchPresentationMode } from "./match-presentation-mode.ts";

type MatchPresentationToggleProps = {
  value: MatchPresentationMode;
  onChange: (mode: MatchPresentationMode) => void;
  disabled?: boolean;
};

export function MatchPresentationToggle({
  value,
  onChange,
  disabled = false,
}: MatchPresentationToggleProps) {
  return (
    <div
      className="segmented-control match-presentation-toggle"
      role="tablist"
      aria-label="Spieldarstellung"
    >
      <button
        type="button"
        role="tab"
        className={value === "events" ? "is-active" : undefined}
        aria-selected={value === "events"}
        disabled={disabled}
        onClick={() => onChange("events")}
      >
        Ereignisse
      </button>
      <button
        type="button"
        role="tab"
        className={value === "pitch" ? "is-active" : undefined}
        aria-selected={value === "pitch"}
        disabled={disabled}
        onClick={() => onChange("pitch")}
      >
        Spielfeld
      </button>
    </div>
  );
}
