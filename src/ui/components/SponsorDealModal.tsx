/**
 * WIREFRAME: PRD 14.7 / 11.10 — F6.5 Sponsor-Modal
 *
 * ┌─────────────────────────────────────┐
 * │ 🪧 Nordkurve A                      │
 * │ [🍺] [⚡] [🪵] [☕] [🛞] [⚙️] [🥬]   │
 * │ Laufzeit ──●── 2 Saisons            │
 * │ Wochenbetrag ──●── € 7k             │
 * │ ⚽ Torschützenkönig  🏆 Meister     │
 * │ 😤 Zu teuer. / Handschlag.          │
 * │ [Handschlag] [Abbrechen]            │
 * └─────────────────────────────────────┘
 */
import { useState } from "react";
import { formatClubCash } from "../../economy/club-finances.ts";
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
        icon: "🪧",
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

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <dialog
        className={
          occupied
            ? "negotiation-modal sponsor-deal-modal"
            : "negotiation-modal sponsor-deal-modal sponsor-deal-modal--hunger"
        }
        open
        aria-labelledby="sponsor-deal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="negotiation-head">
          <p className="eyebrow">{occupied ? "Laufender Vertrag" : "Werbefläche"}</p>
          <h2 id="sponsor-deal-title">
            {slot.kind === "shirt" ? "👕" : "🪧"} {slot.label}
          </h2>
          {brand ? <p className="stadium-sub">{brand.icon} {brand.name}</p> : null}
        </header>

        {occupied && deal ? (
          <>
            <ul className="sponsor-deal-facts">
              <li>
                <span>Laufzeit</span>
                <strong>
                  {deal.seasons} Saisons · noch {dealSeasonsLeft(deal, season)}
                </strong>
              </li>
              <li>
                <span>Wochenbetrag</span>
                <strong>{formatClubCash(deal.weeklyAmount)}</strong>
              </li>
              <li>
                <span>⚽ Torschützenkönig</span>
                <strong>{deal.bonusTopScorer ? "+€ 1 Mio." : "—"}</strong>
              </li>
              <li>
                <span>🏆 Meister</span>
                <strong>{deal.bonusLeagueTitle ? "+€ 1 Mio." : "—"}</strong>
              </li>
            </ul>
            <footer className="negotiation-actions">
              <button type="button" className="negotiation-btn" onClick={onClose}>
                Schließen
              </button>
            </footer>
          </>
        ) : (
          <>
            <div className="sponsor-brand-grid" role="group" aria-label="Sponsoren">
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
                    title={taken ? `${entry.name} ist schon vergeben` : entry.hint}
                    onClick={() => patch({ brandId: entry.id })}
                  >
                    <span aria-hidden="true">{entry.icon}</span>
                    {entry.name}
                  </button>
                );
              })}
            </div>
            {brand ? <p className="sponsor-brand-hint">{brand.hint}</p> : null}

            <label className="profile-talk-row">
              <span>
                Laufzeit <strong>{offer.seasons} Saisons</strong>
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
                Wochenbetrag <strong>{formatClubCash(offer.weeklyAmount)}</strong>
                <em>Deckel {formatClubCash(cap)}</em>
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
            <div className="sponsor-bonus-row" role="group" aria-label="Erfolgsstaffeln">
              <button
                type="button"
                className={offer.bonusTopScorer ? "sponsor-bonus is-on" : "sponsor-bonus"}
                onClick={() => patch({ bonusTopScorer: !offer.bonusTopScorer })}
              >
                <span aria-hidden="true">⚽</span>
                Torschützenkönig
                <strong>+{formatClubCash(SPONSOR_BONUS_PAYOUT)}</strong>
              </button>
              <button
                type="button"
                className={offer.bonusLeagueTitle ? "sponsor-bonus is-on" : "sponsor-bonus"}
                onClick={() => patch({ bonusLeagueTitle: !offer.bonusLeagueTitle })}
              >
                <span aria-hidden="true">🏆</span>
                Meister
                <strong>+{formatClubCash(SPONSOR_BONUS_PAYOUT)}</strong>
              </button>
            </div>
            <p className={verdict.accepted ? "sponsor-deal-verdict is-ok" : "sponsor-deal-verdict is-no"}>
              {verdict.accepted ? "🤝 " : "😤 "}
              {verdict.reason}
            </p>
            <footer className="negotiation-actions">
              <button
                type="button"
                className="negotiation-btn negotiation-btn-primary"
                disabled={!verdict.accepted}
                onClick={() => onSign(offer)}
              >
                Handschlag
              </button>
              <button type="button" className="negotiation-btn" onClick={onClose}>
                Abbrechen
              </button>
            </footer>
          </>
        )}
      </dialog>
    </div>
  );
}
