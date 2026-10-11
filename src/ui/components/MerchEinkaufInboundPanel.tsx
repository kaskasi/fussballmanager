import { useEffect, useMemo, useState } from "react";
import { formatClubCash } from "../../economy/club-finances.ts";
import {
  MERCH_SKU_IDS,
  MERCH_SKU_LABEL,
  primaryMerchSku,
  type ClubMerchandising,
  type MerchBrandingOrder,
} from "../../economy/merchandising.ts";
import { useT } from "../../i18n/react.ts";

const INBOUND_PAGE_SIZE = 4;

type InboundLine = {
  id: string;
  primary: string;
  secondary: string;
};

function buildInboundLines(
  brandingQueue: readonly MerchBrandingOrder[],
  careerWeek: number,
): InboundLine[] {
  const lines: InboundLine[] = [];

  for (const order of brandingQueue) {
    const left = order.arrives_career_week - careerWeek;
    const sku = primaryMerchSku(order.units);
    const qty =
      sku != null
        ? (order.units[sku] ?? 0)
        : MERCH_SKU_IDS.reduce((sum, id) => sum + (order.units[id] ?? 0), 0);
    const skuLabel = sku != null ? MERCH_SKU_LABEL[sku] : "Whitelabel-Paket";
    lines.push({
      id: order.id,
      primary: `${skuLabel} · ${qty} St. · Whitelabel · ${
        left <= 0 ? "Ankunft diese Woche" : `Ankunft in ${left} Wo.`
      }`,
      secondary: `${formatClubCash(order.unit_cost)} Ø/Stück`,
    });
  }

  return lines;
}

/** WIREFRAME: design.md §9 — Einkauf „Unterwegs“ (paginiert, Höhe wie Marktplatz-Teaser) */
export function MerchEinkaufInboundPanel({
  merch,
  careerWeek,
}: {
  merch: ClubMerchandising;
  careerWeek: number;
}) {
  const t = useT();
  const lines = useMemo(
    () => buildInboundLines(merch.branding_queue, careerWeek),
    [merch.branding_queue, careerWeek],
  );

  const pageCount = Math.max(1, Math.ceil(lines.length / INBOUND_PAGE_SIZE));
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [lines.length]);

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(0, pageCount - 1)));
  }, [pageCount]);

  const pageLines = lines.slice(
    page * INBOUND_PAGE_SIZE,
    page * INBOUND_PAGE_SIZE + INBOUND_PAGE_SIZE,
  );
  const showPager = lines.length > INBOUND_PAGE_SIZE;

  return (
    <section className="merch-einkauf-panel merch-inbound merch-inbound--side" aria-label={t("merch.inbound.aria")}>
      <header className="merch-einkauf-panel-head">
        <h2 className="merch-section-title">{t("merch.inbound.title")}</h2>
      </header>
      {lines.length === 0 ? (
        <p className="merch-muted merch-einkauf-panel-empty">{t("merch.inbound.empty")}</p>
      ) : (
        <>
          <div className="merch-einkauf-panel-body">
            <ul className="merch-inbound-list merch-inbound-list--paged">
              {pageLines.map((line) => (
                <li key={line.id}>
                  <span>{line.primary}</span>
                  <span>{line.secondary}</span>
                </li>
              ))}
            </ul>
          </div>
          {showPager ? (
            <footer className="merch-market-modal-pager merch-inbound-pager">
              <button
                type="button"
                className="ui-btn ui-btn--ghost ui-btn--sm"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                {t("merch.market.prev")}
              </button>
              <span className="merch-muted">
                {t("merch.market.page", { current: page + 1, total: pageCount })}
              </span>
              <button
                type="button"
                className="ui-btn ui-btn--ghost ui-btn--sm"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                {t("merch.market.next")}
              </button>
            </footer>
          ) : (
            <footer className="merch-einkauf-panel-spacer" aria-hidden />
          )}
        </>
      )}
    </section>
  );
}
