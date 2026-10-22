import { Package, Shirt, TrendingUp } from "lucide-react";
import type { Player } from "../../types/player.ts";
import { formatClubCash } from "../../economy/club-finances.ts";
import type { ClubStadium } from "../../stadium/club-stadium.ts";
import { buildMerchandisingAnalytics } from "../../economy/merchandising-analytics.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import { formatDecimal } from "../../i18n/number-display.ts";

function skuName(id: string, fallback: string): string {
  const key = `merch.skuName.${id}`;
  const label = t(key);
  return label !== key ? label : fallback;
}

/**
 * WIREFRAME: docs/prd/design.md §9.2 — Finanzen Tab Merchandising (read-only; tc panels, list and table)
 */
export function MerchandisingAnalyticsPanel({
  stadium,
  players,
  clubId,
  isHomeMatchWeek,
  week,
  season,
  masterSeed,
}: {
  stadium: ClubStadium;
  players: readonly Player[];
  clubId: string;
  isHomeMatchWeek: boolean;
  week: number;
  season: number;
  masterSeed: number;
}) {
  useT();
  const view = buildMerchandisingAnalytics(
    stadium,
    players,
    clubId,
    isHomeMatchWeek,
    week,
    season,
    masterSeed,
  );

  const hasWeekSales = view.skuWeekRows.some((row) => row.units > 0);

  return (
    <div className="tc-finances__cards" aria-label={t("finances.merch.aria")}>
      <section className="tc-panel" aria-labelledby="merch-summary-title">
        <div className="tc-panel__head">
          <h2 className="tc-panel__title tc-finances__title" id="merch-summary-title">
            <Package className="tc-icon" aria-hidden />
            {t("finances.merch.title")}
          </h2>
        </div>
        <p className="tc-finances__headline">
          <strong>{formatClubCash(view.weekNet)}</strong> {t("finances.merch.netThisWeek")}
        </p>
        <dl className="tc-kv">
          <dt>{t("finances.atFullOccupancy")}</dt>
          <dd>{formatClubCash(view.fullOccupancyNet)}</dd>
          <dt>{t("finances.occupancy")}</dt>
          <dd>{t("finances.percent", { value: view.occupancyPct })}</dd>
          <dt>{t("finances.merch.channel")}</dt>
          <dd>×{formatDecimal(view.channelScale, 2)}</dd>
          <dt>{t("finances.merch.fanshopLevel")}</dt>
          <dd>{view.fanshopLevel}</dd>
          <dt>{t("finances.merch.whitelabel")}</dt>
          <dd>
            {view.activeOffers}/{view.maxOfferSlots}
          </dd>
          <dt>{t("finances.merch.inbound")}</dt>
          <dd>{view.pendingBranding}</dd>
        </dl>
        {view.overCapacitySkuCount > 0 ? (
          <p className="tc-callout tc-callout--warn tc-cards__note">
            {t("finances.merch.overCapacity", { count: view.overCapacitySkuCount, weeks: view.weeksUntilDiscard })}
          </p>
        ) : null}
      </section>

      <section className="tc-panel" aria-labelledby="merch-sellers-title">
        <div className="tc-panel__head">
          <h2 className="tc-panel__title tc-finances__title" id="merch-sellers-title">
            <Shirt className="tc-icon" aria-hidden />
            {t("finances.merch.topSellers")}
          </h2>
        </div>
        {view.topJerseySellers.length === 0 ? (
          <p className="tc-empty">{t("finances.merch.noPros")}</p>
        ) : (
          <ol className="tc-list">
            {view.topJerseySellers.slice(0, 5).map((row, index) => (
              <li key={row.playerId} className="tc-list__item">
                <span className="tc-list__rank">{index + 1}</span>
                <span className="tc-list__main">
                  <span className="tc-list__name">{row.name}</span>
                  <span className="tc-list__meta">{t("finances.merch.share", { percent: Math.round(row.share * 100) })}</span>
                </span>
                <span className="tc-list__value">{formatClubCash(row.weeklyEur)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="tc-panel" aria-labelledby="merch-sku-title">
        <div className="tc-panel__head">
          <h2 className="tc-panel__title tc-finances__title" id="merch-sku-title">
            <TrendingUp className="tc-icon" aria-hidden />
            {t("finances.merch.skuTitle")}
          </h2>
        </div>
        {!hasWeekSales ? (
          <p className="tc-empty">{t("finances.merch.noSales")}</p>
        ) : (
          <div className="tc-table-wrap">
            <table className="tc-table tc-table--compact">
              <thead>
                <tr>
                  <th scope="col">{t("finances.merch.col.item")}</th>
                  <th scope="col" className="tc-num">{t("finances.merch.col.units")}</th>
                  <th scope="col" className="tc-num">{t("finances.merch.col.revenue")}</th>
                  <th scope="col" className="tc-num">{t("finances.merch.col.profit")}</th>
                </tr>
              </thead>
              <tbody>
                {view.skuWeekRows.map((row) => (
                  <tr key={row.id} className={row.units <= 0 ? "tc-finances__muted" : undefined}>
                    <td>{skuName(row.id, row.label)}</td>
                    <td className="tc-num">{row.units}</td>
                    <td className="tc-num">{formatClubCash(row.gross)}</td>
                    <td className="tc-num">{formatClubCash(row.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="tc-caption tc-cards__note">{t("finances.merch.pricesHint")}</p>
      </section>
    </div>
  );
}
