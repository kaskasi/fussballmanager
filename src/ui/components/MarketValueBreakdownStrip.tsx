/** WIREFRAME: PRD 05.1 — Marktwert-Faktoren (tc-panel + tc-kv; profile and the sale confirmation) */
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
    <section className="tc-panel" aria-label={t("transfer.marketValue.breakdownAria")}>
      <div className="tc-panel__head">
        <span className="tc-label">{t("transfer.marketValue.title")}</span>
        <span className="tc-namecell">
          <TrendingUp className="tc-icon" aria-hidden />
          {formatClubCash(total)}
        </span>
      </div>
      <dl className="tc-kv">
        <dt>{t("transfer.marketValue.base")}</dt>
        <dd>{formatClubCash(breakdown.base)}</dd>
        <dt>{t("transfer.marketValue.present")}</dt>
        <dd>{pct(breakdown.presentFactor)}</dd>
        <dt>{t("transfer.marketValue.development")}</dt>
        <dd>{pct(breakdown.developmentFactor)}</dd>
        <dt>{t("transfer.marketValue.contract")}</dt>
        <dd>{pct(breakdown.contractFactor)}</dd>
      </dl>
      {breakdown.capped ? <p className="tc-caption tc-cards__note">{t("transfer.marketValue.youthCap")}</p> : null}
    </section>
  );
}
