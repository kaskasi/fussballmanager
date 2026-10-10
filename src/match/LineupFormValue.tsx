import {
  lineupFormFromCareer,
  lineupFormFromEngineForm,
  type LineupStatusTone,
} from "./lineup-player-status.ts";
import { useT } from "../i18n/react.ts";

export function LineupFormValue({
  careerForm,
  engineForm,
  compact = false,
}: {
  /** Career scale −4…+4 */
  careerForm?: number;
  /** Engine 0–100 when no career player */
  engineForm?: number;
  compact?: boolean;
}) {
  const t = useT();
  const info =
    careerForm != null
      ? lineupFormFromCareer(careerForm)
      : lineupFormFromEngineForm(engineForm ?? 50);
  const title = t("match.lineup.formValueTitle", { value: info.label });

  return (
    <span
      className={`lineup-form-value is-${info.tone as Exclude<LineupStatusTone, "empty">}${compact ? " is-compact" : ""}`}
      title={title}
      aria-label={title}
    >
      {info.label}
    </span>
  );
}
