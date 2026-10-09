import { Package, Shirt, TrendingUp } from "lucide-react";
import type { Player } from "../../types/player.ts";
import { formatClubCash } from "../../economy/club-finances.ts";
import type { ClubStadium } from "../../stadium/club-stadium.ts";
import { buildMerchandisingAnalytics } from "../../economy/merchandising-analytics.ts";

/**
 * WIREFRAME: docs/prd/design.md §9.2 — Finanzen Tab Merchandising (read-only)
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
    <section className="merch-analytics finances-detail-cards" aria-label="Merchandising Auswertung">
      <article className="finances-detail">
        <h2>
          <Package size={18} strokeWidth={2.5} aria-hidden />
          Merchandising
        </h2>
        <p>
          <strong>{formatClubCash(view.weekNet)}</strong>
          <span> netto diese Woche</span>
        </p>
        <p className="finances-detail-sub">
          voll {formatClubCash(view.fullOccupancyNet)} · {view.occupancyPct}% Auslastung · Kanal ×
          {view.channelScale.toFixed(2)}
        </p>
        <p className="finances-detail-sub">
          Fanshop Stufe {view.fanshopLevel} · Whitelabel {view.activeOffers}/{view.maxOfferSlots} ·{" "}
          {view.pendingBranding} inbound
        </p>
      </article>

      <article className="finances-detail">
        <h2>
          <Shirt size={18} strokeWidth={2.5} aria-hidden />
          Trikot-Topverkäufer
        </h2>
        <ul className="merch-analytics-sellers">
          {view.topJerseySellers.length === 0 ? (
            <li className="finances-detail-sub">Keine Profis im Kader.</li>
          ) : (
            view.topJerseySellers.slice(0, 5).map((row) => (
              <li key={row.playerId}>
                <span>{row.name}</span>
                <span>
                  {Math.round(row.share * 100)}% · {formatClubCash(row.weeklyEur)}
                </span>
              </li>
            ))
          )}
        </ul>
      </article>

      <article className="finances-detail">
        <h2>
          <TrendingUp size={18} strokeWidth={2.5} aria-hidden />
          SKU · letzte Woche
        </h2>
        {!hasWeekSales ? (
          <p className="finances-detail-sub">Noch keine Verkäufe in der abgeschlossenen Woche.</p>
        ) : (
          <table className="merch-analytics-table">
            <thead>
              <tr>
                <th scope="col">SKU</th>
                <th scope="col">Stück</th>
                <th scope="col">Einnahmen</th>
                <th scope="col">Gewinn</th>
              </tr>
            </thead>
            <tbody>
              {view.skuWeekRows.map((row) => (
                <tr key={row.id} className={row.units <= 0 ? "is-muted" : undefined}>
                  <td>{row.label}</td>
                  <td>{row.units}</td>
                  <td>{formatClubCash(row.gross)}</td>
                  <td>{formatClubCash(row.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="finances-detail-sub">Preise & Einkauf im Team-Menü unter Merchandising.</p>
      </article>
    </section>
  );
}
