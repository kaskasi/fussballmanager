/**
 * WIREFRAME: PRD 14.7 / 11.10 — F6.5 Sponsor-Modal (tc modal, design.md §9.3)
 *
 * ┌─────────────────────────────────────┐
 * │ Werbefläche · Megaphone Nordkurve A │
 * │ (brand chips) · brand hint          │
 * │ Laufzeit ──●── 2 Saisons            │
 * │ Wochenbetrag ──●── € 7k · Maximum   │
 * │ [x] Torschützenkönig  [ ] Meister   │
 * │ Handshake/Angry verdict (callout)   │
 * │            [Abbrechen] [Handschlag] │
 * └─────────────────────────────────────┘
 */
import { useState } from "react";
import { useMobileNarrow } from "../hooks/use-mobile-narrow.ts";
import { Angry, Goal, Handshake, Megaphone, Minus, Plus, Shirt, Trophy } from "lucide-react";
import { formatClubCash } from "../../economy/club-finances.ts";
import { useT } from "../../i18n/react.ts";
import { ModalShell } from "./primitives/ModalShell.tsx";
import {
  dealSeasonsLeft,
  defaultSponsorOffer,
  evaluateSponsorOffer,
  SPONSOR_BONUS_PAYOUT,
  SPONSOR_BRANDS,
  SPONSOR_SEASON_MAX,
  SPONSOR_SEASON_MIN,
  sponsorAskMax,
  sponsorBrandById,
  sponsorBrandHint,
  sponsorSlotLabel,
  sponsorWeeklyCap,
  type SponsorDeal,
  type SponsorOffer,
  type SponsorSlot,
} from "../../stadium/sponsor-deals.ts";

const WEEKLY_MIN = 1_000;
const WEEKLY_STEP = 500;

export function SponsorDealModal({
  slot,
  deal,
  season,
  takenBrandKeys,
  onSign,
  onClose,
}: {
  slot: SponsorSlot;
  deal?: SponsorDeal;
  season: number;
  takenBrandKeys: ReadonlySet<string>;
  onSign: (offer: SponsorOffer) => void;
  onClose: () => void;
}) {
  const t = useT();
  const mobileNarrow = useMobileNarrow();
  const [offer, setOffer] = useState<SponsorOffer>(() => {
    const open = SPONSOR_BRANDS.find(
      (entry) => !takenBrandKeys.has(entry.id) && !takenBrandKeys.has(entry.name),
    );
    return defaultSponsorOffer(slot.id, open?.id);
  });
  const brand = deal
    ? (sponsorBrandById(deal.brandId ?? deal.brand) ?? {
        id: deal.brandId ?? deal.brand,
        name: deal.brand,
        icon: "",
        generosity: 1,
        preferSeasons: deal.seasons,
        bonusStance: "ok" as const,
        hint: "",
      })
    : sponsorBrandById(offer.brandId);
  const cap = sponsorWeeklyCap(slot.id, offer);
  const askMax = sponsorAskMax(slot.id, offer.seasons);
  const verdict = evaluateSponsorOffer(slot.id, offer);
  const occupied = deal != null;
  const SlotIcon = slot.kind === "shirt" ? Shirt : Megaphone;
  const bonusDisplay = `+${formatClubCash(SPONSOR_BONUS_PAYOUT)}`;
  const slotLabel = sponsorSlotLabel(slot);

  function patch(partial: Partial<SponsorOffer>) {
    setOffer((previous) => {
      const next = { ...previous, ...partial };
      const ceiling = sponsorAskMax(slot.id, next.seasons);
      return {
        ...next,
        weeklyAmount: Math.min(Math.max(WEEKLY_MIN, next.weeklyAmount), ceiling),
      };
    });
  }

  const footer = occupied ? (
    <button type="button" className="tc-btn" onClick={onClose}>
      {t("sponsor.modal.close")}
    </button>
  ) : (
    <>
      <button type="button" className="tc-btn tc-btn--ghost" onClick={onClose}>
        {t("sponsor.modal.cancel")}
      </button>
      <button
        type="button"
        className="tc-btn tc-btn--primary"
        disabled={!verdict.accepted}
        onClick={() => onSign(offer)}
      >
        <Handshake className="tc-icon" aria-hidden />
        {t("sponsor.modal.handshake")}
      </button>
    </>
  );

  return (
    <ModalShell
      variant="tc"
      ariaLabel={slotLabel}
      onClose={onClose}
      footer={footer}
      title={
        <>
          <span className="tc-label">
            {occupied ? t("sponsor.modal.eyebrowActive") : t("sponsor.modal.eyebrowEmpty")}
          </span>
          <h2 className="tc-modal__title tc-sponsor__title">
            <SlotIcon className="tc-icon" aria-hidden />
            {slotLabel}
          </h2>
          {brand ? <p className="tc-modal__sub">{brand.name}</p> : null}
        </>
      }
    >
      {occupied && deal ? (
        <dl className="tc-kv">
          <dt>{t("sponsor.modal.term")}</dt>
          <dd>
            {t("sponsor.modal.termRemaining", {
              seasons: deal.seasons,
              left: dealSeasonsLeft(deal, season),
            })}
          </dd>
          <dt>{t("sponsor.modal.weekly")}</dt>
          <dd>{formatClubCash(deal.weeklyAmount)}</dd>
          <dt className="tc-sponsor__fact">
            <Goal className="tc-icon" aria-hidden />
            {t("sponsor.modal.bonusTopScorer")}
          </dt>
          <dd>{deal.bonusTopScorer ? bonusDisplay : "—"}</dd>
          <dt className="tc-sponsor__fact">
            <Trophy className="tc-icon" aria-hidden />
            {t("sponsor.modal.bonusTitle")}
          </dt>
          <dd>{deal.bonusLeagueTitle ? bonusDisplay : "—"}</dd>
        </dl>
      ) : (
        <>
          <div className="tc-stack tc-sponsor__brands">
            <div className="tc-chips" role="group" aria-label={t("sponsor.modal.brandsAria")}>
              {SPONSOR_BRANDS.map((entry) => {
                const taken = takenBrandKeys.has(entry.id) || takenBrandKeys.has(entry.name);
                return (
                  <button
                    key={entry.id}
                    type="button"
                    className="tc-chip"
                    aria-pressed={offer.brandId === entry.id}
                    disabled={taken}
                    title={taken ? t("sponsor.modal.brandTaken", { name: entry.name }) : sponsorBrandHint(entry)}
                    onClick={() => patch({ brandId: entry.id })}
                  >
                    {entry.name}
                  </button>
                );
              })}
            </div>
            {brand ? <p className="tc-caption">{sponsorBrandHint(brand)}</p> : null}
          </div>

          <SponsorTermControl
            mobileNarrow={mobileNarrow}
            seasons={offer.seasons}
            onChange={(seasons) => patch({ seasons })}
          />
          <SponsorWeeklyControl
            mobileNarrow={mobileNarrow}
            weeklyAmount={offer.weeklyAmount}
            cap={cap}
            askMax={askMax}
            onChange={(weeklyAmount) => patch({ weeklyAmount })}
            onSetCap={() => patch({ weeklyAmount: cap })}
          />

          <ul className="tc-checks tc-sponsor__bonuses" aria-label={t("sponsor.modal.bonusAria")}>
            <li>
              <label className="tc-check">
                <input
                  type="checkbox"
                  checked={offer.bonusTopScorer}
                  onChange={(event) => patch({ bonusTopScorer: event.target.checked })}
                />
                <Goal className="tc-icon" aria-hidden />
                <span className="tc-check__copy">
                  <span className="tc-check__title">{t("sponsor.modal.bonusTopScorer")}</span>
                  <span className="tc-check__hint">{bonusDisplay}</span>
                </span>
              </label>
            </li>
            <li>
              <label className="tc-check">
                <input
                  type="checkbox"
                  checked={offer.bonusLeagueTitle}
                  onChange={(event) => patch({ bonusLeagueTitle: event.target.checked })}
                />
                <Trophy className="tc-icon" aria-hidden />
                <span className="tc-check__copy">
                  <span className="tc-check__title">{t("sponsor.modal.bonusTitle")}</span>
                  <span className="tc-check__hint">{bonusDisplay}</span>
                </span>
              </label>
            </li>
          </ul>

          <p className={verdict.accepted ? "tc-callout tc-callout--ok" : "tc-callout tc-callout--no"} role="status">
            {verdict.accepted ? (
              <Handshake className="tc-icon" aria-hidden />
            ) : (
              <Angry className="tc-icon" aria-hidden />
            )}{" "}
            {verdict.reason}
          </p>
        </>
      )}
    </ModalShell>
  );
}

function SponsorTermControl({
  mobileNarrow,
  seasons,
  onChange,
}: {
  mobileNarrow: boolean;
  seasons: number;
  onChange: (seasons: number) => void;
}) {
  const t = useT();
  const valueLabel = t("sponsor.modal.termValue", { seasons });
  if (mobileNarrow) {
    return (
      <div className="tc-sponsor__row">
        <span className="tc-label">{t("sponsor.modal.term")}</span>
        <div className="tc-stepper">
          <button
            type="button"
            className="tc-iconbtn"
            aria-label={t("sponsor.modal.termDecrease")}
            disabled={seasons <= SPONSOR_SEASON_MIN}
            onClick={() => onChange(seasons - 1)}
          >
            <Minus className="tc-icon" aria-hidden />
          </button>
          <output className="tc-stepper__value tc-sponsor__value">{valueLabel}</output>
          <button
            type="button"
            className="tc-iconbtn"
            aria-label={t("sponsor.modal.termIncrease")}
            disabled={seasons >= SPONSOR_SEASON_MAX}
            onClick={() => onChange(seasons + 1)}
          >
            <Plus className="tc-icon" aria-hidden />
          </button>
        </div>
      </div>
    );
  }
  return (
    <label className="tc-range">
      <span className="tc-range__head">
        <span>{t("sponsor.modal.term")}</span>
        <strong>{valueLabel}</strong>
      </span>
      <input
        type="range"
        min={SPONSOR_SEASON_MIN}
        max={SPONSOR_SEASON_MAX}
        step={1}
        value={seasons}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function SponsorWeeklyControl({
  mobileNarrow,
  weeklyAmount,
  cap,
  askMax,
  onChange,
  onSetCap,
}: {
  mobileNarrow: boolean;
  weeklyAmount: number;
  cap: number;
  askMax: number;
  onChange: (weeklyAmount: number) => void;
  onSetCap: () => void;
}) {
  const t = useT();
  const value = Math.min(askMax, weeklyAmount);
  const capLabel = t("sponsor.modal.weeklyCap", { cap: formatClubCash(cap) });
  const capButton = (
    <button type="button" className="tc-btn tc-btn--sm tc-btn--ghost" onClick={onSetCap}>
      {t("sponsor.modal.useCap", { cap: formatClubCash(cap) })}
    </button>
  );
  if (mobileNarrow) {
    return (
      <div className="tc-sponsor__row">
        <span className="tc-label">{t("sponsor.modal.weekly")}</span>
        <div className="tc-stepper">
          <button
            type="button"
            className="tc-iconbtn"
            aria-label={t("sponsor.modal.weeklyDecrease")}
            disabled={value <= WEEKLY_MIN}
            onClick={() => onChange(value - WEEKLY_STEP)}
          >
            <Minus className="tc-icon" aria-hidden />
          </button>
          <output className="tc-stepper__value tc-sponsor__value">{formatClubCash(value)}</output>
          <button
            type="button"
            className="tc-iconbtn"
            aria-label={t("sponsor.modal.weeklyIncrease")}
            disabled={value >= askMax}
            onClick={() => onChange(value + WEEKLY_STEP)}
          >
            <Plus className="tc-icon" aria-hidden />
          </button>
        </div>
        <span className="tc-caption">{capLabel}</span>
        {capButton}
      </div>
    );
  }
  return (
    <div className="tc-sponsor__weekly">
      <label className="tc-range">
        <span className="tc-range__head">
          <span>
            {t("sponsor.modal.weekly")} <span className="tc-caption">{capLabel}</span>
          </span>
          <strong>{formatClubCash(value)}</strong>
        </span>
        <input
          type="range"
          min={WEEKLY_MIN}
          max={askMax}
          step={WEEKLY_STEP}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </label>
      {capButton}
    </div>
  );
}
