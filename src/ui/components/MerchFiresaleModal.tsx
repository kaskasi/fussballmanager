import { Flame } from "lucide-react";
import { formatClubCash } from "../../economy/club-finances.ts";
import {
  MERCH_SALE_DURATION_WEEKS,
  MERCH_SKU_LABEL,
  type MerchSkuId,
} from "../../economy/merchandising.ts";

const PRICE_STEP = 1;

export function MerchFiresaleModal({
  sku,
  normalRetail,
  salePrice,
  stock,
  maxStock,
  onSalePriceChange,
  onConfirm,
  onCancel,
}: {
  sku: MerchSkuId;
  normalRetail: number;
  salePrice: number;
  stock: number;
  maxStock: number;
  onSalePriceChange: (price: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const fillPct = maxStock > 0 ? Math.round((stock / maxStock) * 100) : 0;
  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <dialog
        className="negotiation-modal merch-firesale-modal"
        open
        aria-labelledby="merch-firesale-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="negotiation-head merch-firesale-modal-head">
          <p className="eyebrow merch-firesale-eyebrow">
            <Flame size={16} strokeWidth={2.4} aria-hidden />
            Fire Sale
          </p>
          <h2 id="merch-firesale-title">{MERCH_SKU_LABEL[sku]}</h2>
          <p className="negotiation-meta">
            Lager {stock} / {maxStock} ({fillPct}&nbsp;%)
          </p>
        </header>
        <p className="transfer-risk-copy">
          Überfülltes Lager — Artikel für <strong>{MERCH_SALE_DURATION_WEEKS} Wochen</strong> im Sale
          verkaufen? Danach gilt wieder der Normalpreis{" "}
          <strong>{formatClubCash(normalRetail)}</strong>.
        </p>
        <div className="merch-firesale-modal-price">
          <span className="merch-firesale-modal-price-label">Sale-VK</span>
          <div className="merch-price-stepper merch-price-stepper--hero">
            <button
              type="button"
              className="merch-step-btn"
              onClick={() => onSalePriceChange(Math.max(1, salePrice - PRICE_STEP))}
              aria-label="Sale-Preis senken"
            >
              −
            </button>
            <span className="merch-step-value">{formatClubCash(salePrice)}</span>
            <button
              type="button"
              className="merch-step-btn"
              onClick={() => onSalePriceChange(salePrice + PRICE_STEP)}
              aria-label="Sale-Preis erhöhen"
            >
              +
            </button>
          </div>
        </div>
        <footer className="negotiation-actions">
          <button type="button" className="ui-btn ui-btn--ghost" onClick={onCancel}>
            Abbrechen
          </button>
          <button type="button" className="ui-btn ui-btn--primary" onClick={onConfirm}>
            Sale starten
          </button>
        </footer>
      </dialog>
    </div>
  );
}
