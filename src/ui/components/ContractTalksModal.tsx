/**
 * WIREFRAME: PRD 14.3 / 05.4 — Vertragsgespräch-Modal (design-system modal, design.md §4.3)
 */
import type { ContractOffer } from "../../transfers/contract-talks.ts";
import type { Player } from "../../types/player.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import { t } from "../../i18n/index.ts";
import { ContractTalksPanel } from "./ContractTalksPanel.tsx";
import { ModalShell } from "./primitives/ModalShell.tsx";

export function ContractTalksModal({
  player,
  season,
  offer,
  wageHeadroomWeekly,
  onChange,
  onSubmit,
  onCancel,
}: {
  player: Player;
  season: number;
  offer: ContractOffer;
  wageHeadroomWeekly?: number;
  onChange: (offer: ContractOffer) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <ModalShell
      variant="tc"
      ariaLabel={t("contract.talk.aria", { name: formatPlayerName(player) })}
      onClose={onCancel}
      title={
        <>
          <span className="tc-label">{t("contract.talk.eyebrow")}</span>
          <h2 className="tc-modal__title">{formatPlayerName(player)}</h2>
        </>
      }
    >
      <ContractTalksPanel
        player={player}
        season={season}
        offer={offer}
        wageHeadroomWeekly={wageHeadroomWeekly}
        onChange={onChange}
        onSubmit={onSubmit}
        onCancel={onCancel}
        inModal
      />
    </ModalShell>
  );
}
