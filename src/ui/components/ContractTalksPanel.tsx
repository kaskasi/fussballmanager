import { Angry, Handshake, RefreshCw, Star, Timer } from "lucide-react";
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
import { formatSeasonLabel } from "../../sim/season-label.ts";
import { contractUntilSeasonAfterTerm } from "../../transfers/contract-until-season.ts";
import { formatEuroWhole } from "../../i18n/number-display.ts";
import { useT } from "../../i18n/react.ts";

const ROLE_OPTIONS: { id: MinutesPromise; Icon: typeof Star; labelKey: string }[] = [
  { id: "rotation", Icon: RefreshCw, labelKey: "contract.talk.role.rotation" },
  { id: "starter", Icon: Star, labelKey: "contract.talk.role.starter" },
];

/**
 * Contract offer form (PRD 05.4): wage, term, appearance bonus, minutes guarantee and starting place.
 * Profile: inside the tc modal (`inModal`). Transfers: inline in the negotiation (`compactTitle`).
 */
export function ContractTalksPanel({
  player,
  season,
  offer,
  wageHeadroomWeekly,
  onChange,
  onSubmit,
  onCancel,
  compactTitle,
  inModal,
}: {
  player: Player;
  season: number;
  offer: ContractOffer;
  wageHeadroomWeekly?: number;
  onChange: (offer: ContractOffer) => void;
  onSubmit: () => void;
  onCancel: () => void;
  compactTitle?: boolean;
  /** The surrounding modal already shows the player's name. */
  inModal?: boolean;
}) {
  const t = useT();
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
  const expirySeason = contractUntilSeasonAfterTerm(season, offer.termYears);

  function setPromise(minutesPromise: MinutesPromise) {
    const nextAsk = playerContractAsk(player, season, minutesPromise);
    onChange({
      ...offer,
      minutesPromise,
      wageWeekly: Math.max(offer.wageWeekly, nextAsk.wageWeekly),
    });
  }

  return (
    <section className="tc-talk" aria-label={t("contract.talk.aria", { name: formatPlayerName(player) })}>
      {inModal ? null : compactTitle ? (
        <h3 className="tc-talk__title">{t("contract.talk.compactTitle", { name: formatPlayerName(player) })}</h3>
      ) : (
        <header>
          <span className="tc-label">{t("contract.talk.eyebrow")}</span>
          <h2 className="tc-talk__title">{formatPlayerName(player)}</h2>
        </header>
      )}
      {revealed ? <p className="tc-caption">{ask.advisorHint}</p> : null}

      <label className="tc-range">
        <span className="tc-range__head">
          <span>{t("contract.talk.wage")}</span>
          <strong>{t("contract.talk.perWeek", { amount: formatEuroWhole(offer.wageWeekly) })}</strong>
        </span>
        <input
          type="range"
          min={bounds.wageMin}
          max={bounds.wageMax}
          step={wageStep}
          value={Math.min(bounds.wageMax, Math.max(bounds.wageMin, offer.wageWeekly))}
          onChange={(event) => onChange({ ...offer, wageWeekly: Number(event.target.value) })}
        />
      </label>
      <label className="tc-range">
        <span className="tc-range__head">
          <span>{t("contract.talk.term")}</span>
          <strong>
            {t("contract.talk.termValue", { years: offer.termYears, season: formatSeasonLabel(expirySeason) })}
          </strong>
        </span>
        <input
          type="range"
          min={bounds.termMin}
          max={bounds.termMax}
          step={1}
          value={offer.termYears}
          onChange={(event) => onChange({ ...offer, termYears: Number(event.target.value) })}
        />
      </label>
      <label className="tc-range">
        <span className="tc-range__head">
          <span>{t("contract.talk.bonus")}</span>
          <strong>{formatEuroWhole(offer.bonusAppearance)}</strong>
        </span>
        <input
          type="range"
          min={bounds.bonusMin}
          max={bounds.bonusMax}
          step={bounds.bonusMax > 80 ? 5 : 1}
          value={Math.min(bounds.bonusMax, Math.max(bounds.bonusMin, offer.bonusAppearance))}
          onChange={(event) => onChange({ ...offer, bonusAppearance: Number(event.target.value) })}
        />
      </label>

      <div className="tc-talk__clauses">
        <div className="tc-talk__clause">
          <span className="tc-label" id="contract-talk-minutes">
            {t("contract.talk.minutes")}
          </span>
          <div className="tc-chips" role="group" aria-labelledby="contract-talk-minutes">
            <button
              type="button"
              className="tc-chip tc-chip--icon"
              aria-pressed={minutesOn}
              onClick={() => setPromise(minutesOn ? "none" : "rotation")}
            >
              <Timer className="tc-icon" aria-hidden="true" />
              {minutesOn ? t("contract.talk.on") : t("contract.talk.off")}
            </button>
          </div>
        </div>
        <div className="tc-talk__clause">
          <span className="tc-label" id="contract-talk-role">
            {t("contract.talk.role")}
          </span>
          <div className="tc-chips" role="group" aria-labelledby="contract-talk-role">
            {ROLE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className="tc-chip tc-chip--icon"
                aria-pressed={offer.minutesPromise === option.id}
                disabled={!minutesOn}
                onClick={() => setPromise(option.id)}
              >
                <option.Icon className="tc-icon" aria-hidden="true" />
                {t(option.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {revealed ? (
        <p className={verdict.accepted ? "tc-talk__verdict tc-talk__verdict--ok" : "tc-talk__verdict tc-talk__verdict--no"}>
          {verdict.accepted ? (
            <Handshake className="tc-icon" aria-hidden="true" />
          ) : (
            <Angry className="tc-icon" aria-hidden="true" />
          )}
          {verdict.reason}
        </p>
      ) : null}

      {wageHeadroomWeekly !== undefined ? (
        <p className={fitsBudget ? "tc-caption" : "tc-talk__verdict tc-talk__verdict--no"}>
          {fitsBudget
            ? t("contract.talk.cap", { amount: formatClubCash(Math.max(0, wageHeadroomWeekly)) })
            : t("contract.talk.capExceeded", { amount: formatClubCash(Math.max(0, wageHeadroomWeekly)) })}
        </p>
      ) : null}

      <div className="tc-talk__actions">
        <button type="button" className="tc-btn tc-btn--ghost" onClick={onCancel}>
          {t("contract.talk.cancel")}
        </button>
        <button type="button" className="tc-btn tc-btn--primary" onClick={onSubmit} disabled={!fitsBudget}>
          {t("contract.talk.submit")}
        </button>
      </div>
    </section>
  );
}
