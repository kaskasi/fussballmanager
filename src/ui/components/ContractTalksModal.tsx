/**
 * WIREFRAME: PRD 14.3 / 05.4 — Vertragsgespräch-Modal
 *
 * ┌─────────────────────────────────────┐
 * │ ✍️ Vertrag · Name                   │
 * │ Will vor allem ein faires Gehalt.   │
 * │ Gehalt ──●── € 80/Wo                │
 * │ Jahre ──●── 3                       │
 * │ Bonus ──●── € 25                    │
 * │ ⏱️ Minuten  🔄 Rotation  ⭐ Stamm   │
 * │ [Anbieten] [Abbrechen]              │
 * └─────────────────────────────────────┘
 */
import { Angry, Handshake } from "lucide-react";
import { formatClubCash } from "../../economy/club-finances.ts";
import {
  contractTalkBounds,
  describeContractOffer,
  playerContractAsk,
  wageDeltaFitsBudget,
  type ContractOffer,
  type MinutesPromise,
} from "../../transfers/contract-talks.ts";
import type { Player } from "../../types/player.ts";
import { formatPlayerName } from "../../types/player-display.ts";

const ROLE_OPTIONS: { id: MinutesPromise; icon: string; label: string }[] = [
  { id: "none", icon: "🪑", label: "Keine" },
  { id: "rotation", icon: "🔄", label: "Rotation" },
  { id: "starter", icon: "⭐", label: "Stammplatz" },
];

export function ContractTalksModal({
  player,
  season,
  offer,
  wageHeadroomWeekly,
  onChange,
  onSubmit,
  onCancel,
}: {
  player: Player;
  season: number;
  offer: ContractOffer;
  wageHeadroomWeekly?: number;
  onChange: (offer: ContractOffer) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const ask = playerContractAsk(player, season, offer.minutesPromise);
  const bounds = contractTalkBounds(player, season, offer.minutesPromise);
  const verdict = describeContractOffer(player, season, offer);
  const revealed = (player.state.contract_failed_offers ?? 0) > 0;
  const currentWage = player.contract?.wage_weekly ?? 0;
  const fitsBudget =
    wageHeadroomWeekly === undefined ||
    wageDeltaFitsBudget(wageHeadroomWeekly, currentWage, offer.wageWeekly);
  const wageStep = bounds.wageMax - bounds.wageMin > 400 ? 5 : 1;
  const minutesOn = offer.minutesPromise !== "none";

  function setPromise(minutesPromise: MinutesPromise) {
    const nextAsk = playerContractAsk(player, season, minutesPromise);
    onChange({
      ...offer,
      minutesPromise,
      wageWeekly: Math.max(offer.wageWeekly, nextAsk.wageWeekly),
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <dialog
        className="negotiation-modal contract-talk-modal"
        open
        aria-labelledby="contract-talk-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="negotiation-head">
          <p className="eyebrow">Vertragsgespräch</p>
          <h2 id="contract-talk-title">✍️ {formatPlayerName(player)}</h2>
        </header>
        {revealed ? <p className="profile-talk-hint">{ask.advisorHint}</p> : null}

        <label className="profile-talk-row">
          <span>
            Gehalt <strong>€ {offer.wageWeekly.toLocaleString("de-DE")}/Wo</strong>
          </span>
          <input
            type="range"
            min={bounds.wageMin}
            max={bounds.wageMax}
            step={wageStep}
            value={Math.min(bounds.wageMax, Math.max(bounds.wageMin, offer.wageWeekly))}
            onChange={(event) =>
              onChange({ ...offer, wageWeekly: Number(event.target.value) })
            }
          />
        </label>
        <label className="profile-talk-row">
          <span>
            Jahre <strong>{offer.termYears}</strong>
          </span>
          <input
            type="range"
            min={bounds.termMin}
            max={bounds.termMax}
            step={1}
            value={offer.termYears}
            onChange={(event) =>
              onChange({ ...offer, termYears: Number(event.target.value) })
            }
          />
        </label>
        <label className="profile-talk-row">
          <span>
            Einsatzbonus <strong>€ {offer.bonusAppearance.toLocaleString("de-DE")}</strong>
          </span>
          <input
            type="range"
            min={bounds.bonusMin}
            max={bounds.bonusMax}
            step={bounds.bonusMax > 80 ? 5 : 1}
            value={Math.min(bounds.bonusMax, Math.max(bounds.bonusMin, offer.bonusAppearance))}
            onChange={(event) =>
              onChange({ ...offer, bonusAppearance: Number(event.target.value) })
            }
          />
        </label>

        <div className="contract-talk-clause">
          <p className="profile-section-label">Minuten-Garantie</p>
          <div className="contract-talk-toggle" role="group" aria-label="Minuten-Garantie">
            <button
              type="button"
              className={minutesOn ? "is-active" : undefined}
              aria-pressed={minutesOn}
              onClick={() => setPromise(minutesOn ? "none" : "rotation")}
            >
              ⏱️ {minutesOn ? "An" : "Aus"}
            </button>
          </div>
        </div>
        <div className="contract-talk-clause">
          <p className="profile-section-label">Startplatz</p>
          <div className="contract-talk-roles" role="group" aria-label="Startplatz">
            {ROLE_OPTIONS.filter((option) => option.id !== "none").map((option) => (
              <button
                key={option.id}
                type="button"
                className={offer.minutesPromise === option.id ? "is-active" : undefined}
                aria-pressed={offer.minutesPromise === option.id}
                disabled={!minutesOn}
                onClick={() => setPromise(option.id)}
              >
                {option.icon} {option.label}
              </button>
            ))}
          </div>
        </div>

        {revealed ? (
          <p className={verdict.accepted ? "sponsor-deal-verdict is-ok" : "sponsor-deal-verdict is-no"}>
            {verdict.accepted ? (
              <Handshake size={16} aria-hidden="true" strokeWidth={2.5} className="negotiation-verdict-icon" />
            ) : (
              <Angry size={16} aria-hidden="true" strokeWidth={2.5} className="negotiation-verdict-icon" />
            )}{" "}
            {verdict.reason}
          </p>
        ) : null}

        {wageHeadroomWeekly !== undefined ? (
          <p className={fitsBudget ? "profile-talk-hint" : "profile-talk-warn"}>
            Cap {formatClubCash(Math.max(0, wageHeadroomWeekly))}/Wo frei
            {fitsBudget ? "" : " — Angebot zu hoch"}
          </p>
        ) : null}

        <div className="negotiation-actions">
          <button
            type="button"
            className="negotiation-btn negotiation-btn-primary"
            onClick={onSubmit}
            disabled={!fitsBudget}
          >
            Anbieten
          </button>
          <button type="button" className="negotiation-btn negotiation-btn-muted" onClick={onCancel}>
            Abbrechen
          </button>
        </div>
      </dialog>
    </div>
  );
}
