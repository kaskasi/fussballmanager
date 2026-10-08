/**
 * WIREFRAME: PRD 14.7 / 11.10 — F6.5 Sponsor-Modal
 *
 * ┌─────────────────────────────────────┐
 * │ Megaphone · Nordkurve A             │
 * │ [brand initials] …                  │
 * │ Laufzeit ──●── 2 Saisons            │
 * │ Wochenbetrag ──●── € 7k             │
 * │ Goal Top scorer · Trophy Meister    │
 * │ Angry/Handshake verdict             │
 * │ [Handschlag] [Abbrechen]            │
 * └─────────────────────────────────────┘
 */
import { useState } from "react";
import { Angry, Goal, Handshake, Megaphone, Shirt, Trophy } from "lucide-react";
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
  sponsorWeeklyCap,
  type SponsorDeal,
  type SponsorOffer,
  type SponsorSlot,
} from "../../stadium/sponsor-deals.ts";

function brandInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

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
  const bonusDisplay = formatClubCash(SPONSOR_BONUS_PAYOUT);

  function patch(partial: Partial<SponsorOffer>) {
    setOffer((previous) => {
      const next = { ...previous, ...partial };
      const ceiling = sponsorAskMax(slot.id, next.seasons);
      return {
        ...next,
        weeklyAmount: Math.min(Math.max(1_000, next.weeklyAmount), ceiling),
      };
    });
  }

  const panelClass = occupied
    ? "negotiation-modal sponsor-deal-modal"
    : "negotiation-modal sponsor-deal-modal sponsor-deal-modal--hunger";

  return (
    <ModalShell
      ariaLabel={slot.label}
      onClose={onClose}
      showCloseButton={false}
      panelClassName={panelClass}
      bodyClassName=""
    >
        <header className="negotiation-head">
          <p className="eyebrow">
            {occupied ? t("sponsor.modal.eyebrowActive") : t("sponsor.modal.eyebrowEmpty")}
          </p>
          <h2 id="sponsor-deal-title" className="sponsor-deal-title">
            <SlotIcon size={20} strokeWidth={2.5} aria-hidden className="sponsor-deal-title-icon" />
            {slot.label}
          </h2>
          {brand ? <p className="stadium-sub">{brand.name}</p> : null}
        </header>

        {occupied && deal ? (
          <>
            <ul className="sponsor-deal-facts">
              <li>
                <span>{t("sponsor.modal.term")}</span>
                <strong>
                  {t("sponsor.modal.termRemaining", {
                    seasons: deal.seasons,
                    left: dealSeasonsLeft(deal, season),
                  })}
                </strong>
              </li>
              <li>
                <span>{t("sponsor.modal.weekly")}</span>
                <strong>{formatClubCash(deal.weeklyAmount)}</strong>
              </li>
              <li>
                <span className="sponsor-deal-fact-label">
                  <Goal size={14} strokeWidth={2.5} aria-hidden />
                  {t("sponsor.modal.bonusTopScorer")}
                </span>
                <strong>{deal.bonusTopScorer ? `+${bonusDisplay}` : "—"}</strong>
              </li>
              <li>
                <span className="sponsor-deal-fact-label">
                  <Trophy size={14} strokeWidth={2.5} aria-hidden />
                  {t("sponsor.modal.bonusTitle")}
                </span>
                <strong>{deal.bonusLeagueTitle ? `+${bonusDisplay}` : "—"}</strong>
              </li>
            </ul>
            <footer className="negotiation-actions">
              <button type="button" className="negotiation-btn" onClick={onClose}>
                {t("sponsor.modal.close")}
              </button>
            </footer>
          </>
        ) : (
          <>
            <div className="sponsor-brand-grid" role="group" aria-label={t("sponsor.modal.brandsAria")}>
              {SPONSOR_BRANDS.map((entry) => {
                const taken = takenBrandKeys.has(entry.id) || takenBrandKeys.has(entry.name);
                return (
                  <button
                    key={entry.id}
                    type="button"
                    className={
                      offer.brandId === entry.id
                        ? "sponsor-brand is-on"
                        : taken
                          ? "sponsor-brand is-taken"
                          : "sponsor-brand"
                    }
                    disabled={taken}
                    title={
                      taken
                        ? t("sponsor.modal.brandTaken", { name: entry.name })
                        : entry.hint
                    }
                    onClick={() => patch({ brandId: entry.id })}
                  >
                    <span className="sponsor-brand-mark" aria-hidden="true">
                      {brandInitial(entry.name)}
                    </span>
                    {entry.name}
                  </button>
                );
              })}
            </div>
            {brand ? <p className="sponsor-brand-hint">{brand.hint}</p> : null}

            <label className="profile-talk-row">
              <span>
                {t("sponsor.modal.term")}{" "}
                <strong>{t("sponsor.modal.termValue", { seasons: offer.seasons })}</strong>
              </span>
              <input
                type="range"
                min={SPONSOR_SEASON_MIN}
                max={SPONSOR_SEASON_MAX}
                step={1}
                value={offer.seasons}
                onChange={(event) => patch({ seasons: Number(event.target.value) })}
              />
            </label>
            <label className="profile-talk-row">
              <span>
                {t("sponsor.modal.weekly")} <strong>{formatClubCash(offer.weeklyAmount)}</strong>
                <em>{t("sponsor.modal.weeklyCap", { cap: formatClubCash(cap) })}</em>
              </span>
              <input
                type="range"
                min={1_000}
                max={askMax}
                step={500}
                value={Math.min(askMax, offer.weeklyAmount)}
                onChange={(event) => patch({ weeklyAmount: Number(event.target.value) })}
              />
            </label>
            <div className="sponsor-bonus-row" role="group" aria-label={t("sponsor.modal.bonusAria")}>
              <button
                type="button"
                className={offer.bonusTopScorer ? "sponsor-bonus is-on" : "sponsor-bonus"}
                onClick={() => patch({ bonusTopScorer: !offer.bonusTopScorer })}
              >
                <Goal size={16} aria-hidden strokeWidth={2.5} />
                {t("sponsor.modal.bonusTopScorer")}
                <strong>+{bonusDisplay}</strong>
              </button>
              <button
                type="button"
                className={offer.bonusLeagueTitle ? "sponsor-bonus is-on" : "sponsor-bonus"}
                onClick={() => patch({ bonusLeagueTitle: !offer.bonusLeagueTitle })}
              >
                <Trophy size={16} aria-hidden strokeWidth={2.5} />
                {t("sponsor.modal.bonusTitle")}
                <strong>+{bonusDisplay}</strong>
              </button>
            </div>
            <p className={verdict.accepted ? "sponsor-deal-verdict is-ok" : "sponsor-deal-verdict is-no"}>
              {verdict.accepted ? (
                <Handshake size={16} aria-hidden strokeWidth={2.5} className="negotiation-verdict-icon" />
              ) : (
                <Angry size={16} aria-hidden strokeWidth={2.5} className="negotiation-verdict-icon" />
              )}{" "}
              {verdict.reason}
            </p>
            <footer className="negotiation-actions">
              <button
                type="button"
                className="negotiation-btn negotiation-btn-primary"
                disabled={!verdict.accepted}
                onClick={() => onSign(offer)}
              >
                {t("sponsor.modal.handshake")}
              </button>
              <button type="button" className="negotiation-btn" onClick={onClose}>
                {t("sponsor.modal.cancel")}
              </button>
            </footer>
          </>
        )}
    </ModalShell>
  );
}
