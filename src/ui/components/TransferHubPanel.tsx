import { AlertTriangle, ArrowDownLeft } from "lucide-react";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import { wageBudgetHeadroom } from "../../economy/club-finances.ts";
import type { ClubFinances } from "../../economy/club-finances.ts";
import type { Player } from "../../types/player.ts";
import { listExpiringClubContracts } from "../../transfers/expiring-contracts.ts";
import { listPendingInboundOffers } from "../../transfers/inbound-offers.ts";
import type { TransferState } from "../../transfers/negotiations.ts";
import { PlayerPortrait } from "./PlayerPortrait.tsx";

/**
 * WIREFRAME: PRD 14.8 — Hub transfers (symmetric to DevelopmentHubPanel)
 */
export function TransferHubPanel({
  players,
  clubId,
  season,
  week,
  finances,
  transferState,
  onSelectPlayer,
}: {
  players: readonly Player[];
  clubId: string;
  season: number;
  week: number;
  finances: ClubFinances;
  transferState: TransferState;
  onSelectPlayer: (playerId: string) => void;
}) {
  useT();
  const expiring = listExpiringClubContracts(players, clubId, season, week);
  const inbound = listPendingInboundOffers(transferState, clubId, players).slice(0, 1);
  const headroom = wageBudgetHeadroom(finances, players, clubId);

  if (expiring.length === 0 && inbound.length === 0) {
    return null;
  }

  return (
    <section className="dev-hub transfer-hub" aria-label={t("hub.transfer.aria")}>
      <div className="dev-hub-head">
        <h3>{t("hub.transfer.title")}</h3>
        <p className="dev-hub-sub">{t("hub.transfer.sub")}</p>
      </div>
      <ul className="dev-hub-scout-grid">
        {expiring.map((entry) => {
          const player = players.find((row) => row.id === entry.playerId);
          const tight =
            player?.contract &&
            player.contract.wage_weekly > headroom + (player.contract.wage_weekly * 0.05);
          return (
            <li key={entry.playerId} className="scouting-hits-grid-cell">
              <button
                type="button"
                className="transfer-hub-card"
                onClick={() => onSelectPlayer(entry.playerId)}
              >
                {player ? (
                  <PlayerPortrait seed={player.portrait_seed} size="sm" variant="known" />
                ) : null}
                <span className="transfer-hub-copy">
                  <strong>{entry.displayName}</strong>
                  <small>
                    {entry.monthsRemaining} Mo · CA {entry.ca}
                  </small>
                  {player?.state.contract_demoralized ? (
                    <small className="transfer-hub-warn">
                      <AlertTriangle size={14} aria-hidden="true" /> {t("hub.transfer.demoralized")}
                    </small>
                  ) : tight ? (
                    <small className="transfer-hub-warn">{t("hub.transfer.wageTight")}</small>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
        {inbound.map((offer) => (
          <li key={offer.id} className="scouting-hits-grid-cell">
            <button
              type="button"
              className="transfer-hub-card transfer-hub-inbound"
              onClick={() => onSelectPlayer(offer.player_id)}
            >
              <ArrowDownLeft size={22} aria-hidden="true" />
              <span className="transfer-hub-copy">
                <strong>{t("hub.transfer.inbound")}</strong>
                <small>€ {Math.round(offer.fee).toLocaleString("de-DE")}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
