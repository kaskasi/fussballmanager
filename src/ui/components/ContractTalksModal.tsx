/**
 * WIREFRAME: PRD 14.3 / 05.4 — Vertragsgespräch-Modal
 */
import type { ContractOffer } from "../../transfers/contract-talks.ts";
import type { Player } from "../../types/player.ts";
import { ContractTalksPanel } from "./ContractTalksPanel.tsx";

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
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <dialog
        className="negotiation-modal contract-talk-modal"
        open
        aria-labelledby="contract-talk-title"
        onClick={(event) => event.stopPropagation()}
      >
        <ContractTalksPanel
          player={player}
          season={season}
          offer={offer}
          wageHeadroomWeekly={wageHeadroomWeekly}
          onChange={onChange}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      </dialog>
    </div>
  );
}
