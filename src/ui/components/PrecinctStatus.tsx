/**
 * WIREFRAME: PRD 14.7 — Gelände-Status
 *
 * [palette] [grid] [Zuschauer · Stadt · Fans · Training · Kasse]
 * Buff-Kacheln · Hunger gestrichelt · Warnung ohne Straßennetz (inkl. Arena)
 */
import {
  listPrecinctStatusEffects,
  PRECINCT_STATUS_GROUPS,
  precinctStatusGroupLabel,
  precinctStatusTotals,
  type PrecinctStatusEffect,
} from "../../stadium/precinct-effects.ts";
import type { HospitalityPreview } from "../../stadium/hospitality.ts";
import type { PrecinctBuilding, PrecinctState } from "../../stadium/precinct.ts";
import {
  PrecinctBuildingIcon,
  PrecinctCashIcon,
  PrecinctFansIcon,
  PrecinctFillIcon,
  PrecinctGroupIcon,
  PrecinctSparkleIcon,
  PrecinctTrainingIcon,
  PrecinctWarnIcon,
} from "../icons/precinct-status-icons.tsx";
import { useT } from "../../i18n/react.ts";
import { formatDecimal } from "../../i18n/number-display.ts";
import { formatClubCash } from "../../economy/club-finances.ts";

function formatPct(rate: number): string {
  const pct = rate * 100;
  const body =
    Math.abs(pct - Math.round(pct)) < 0.05
      ? String(Math.round(pct))
      : formatDecimal(pct, 1);
  return `+${body}%`;
}

export function PrecinctStatus({
  precinct,
  picked,
  selectedBuilding,
  hospitalityPreview,
  layout = "stack",
  onFocus,
}: {
  precinct: PrecinctState;
  picked: PrecinctBuilding | "street" | null;
  selectedBuilding?: PrecinctBuilding;
  hospitalityPreview?: HospitalityPreview;
  layout?: "stack" | "rail";
  onFocus: (building: PrecinctBuilding) => void;
}) {
  const t = useT();
  const effects = listPrecinctStatusEffects(precinct, hospitalityPreview);
  const totals = precinctStatusTotals(precinct);
  const active = effects.filter((entry) => entry.tone === "buff").length;

  const rail = layout === "rail";

  return (
    <aside
      className={rail ? "stadium-precinct-status stadium-precinct-status--rail" : "stadium-precinct-status"}
      aria-label={t("precinct.status.aria")}
    >
      <div className="stadium-precinct-status-head">
        <p className="stadium-precinct-status-kicker">
          <PrecinctSparkleIcon size={14} aria-hidden="true" strokeWidth={2.5} />{" "}
          {t("precinct.status.effects")} ·{" "}
          {t("precinct.status.effectsCount", { active, total: effects.length })}
        </p>
        <div className="stadium-precinct-status-sheet" aria-label={t("precinct.status.totalAria")}>
          <span title={t("precinct.status.total.fill")}>
            <PrecinctFillIcon size={12} aria-hidden="true" strokeWidth={2.5} /> {formatPct(totals.fill)}
          </span>
          <span title={t("precinct.status.total.fans")}>
            <PrecinctFansIcon size={12} aria-hidden="true" strokeWidth={2.5} /> {formatFans(totals.fans)}
          </span>
          <span title={t("precinct.status.total.training")}>
            <PrecinctTrainingIcon size={12} aria-hidden="true" strokeWidth={2.5} /> ×
            {formatDecimal(totals.training, 2)}
          </span>
          <span title={t("precinct.status.total.merch")}>
            <PrecinctCashIcon size={12} aria-hidden="true" strokeWidth={2.5} /> {formatMerch(totals.merch)}
          </span>
        </div>
      </div>
      <div className={rail ? "stadium-precinct-status-columns" : "stadium-precinct-status-stack"}>
        {PRECINCT_STATUS_GROUPS.map((group) => {
          const slots = effects.filter((entry) => entry.group === group);
          if (slots.length === 0) return null;
          const groupLabel = precinctStatusGroupLabel(group);
          return (
            <section key={group} className="stadium-precinct-status-group" aria-label={groupLabel}>
              <h3 title={groupLabel} aria-label={groupLabel}>
                <PrecinctGroupIcon group={group} size={rail ? 15 : 13} />
                {rail ? null : groupLabel}
              </h3>
              <ul>
                {slots.map((effect) => (
                  <li key={effect.id}>
                    <StatusChip
                      effect={effect}
                      active={
                        effect.id !== "arena" &&
                        (picked === effect.id || selectedBuilding === effect.id)
                      }
                      onFocus={onFocus}
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </aside>
  );
}

function StatusChip({
  effect,
  active,
  onFocus,
}: {
  effect: PrecinctStatusEffect;
  active: boolean;
  onFocus: (building: PrecinctBuilding) => void;
}) {
  return (
    <button
      type="button"
      className={
        [
          "stadium-precinct-buff",
          `is-${effect.tone}`,
          active ? "is-active" : "",
        ]
          .filter(Boolean)
          .join(" ")
      }
      data-tooltip={effect.detail}
      aria-label={effect.detail}
      onClick={() => {
        if (effect.id === "arena") return;
        onFocus(effect.id);
      }}
    >
      <PrecinctBuildingIcon building={effect.id} size={14} />
      {effect.tone === "warn" ? (
        <strong>
          <PrecinctWarnIcon size={12} aria-hidden="true" strokeWidth={2.5} />
        </strong>
      ) : effect.magnitude ? (
        <strong>{effect.magnitude}</strong>
      ) : (
        <strong>—</strong>
      )}
    </button>
  );
}

function formatFans(delta: number): string {
  if (delta <= 0) return "+0";
  return `+${formatDecimal(delta, 2)}`;
}

function formatMerch(amount: number): string {
  return formatClubCash(Math.max(0, amount));
}
