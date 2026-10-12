import { useT } from "../i18n/react.ts";
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
  const t = useT();

  return (
    <div
      className="match-presentation-toggle"
      role="tablist"
      aria-label={t("match.presentation.tabsAria")}
    >
      <button
        type="button"
        role="tab"
        className={value === "pitch" ? "is-active" : undefined}
        aria-selected={value === "pitch"}
        disabled={disabled}
        onClick={() => onChange("pitch")}
      >
        {t("match.presentation.pitch")}
      </button>
      <button
        type="button"
        role="tab"
        className={value === "events" ? "is-active" : undefined}
        aria-selected={value === "events"}
        disabled={disabled}
        onClick={() => onChange("events")}
      >
        {t("match.presentation.commentary")}
      </button>
    </div>
  );
}
