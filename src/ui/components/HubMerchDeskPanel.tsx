/** WIREFRAME: design.md §9.9 — Desk merch 4×2 grid (Trikots hero + SKUs) */
import {
  HUB_MERCH_LOW_STOCK_THRESHOLD,
  HUB_MERCH_OTHER_SKUS,
  type HubMerchDeskCell,
  type HubMerchDeskView,
} from "../../hub/hub-finance-merch.ts";
import type { MerchSkuId } from "../../economy/merchandising-skus.ts";
import { MERCH_SKU_ICON } from "../merch/merch-sku-icons.ts";
import { useT } from "../../i18n/react.ts";

function cellStockTone(cell: HubMerchDeskCell): "empty" | "low" | "ok" {
  if (cell.stock <= 0) return "empty";
  if (cell.stock <= HUB_MERCH_LOW_STOCK_THRESHOLD) return "low";
  return "ok";
}

function HubMerchDeskCellTile({ cell }: { cell: HubMerchDeskCell }) {
  const t = useT();
  const tone = cellStockTone(cell);
  const shortLabel = t(`hub.desk.merchSku.${cell.sku}`);
  const Icon = MERCH_SKU_ICON[cell.sku];
  const iconSize = cell.variant === "hero" ? 15 : 12;

  return (
    <div
      className={[
        "hub-merch-desk__cell",
        cell.variant === "hero" ? "hub-merch-desk__cell--hero" : "",
        tone === "empty" ? "is-empty" : "",
        tone === "low" ? "is-low" : "",
        cell.pendingOrder ? "is-ordered" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-sku={cell.sku}
      title={shortLabel}
      aria-label={
        cell.pendingOrder
          ? `${shortLabel}, ${t("hub.desk.merchStockAria", { count: cell.stock })}, ${t("hub.desk.merchOrdered")}`
          : `${shortLabel}, ${t("hub.desk.merchStockAria", { count: cell.stock })}`
      }
    >
      <span className="hub-merch-desk__icon" aria-hidden>
        <Icon size={iconSize} strokeWidth={2.35} />
      </span>
      <span className="hub-merch-desk__figures">
        <span className="hub-merch-desk__stock">{cell.stock}</span>
        {cell.unitsSoldLastWeek > 0 ? (
          <span className="hub-merch-desk__sold">+{cell.unitsSoldLastWeek}</span>
        ) : null}
      </span>
      {cell.pendingOrder ? (
        <span className="hub-merch-desk__ordered" aria-hidden />
      ) : null}
    </div>
  );
}

export function HubMerchDeskPanel({ view }: { view: HubMerchDeskView }) {
  const t = useT();
  const bySku = new Map(view.cells.map((cell) => [cell.sku, cell]));
  const trikots = bySku.get("trikots");
  const otherCells = HUB_MERCH_OTHER_SKUS.map((sku) => bySku.get(sku)).filter(
    (cell): cell is HubMerchDeskCell => cell != null,
  );

  return (
    <section className="hub-merch-desk" aria-label={t("hub.desk.merch")}>
      <header className="hub-merch-desk__head">
        <strong className="hub-merch-desk__title">{t("hub.desk.merch")}</strong>
        <span className="hub-merch-desk__total">
          {t("hub.desk.merchTotalSold", { count: view.totalUnitsSoldLastWeek })}
        </span>
      </header>
      <div className="hub-merch-desk__grid">
        {trikots ? <HubMerchDeskCellTile cell={trikots} /> : null}
        {otherCells.map((cell) => (
          <HubMerchDeskCellTile key={cell.sku as MerchSkuId} cell={cell} />
        ))}
      </div>
    </section>
  );
}
