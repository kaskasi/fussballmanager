import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  Bath,
  BedDouble,
  Flame,
  Footprints,
  Shirt,
  Wind,
  ShoppingBag,
  Tag,
} from "lucide-react";
import type { Player } from "../../types/player.ts";
import { formatClubCash, type ClubFinances } from "../../economy/club-finances.ts";
import type { ClubStadium } from "../../stadium/club-stadium.ts";
import { CashChip } from "../components/CashChip.tsx";
import { MerchFiresaleModal } from "../components/MerchFiresaleModal.tsx";
import { MerchMarketplaceCanvas } from "../components/MerchMarketplaceCanvas.tsx";
import {
  activeMerchSaleSkus,
  customOrderQuote,
  deliverMerchandisingOrders,
  ensureMerchBulkMarket,
  JERSEY_REVENUE_SHARE,
  isMerchOverCapacity,
  isMerchSkuOnSale,
  MERCH_ON_DEMAND_LEAD_DAYS,
  MERCH_SKU_IDS,
  MERCH_SKU_LABEL,
  merchSaleWeeksRemaining,
  merchSkuNormalRetail,
  fanshopMerchLevel,
  jerseySalesWeights,
  jerseySellersWithWeekly,
  merchMaxStockForSku,
  merchStockFillRatio,
  normalizeClubMerchandising,
  suggestedMerchSalePrice,
  weeklyMerchandisingEconomics,
  type MerchSkuId,
} from "../../economy/merchandising.ts";
import { merchCareerDayIndex, merchCareerWeekIndex } from "../../economy/merchandising-market.ts";
import { weekCommerceOccupancy } from "../../stadium/matchday-commerce.ts";

type MerchTab = "preise" | "einkauf";

const OTHER_SKUS = MERCH_SKU_IDS.filter((id) => id !== "trikots");

const SKU_ICON: Record<MerchSkuId, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  trikots: Shirt,
  shirts: ShoppingBag,
  caps: Tag,
  schals: Wind,
  socken: Footprints,
  bettwaesche: BedDouble,
  handtuecher: Bath,
};

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
  const [tab, setTab] = useState<MerchTab>("preise");
  const [customSku, setCustomSku] = useState<MerchSkuId>("trikots");
  const [customQty, setCustomQty] = useState(120);
  const [firesaleSku, setFiresaleSku] = useState<MerchSkuId | null>(null);
  const [modalSalePrice, setModalSalePrice] = useState(1);

  const merch = normalizeClubMerchandising(stadium.merchandising);
  const onDemandQuote = customOrderQuote(
    customSku,
    customQty,
    merch.skus[customSku]?.avg_cost ?? 0,
  );

  useEffect(() => {
    let next = deliverMerchandisingOrders(stadium, season, week, weekday);
    next = ensureMerchBulkMarket(next, season, week, masterSeed);
    if (next !== stadium) {
      onMerchandisingChange(next);
    }
  }, [stadium, season, week, weekday, masterSeed, onMerchandisingChange]);

  const careerWeek = merchCareerWeekIndex(season, week);
  const careerDay = merchCareerDayIndex(season, week, weekday);
  const occupancy = weekCommerceOccupancy(isHomeMatchWeek, stadium);
  const fanshopLevel = fanshopMerchLevel(stadium.precinct);
  const activeSales = activeMerchSaleSkus(merch, careerWeek);

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
  const fullPreview = useMemo(
    () =>
      weeklyMerchandisingEconomics({
        stadium,
        players,
        clubId,
        occupancy: 1,
        isHomeMatchWeek,
        week,
        season,
        masterSeed,
      }),
    [stadium, players, clubId, isHomeMatchWeek, week, season, masterSeed],
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

  function tileProps(sku: MerchSkuId) {
    const row = merch.skus[sku]!;
    const over = isMerchOverCapacity(row.stock, fanshopLevel, sku);
    const onSale = isMerchSkuOnSale(row, careerWeek);
    return {
      overCapacity: over,
      onSale,
      saleWeeksLeft: merchSaleWeeksRemaining(row, careerWeek),
      onOverCapacityClick: over && !onSale ? () => openFiresaleModal(sku) : undefined,
    };
  }

  const screenHeader = (
    <header className="merchandising-head">
      <div>
        <p className="merchandising-kicker">
          Saison {season} · Woche {week}
        </p>
        <h1 className="merchandising-title">Merchandising</h1>
        <p className="merchandising-sub">
          Netto {formatClubCash(preview.net)} · Fanshop Stufe {fanshopLevel || "—"} · voll{" "}
          {formatClubCash(fullPreview.net)}
        </p>
      </div>
      <CashChip cash={finances.cash} />
    </header>
  );

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
    <main className="merchandising club-shell-card-body">
      <div className="fm-tab-bar" role="tablist" aria-label="Merchandising Bereiche">
        {(
          [
            ["preise", "Preise"],
            ["einkauf", "Einkauf"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "fm-tab is-active" : "fm-tab"}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "preise" ? (
        <div className="fm-tab-panel merch-panel" role="tabpanel" aria-label="Preise">
          {screenHeader}
          {saleFlameBanner}
          <div className="merch-a4-sheet">
            <MerchPriceTile
              sku="trikots"
              hero
              row={merch.skus.trikots!}
              fanshopLevel={fanshopLevel}
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
                  onPriceChange={setRetail}
                  {...tileProps(sku)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "einkauf" ? (
        <div className="fm-tab-panel merch-panel" role="tabpanel" aria-label="Einkauf">
          {screenHeader}
          {saleFlameBanner}
          <div className="merch-einkauf-row">
            <div className="merch-einkauf-market">
              <MerchMarketplaceCanvas
                offers={merch.bulk_offers}
                onBuyOffer={(offerId) => onRequestBulkPurchase(offerId)}
              />
            </div>
            <section className="merch-inbound merch-inbound--side" aria-label="Ware unterwegs">
              <h2 className="merch-section-title">Unterwegs</h2>
              {merch.branding_queue.length === 0 && (merch.on_demand_queue?.length ?? 0) === 0 ? (
                <p className="merch-muted">Keine Lieferungen aktiv.</p>
              ) : (
                <ul className="merch-inbound-list">
                  {merch.branding_queue.map((order) => {
                    const left = order.arrives_career_week - careerWeek;
                    return (
                      <li key={order.id}>
                        <span>
                          Whitelabel ·{" "}
                          {left <= 0 ? "Ankunft diese Woche" : `Ankunft in ${left} Wo.`}
                        </span>
                        <span>{formatClubCash(order.unit_cost)} Ø/Stück</span>
                      </li>
                    );
                  })}
                  {(merch.on_demand_queue ?? []).map((order) => {
                    const daysLeft = Math.max(0, order.arrives_career_day - careerDay);
                    return (
                      <li key={order.id}>
                        <span>
                          On Demand · {MERCH_SKU_LABEL[order.sku]} ·{" "}
                          {daysLeft <= 0 ? "Ankunft heute" : `Ankunft in ${daysLeft} T.`}
                        </span>
                        <span>
                          {order.qty} St. · {formatClubCash(order.unit_cost)}/St.
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
          <section className="merch-on-demand" aria-label="On Demand Produktion">
            <header className="merch-on-demand-head">
              <h2 className="merch-section-title">On Demand Produktion</h2>
              <p className="merch-on-demand-tag">Kein Stammgast am Markt</p>
            </header>
            <p className="merch-on-demand-copy">
              Teuer, diskret — Lieferung in{" "}
              <strong>{MERCH_ON_DEMAND_LEAD_DAYS} Tagen</strong>, nicht sofort. Auch über 100&nbsp;%
              Lager möglich.
            </p>
            <div className="merch-custom-row">
              <select
                value={customSku}
                onChange={(event) => setCustomSku(event.target.value as MerchSkuId)}
              >
                {MERCH_SKU_IDS.map((sku) => (
                  <option key={sku} value={sku}>
                    {MERCH_SKU_LABEL[sku]}
                  </option>
                ))}
              </select>
              <div className="merch-price-stepper">
                <button
                  type="button"
                  className="merch-step-btn"
                  aria-label="Menge verringern"
                  onClick={() => setCustomQty((qty) => Math.max(10, qty - 10))}
                >
                  −
                </button>
                <span className="merch-step-value">{customQty} St.</span>
                <button
                  type="button"
                  className="merch-step-btn"
                  aria-label="Menge erhöhen"
                  onClick={() => setCustomQty((qty) => qty + 10)}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className="merch-on-demand-action"
                onClick={() => onRequestOnDemand(customSku, customQty)}
              >
                Bestellen · {formatClubCash(onDemandQuote)}
              </button>
            </div>
          </section>
        </div>
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
  onPriceChange,
  hero = false,
  topSellers,
  overCapacity = false,
  onSale = false,
  saleWeeksLeft = 0,
  onOverCapacityClick,
}: {
  sku: MerchSkuId;
  row: { stock: number; avg_cost: number; retail_price: number; retail_price_normal?: number };
  fanshopLevel: number;
  onPriceChange: (sku: MerchSkuId, value: number) => void;
  hero?: boolean;
  topSellers?: JerseySellerRow[];
  overCapacity?: boolean;
  onSale?: boolean;
  saleWeeksLeft?: number;
  onOverCapacityClick?: () => void;
}) {
  const Icon = SKU_ICON[sku];
  const maxStock = merchMaxStockForSku(fanshopLevel, sku);
  const fill = merchStockFillRatio(row.stock, fanshopLevel, sku);
  const price = row.retail_price;
  const normal = row.retail_price_normal ?? price;
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
      <span className={`merch-fill-bar${fill > 1 ? " is-over" : ""}`} aria-hidden>
        <span style={{ width: `${Math.min(100, fill * 100)}%` }} />
      </span>
      <MerchGridInventory stock={row.stock} maxStock={maxStock} avgCost={row.avg_cost} hero={hero} />
      {hero && topSellers ? <MerchHeroSellers rows={topSellers} /> : null}
      <MerchRetailStepper
        hero={hero}
        value={price}
        onSale={onSale}
        onDecrement={() => onPriceChange(sku, price - MERCH_PRICE_STEP)}
        onIncrement={() => onPriceChange(sku, price + MERCH_PRICE_STEP)}
      />
      {onSale && normal !== price ? (
        <p className="merch-grid-meta merch-muted">Normal {formatClubCash(normal)}</p>
      ) : null}
    </article>
  );
}

