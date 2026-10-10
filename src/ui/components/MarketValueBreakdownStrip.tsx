/** WIREFRAME: PRD 05.1 — Marktwert-Faktoren (Icon-first, kompakt) */
import { TrendingUp } from "lucide-react";
import { formatClubCash } from "../../economy/club-finances.ts";
import type { Player } from "../../types/player.ts";
import { estimateCa, marketValueBreakdown, marketValueInputFromPlayer } from "../../transfers/market-value.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";

function pct(factor: number): string {
  const delta = (factor - 1) * 100;
  if (Math.abs(delta) < 0.05) return "±0%";
  return `${delta > 0 ? "+" : ""}${delta.toFixed(0)}%`;
}

export function MarketValueBreakdownStrip({
  player,
  season,
}: {
  player: Player;
  season: number;
}) {
  useT();
  const ca = estimateCa(player.attributes, player.position);
  const breakdown = marketValueBreakdown(marketValueInputFromPlayer(player, ca, season));
  const total = player.market_value;

  return (
    <section className="market-value-breakdown" aria-label={t("transfer.marketValue.breakdownAria")}>
      <header className="market-value-breakdown-head">
        <TrendingUp size={16} aria-hidden />
        <span className="market-value-breakdown-total">{formatClubCash(total)}</span>
        <span className="market-value-breakdown-label">{t("transfer.marketValue.title")}</span>
      </header>
      <ul className="market-value-breakdown-factors">
        <li>
          <span>{t("transfer.marketValue.base")}</span>
          <strong>{formatClubCash(breakdown.base)}</strong>
        </li>
        <li>
          <span>{t("transfer.marketValue.present")}</span>
          <strong>{pct(breakdown.presentFactor)}</strong>
        </li>
        <li>
          <span>{t("transfer.marketValue.development")}</span>
          <strong>{pct(breakdown.developmentFactor)}</strong>
        </li>
        <li>
          <span>{t("transfer.marketValue.contract")}</span>
          <strong>{pct(breakdown.contractFactor)}</strong>
        </li>
      </ul>
      {breakdown.capped ? (
        <p className="market-value-breakdown-cap">{t("transfer.marketValue.youthCap")}</p>
      ) : null}
    </section>
  );
}
