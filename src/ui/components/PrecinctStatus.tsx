/**
 * WIREFRAME: PRD 14.7 — Gelände-Status
 *
 * [palette] [grid] [👁 🛣️ 📣 🏃 💰]
 * Buff-Kacheln · Hunger gestrichelt · ⚠️ ohne Straßennetz (inkl. Arena)
 */
import {
  listPrecinctStatusEffects,
  PRECINCT_STATUS_GROUPS,
  precinctStatusTotals,
  type PrecinctStatusEffect,
} from "../../stadium/precinct-effects.ts";
import type { PrecinctBuilding, PrecinctState } from "../../stadium/precinct.ts";

function formatPct(rate: number): string {
  const pct = rate * 100;
  const body =
    Math.abs(pct - Math.round(pct)) < 0.05
      ? String(Math.round(pct))
      : pct.toFixed(1).replace(".", ",");
  return `+${body}%`;
}

export function PrecinctStatus({
  precinct,
  picked,
  selectedBuilding,
  onFocus,
}: {
  precinct: PrecinctState;
  picked: PrecinctBuilding | "street" | null;
  selectedBuilding?: PrecinctBuilding;
  onFocus: (building: PrecinctBuilding) => void;
}) {
  const effects = listPrecinctStatusEffects(precinct);
  const totals = precinctStatusTotals(precinct);
  const active = effects.filter((entry) => entry.tone === "buff").length;

  return (
    <aside className="stadium-precinct-status" aria-label="Gelände-Effekte">
      <p className="stadium-precinct-status-kicker">
        <span aria-hidden="true">✨</span> Effekte · {active}/{effects.length}
      </p>
      <div className="stadium-precinct-status-sheet" aria-label="Summe">
        <span title="Zuschauer-Füllung">👁 {formatPct(totals.fill)}</span>
        <span title="Fanbase pro Woche">📣 {formatFans(totals.fans)}</span>
        <span title="Training">🏃 ×{totals.training.toFixed(2).replace(".", ",")}</span>
        <span title="Imbiss und Merch pro Woche">💰 {formatMerch(totals.merch)}</span>
      </div>
      {PRECINCT_STATUS_GROUPS.map((group) => {
        const slots = effects.filter((entry) => entry.group === group.id);
        if (slots.length === 0) return null;
        return (
          <section key={group.id} className="stadium-precinct-status-group" aria-label={group.label}>
            <h3>
              <span aria-hidden="true">{group.icon}</span>
              {group.label}
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
      <span aria-hidden="true">{effect.icon}</span>
      {effect.tone === "warn" ? (
        <strong>⚠️</strong>
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
  return `+${delta.toFixed(2).replace(".", ",")}`;
}

function formatMerch(amount: number): string {
  if (amount <= 0) return "€0";
  if (amount >= 1000) return `€${Math.round(amount / 1000)}k`;
  return `€${amount}`;
}
