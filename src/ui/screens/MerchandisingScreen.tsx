import { useMemo, useState } from "react";
import { useT } from "../../i18n/react.ts";
import { Flame, Package } from "lucide-react";
import { MERCH_SKU_ICON } from "../merch/merch-sku-icons.ts";
import type { Player } from "../../types/player.ts";
import { formatClubCash, type ClubFinances } from "../../economy/club-finances.ts";
import type { ClubStadium } from "../../stadium/club-stadium.ts";
import { MerchFiresaleModal } from "../components/MerchFiresaleModal.tsx";
import { MerchSaleSummaryModal } from "../components/MerchSaleSummaryModal.tsx";
import { MerchEinkaufInboundPanel } from "../components/MerchEinkaufInboundPanel.tsx";
import { MerchEinkaufStockOverview } from "../components/MerchEinkaufStockOverview.tsx";
import { MerchVendorMarketTable } from "../components/MerchVendorMarketTable.tsx";
import { MerchVendorStrip, type MerchVendorFilter } from "../components/MerchVendorStrip.tsx";
import { MerchOnDemandPanel } from "../components/MerchOnDemandPanel.tsx";
import { FmScreenTab, FmScreenTabBar } from "../components/FmScreenTabBar.tsx";
import {
  activeMerchSaleSkus,
  customOrderQuote,
  customOrderUnitCost,
  bestMarketBulkUnitCost,
  dismissMerchSaleSummaries,
  isExpressPromoWeek,
  EXPRESS_PROMO_DISCOUNT,
  vendorRelationTier,
  JERSEY_REVENUE_SHARE,
  isMerchOverCapacity,
  isMerchSkuOnSale,
  MERCH_SKU_IDS,
  MERCH_OVERCAP_DISCARD_AFTER_WEEKS,
  MERCH_SKU_LABEL,
  merchSaleWeeksRemaining,
  merchSkuNormalRetail,
  fanshopMerchLevel,
  jerseySalesWeights,
  jerseySellersWithWeekly,
  merchMaxStockForSku,
  merchOnDemandQtyBySku,
  merchStockFillRatio,
  normalizeClubMerchandising,
  suggestedMerchSalePrice,
  weeklyMerchandisingEconomics,
  type MerchSkuId,
} from "../../economy/merchandising.ts";
import { merchCareerWeekIndex } from "../../economy/merchandising-market.ts";
import { weekCommerceOccupancy } from "../../stadium/matchday-commerce.ts";
import { COACH_TARGET } from "../../tutorial/tutorial-targets.ts";

type MerchTab = "preise" | "einkauf";

const OTHER_SKUS = MERCH_SKU_IDS.filter((id) => id !== "trikots");

type JerseySellerRow = {
  playerId: string;
  name: string;
  share: number;
  weeklyEur: number;
};

/**
 * WIREFRAME: docs/prd/design.md §9.x — Merchandising (DIN-A4 Preis-Grid)
 */
export function MerchandisingScreen({
  stadium,
  players,
  clubId,
  finances,
  season,
  week,
  weekday,
  masterSeed,
  isHomeMatchWeek,
  onMerchandisingChange,
  onRequestBulkPurchase,
  onRequestOnDemand,
  onStartMerchSale,
}: {
  stadium: ClubStadium;
  players: readonly Player[];
  clubId: string;
  finances: ClubFinances;
  season: number;
  week: number;
  weekday: number;
  masterSeed: number;
  isHomeMatchWeek: boolean;
  onMerchandisingChange: (next: ClubStadium) => void;
  onRequestBulkPurchase: (offerId: string) => void;
  onRequestOnDemand: (sku: MerchSkuId, qty: number) => void;
  onStartMerchSale: (sku: MerchSkuId, salePrice: number) => void;
}) {
  const t = useT();
  const [tab, setTab] = useState<MerchTab>("preise");
  const [customSku, setCustomSku] = useState<MerchSkuId>("trikots");
  const [customQty, setCustomQty] = useState(120);
  const [firesaleSku, setFiresaleSku] = useState<MerchSkuId | null>(null);
  const [modalSalePrice, setModalSalePrice] = useState(1);
  const [vendorFilter, setVendorFilter] = useState<MerchVendorFilter>("all");

  const merch = normalizeClubMerchandising(stadium.merchandising);
  const expressPromoActive = isExpressPromoWeek(week);
  const expressTier = vendorRelationTier(merch.vendor_relations, "express");
  const onDemandUnit = customOrderUnitCost(
    customSku,
    merch.skus[customSku]?.avg_cost ?? 0,
    week,
    merch.bulk_offers,
    expressTier,
  );
  const onDemandQuote = customOrderQuote(
    customSku,
    customQty,
    merch.skus[customSku]?.avg_cost ?? 0,
    week,
    merch.bulk_offers,
    expressTier,
  );
  const onDemandMarketUnit = bestMarketBulkUnitCost(customSku, merch.bulk_offers, "grosshaendler");

  const careerWeek = merchCareerWeekIndex(season, week);
  const occupancy = weekCommerceOccupancy(isHomeMatchWeek, stadium, season, week);
  const fanshopLevel = fanshopMerchLevel(stadium.precinct);
  const activeSales = activeMerchSaleSkus(merch, careerWeek);
  const pendingSaleSummaries = merch.pending_sale_summaries ?? [];

  const preview = useMemo(
    () =>
      weeklyMerchandisingEconomics({
        stadium,
        players,
        clubId,
        occupancy,
        isHomeMatchWeek,
        week,
        season,
        masterSeed,
      }),
    [stadium, players, clubId, occupancy, isHomeMatchWeek, week, season, masterSeed],
  );
  const jerseyPool = Math.round(preview.net * JERSEY_REVENUE_SHARE);
  const sellers = jerseySellersWithWeekly(jerseySalesWeights(players, clubId), jerseyPool);

  function setRetail(sku: MerchSkuId, value: number) {
    const row = merch.skus[sku]!;
    const nextPrice = Math.max(1, Math.round(value));
    onMerchandisingChange({
      ...stadium,
      merchandising: {
        ...merch,
        skus: {
          ...merch.skus,
          [sku]: { ...row, retail_price: nextPrice },
        },
      },
    });
  }

  function openFiresaleModal(sku: MerchSkuId) {
    const row = merch.skus[sku]!;
    if (isMerchSkuOnSale(row, careerWeek)) return;
    const normal = merchSkuNormalRetail(row);
    setModalSalePrice(suggestedMerchSalePrice(normal));
    setFiresaleSku(sku);
  }

  const overCapacitySkuCount = MERCH_SKU_IDS.filter((id) =>
    isMerchOverCapacity(merch.skus[id]!.stock, fanshopLevel, id),
  ).length;

  const onDemandBySku = useMemo(
    () => merchOnDemandQtyBySku({ on_demand_queue: merch.on_demand_queue }),
    [merch.on_demand_queue],
  );

  function tileProps(sku: MerchSkuId) {
    const row = merch.skus[sku]!;
    const over = isMerchOverCapacity(row.stock, fanshopLevel, sku);
    const onSale = isMerchSkuOnSale(row, careerWeek);
    return {
      overCapacity: over,
      onSale,
      saleWeeksLeft: merchSaleWeeksRemaining(row, careerWeek),
      onDemandInbound: onDemandBySku[sku] ?? 0,
      onOverCapacityClick: over && !onSale ? () => openFiresaleModal(sku) : undefined,
    };
  }

  const onDemandPanel = (
    <MerchOnDemandPanel
      customSku={customSku}
      customQty={customQty}
      onDemandUnit={onDemandUnit}
      onDemandQuote={onDemandQuote}
      onDemandMarketUnit={onDemandMarketUnit}
      relations={merch.vendor_relations}
      promoActive={expressPromoActive}
      promoPct={Math.round(EXPRESS_PROMO_DISCOUNT * 100)}
      onSkuChange={setCustomSku}
      onQtyDecrement={() => setCustomQty((qty) => Math.max(10, qty - 10))}
      onQtyIncrement={() => setCustomQty((qty) => qty + 10)}
      onOrder={() => onRequestOnDemand(customSku, customQty)}
    />
  );

  const screenHeader = (
    <header className="merchandising-head">
      <div>
        <p className="merchandising-kicker">
          Saison {season} · Woche {week}
        </p>
        <h1 className="merchandising-title">Merchandising</h1>
        <p className="merchandising-sub">
          Netto {formatClubCash(preview.net)} · Fanshop Stufe {fanshopLevel || "—"}
        </p>
      </div>
    </header>
  );

  const overCapacityBanner =
    overCapacitySkuCount > 0 ? (
      <section className="merch-sale-flame-banner" aria-label="Lager über Kapacität">
        <Package size={20} strokeWidth={2.4} aria-hidden className="merch-sale-flame-icon" />
        <div className="merch-sale-flame-copy">
          <strong>
            {overCapacitySkuCount} SKU über Kapazität
          </strong>
          <span>
            Firesale oder Abverkauf — sonst Abstoß nach {MERCH_OVERCAP_DISCARD_AFTER_WEEKS} Wochen
            Überbestand.
          </span>
        </div>
      </section>
    ) : null;

  const saleFlameBanner =
    activeSales.length > 0 ? (
      <section className="merch-sale-flame-banner" aria-label="Aktive Sales">
        <Flame size={20} strokeWidth={2.4} aria-hidden className="merch-sale-flame-icon" />
        <div className="merch-sale-flame-copy">
          <strong>Fire Sale aktiv</strong>
          <span>
            {activeSales
              .map((id) => {
                const left = merchSaleWeeksRemaining(merch.skus[id]!, careerWeek);
                return `${MERCH_SKU_LABEL[id]} (${left} Wo.)`;
              })
              .join(" · ")}
          </span>
        </div>
      </section>
    ) : null;

  const firesaleModal =
    firesaleSku != null ? (
      <MerchFiresaleModal
        sku={firesaleSku}
        normalRetail={merchSkuNormalRetail(merch.skus[firesaleSku]!)}
        salePrice={modalSalePrice}
        stock={merch.skus[firesaleSku]!.stock}
        maxStock={merchMaxStockForSku(fanshopLevel, firesaleSku)}
        onSalePriceChange={setModalSalePrice}
        onConfirm={() => {
          onStartMerchSale(firesaleSku, modalSalePrice);
          setFiresaleSku(null);
        }}
        onCancel={() => setFiresaleSku(null)}
      />
    ) : null;

  return (
    <main
      className={
        tab === "einkauf"
          ? "merchandising merchandising--einkauf club-shell-card-body"
          : tab === "preise"
            ? "merchandising merchandising--preise club-shell-card-body"
            : "merchandising club-shell-card-body"
      }
      data-coach-target={COACH_TARGET.merchOrders}
    >
      <FmScreenTabBar
        role="tablist"
        aria-label="Merchandising Bereiche"
        data-coach-target={COACH_TARGET.merchTabs}
      >
        {(
          [
            ["preise", "Preise"],
            ["einkauf", "Einkauf"],
          ] as const
        ).map(([id, label]) => (
          <FmScreenTab
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "is-active" : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </FmScreenTab>
        ))}
      </FmScreenTabBar>

      {tab === "preise" ? (
        <div className="fm-tab-panel merch-panel" role="tabpanel" aria-label="Preise">
          {screenHeader}
          {overCapacityBanner}
          {saleFlameBanner}
          <div className="merch-preise-row">
            <div className="merch-a4-sheet">
              <MerchPriceTile
                sku="trikots"
                hero
                row={merch.skus.trikots!}
                fanshopLevel={fanshopLevel}
                careerWeek={careerWeek}
                onPriceChange={setRetail}
                topSellers={sellers}
                {...tileProps("trikots")}
              />
              <div className="merch-a4-side">
                {OTHER_SKUS.map((sku) => (
                  <MerchPriceTile
                    key={sku}
                    sku={sku}
                    row={merch.skus[sku]!}
                    fanshopLevel={fanshopLevel}
                    careerWeek={careerWeek}
                    onPriceChange={setRetail}
                    {...tileProps(sku)}
                  />
                ))}
              </div>
            </div>
            {onDemandPanel}
          </div>
        </div>
      ) : null}

      {tab === "einkauf" ? (
        <div className="fm-tab-panel merch-panel" role="tabpanel" aria-label="Einkauf">
          {screenHeader}
          {overCapacityBanner}
          {saleFlameBanner}
          <MerchVendorStrip
            offers={merch.bulk_offers}
            relations={merch.vendor_relations}
            active={vendorFilter}
            onSelect={setVendorFilter}
          />
          <div className="merch-einkauf-row merch-einkauf-row--vendors">
            <MerchVendorMarketTable
              offers={merch.bulk_offers}
              careerWeek={careerWeek}
              vendorFilter={vendorFilter}
              onVendorFilterChange={setVendorFilter}
              onBuyOffer={onRequestBulkPurchase}
            />
            <div className="merch-einkauf-side">
              <MerchEinkaufInboundPanel merch={merch} careerWeek={careerWeek} />
              <MerchEinkaufStockOverview merch={merch} fanshopLevel={fanshopLevel} />
            </div>
          </div>
        </div>
      ) : null}

      {pendingSaleSummaries.length > 0 ? (
        <MerchSaleSummaryModal
          summaries={pendingSaleSummaries}
          onDismiss={() =>
            onMerchandisingChange(dismissMerchSaleSummaries(stadium))
          }
        />
      ) : null}
      {firesaleModal}
    </main>
  );
}

const MERCH_PRICE_STEP = 1;

function MerchGridInventory({
  stock,
  maxStock,
  avgCost,
  hero = false,
}: {
  stock: number;
  maxStock: number;
  avgCost: number;
  hero?: boolean;
}) {
  return (
    <div className={hero ? "merch-grid-inventory merch-grid-inventory--hero" : "merch-grid-inventory"}>
      <p className="merch-grid-stock">
        <span className="merch-grid-stock-label">Bestand</span>
        <strong>{stock}</strong>
        <span className="merch-muted"> / {maxStock}</span>
      </p>
      <p className="merch-grid-meta">
        Ø EK <strong>{formatClubCash(avgCost)}</strong>
      </p>
    </div>
  );
}

function MerchRetailStepper({
  value,
  onSale,
  onDecrement,
  onIncrement,
  hero = false,
}: {
  value: number;
  onSale?: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
  hero?: boolean;
}) {
  return (
    <div
      className={hero ? "merch-price-stepper merch-price-stepper--hero" : "merch-price-stepper"}
      role="group"
      aria-label="Verkaufspreis"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button type="button" className="merch-step-btn" onClick={onDecrement} aria-label="Preis senken">
        −
      </button>
      <span className="merch-step-value" aria-live="polite">
        {onSale ? (
          <>
            <span className="merch-step-sale-tag">Sale</span> {formatClubCash(value)}
          </>
        ) : (
          <>VK {formatClubCash(value)}</>
        )}
      </span>
      <button type="button" className="merch-step-btn" onClick={onIncrement} aria-label="Preis erhöhen">
        +
      </button>
    </div>
  );
}

function MerchHeroSellers({ rows }: { rows: JerseySellerRow[] }) {
  if (rows.length === 0) return null;
  return (
    <ul className="merch-hero-sellers" aria-label="Top Trikot-Modelle">
      {rows.slice(0, 4).map((row) => (
        <li key={row.playerId}>
          <span className="merch-hero-sellers-name">{row.name}</span>
          <span className="merch-hero-sellers-share">{Math.round(row.share * 100)}%</span>
        </li>
      ))}
    </ul>
  );
}

function merchTileClassName(
  hero: boolean,
  overCapacity: boolean,
  onSale: boolean,
  clickable: boolean,
): string {
  const parts = [hero ? "merch-grid-tile merch-grid-tile--hero" : "merch-grid-tile"];
  if (onSale) parts.push("is-on-sale");
  if (overCapacity) parts.push("is-over-cap");
  if (clickable) parts.push("is-clickable");
  return parts.join(" ");
}

function MerchPriceTile({
  sku,
  row,
  fanshopLevel,
  careerWeek,
  onPriceChange,
  hero = false,
  topSellers,
  overCapacity = false,
  onSale = false,
  saleWeeksLeft = 0,
  onDemandInbound = 0,
  onOverCapacityClick,
}: {
  sku: MerchSkuId;
  row: { stock: number; avg_cost: number; retail_price: number; retail_price_normal?: number };
  fanshopLevel: number;
  careerWeek: number;
  onPriceChange: (sku: MerchSkuId, value: number) => void;
  hero?: boolean;
  topSellers?: JerseySellerRow[];
  overCapacity?: boolean;
  onSale?: boolean;
  saleWeeksLeft?: number;
  onDemandInbound?: number;
  onOverCapacityClick?: () => void;
}) {
  const Icon = MERCH_SKU_ICON[sku];
  const maxStock = merchMaxStockForSku(fanshopLevel, sku);
  const stockFill = merchStockFillRatio(row.stock, fanshopLevel, sku);
  const onDemandFill = maxStock > 0 ? onDemandInbound / maxStock : 0;
  const totalFill = stockFill + onDemandFill;
  const listPrice = row.retail_price;
  const normal = row.retail_price_normal ?? listPrice;
  const clickable = Boolean(onOverCapacityClick);

  return (
    <article
      className={merchTileClassName(hero, overCapacity, onSale, clickable)}
      onClick={onOverCapacityClick}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOverCapacityClick?.();
              }
            }
          : undefined
      }
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={
        clickable ? `${MERCH_SKU_LABEL[sku]} — Lager voll, Fire Sale einrichten` : undefined
      }
    >
      {onSale ? (
        <span className="merch-tile-sale-badge">
          <Flame size={12} aria-hidden /> {saleWeeksLeft} Wo.
        </span>
      ) : null}
      <Icon size={hero ? 42 : 22} strokeWidth={2.2} aria-hidden />
      <h3>{MERCH_SKU_LABEL[sku]}</h3>
      <span
        className={`merch-fill-bar merch-fill-bar--stacked${totalFill > 1 ? " is-over" : stockFill > 1 ? " is-over" : ""}`}
        aria-hidden
      >
        <span
          className="merch-fill-bar-segment merch-fill-bar-segment--stock"
          style={{ width: `${Math.min(100, stockFill * 100)}%` }}
        />
        {onDemandInbound > 0 ? (
          <span
            className="merch-fill-bar-segment merch-fill-bar-segment--ondemand"
            style={{ width: `${onDemandFill * 100}%` }}
          />
        ) : null}
      </span>
      <MerchGridInventory stock={row.stock} maxStock={maxStock} avgCost={row.avg_cost} hero={hero} />
      {hero && topSellers ? <MerchHeroSellers rows={topSellers} /> : null}
      <MerchRetailStepper
        hero={hero}
        value={listPrice}
        onSale={onSale}
        onDecrement={() => onPriceChange(sku, listPrice - MERCH_PRICE_STEP)}
        onIncrement={() => onPriceChange(sku, listPrice + MERCH_PRICE_STEP)}
      />
      {onSale && normal !== listPrice ? (
        <p className="merch-grid-meta merch-muted">Normal {formatClubCash(normal)}</p>
      ) : null}
    </article>
  );
}

