/** WIREFRAME: PRD 03.6 — camp purchase headline reveal */
import type { Player } from "../../types/player.ts";
import { estimateCa } from "../../transfers/market-value.ts";
import { campDebutHookKey, campDebutRegionLabel } from "../../youth/camp-opening-debut.ts";
import { campNationById } from "../../youth/satellite-camps.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import { useT } from "../../i18n/react.ts";
import { ModalShell } from "./primitives/ModalShell.tsx";
import { PlayerPortrait } from "./PlayerPortrait.tsx";

export function CampOpeningDebutModal({
  campId,
  player,
  onClose,
  onViewPlayer,
}: {
  campId: string;
  player: Player;
  onClose: () => void;
  onViewPlayer?: () => void;
}) {
  const t = useT();
  const nation = campNationById(campId);
  const hookIndex = player.state.camp_debut_hook_index ?? 0;
  const hookKey = campDebutHookKey(campId, hookIndex);
  const ca = Math.round(estimateCa(player.attributes, player.position));
  const region = nation ? campDebutRegionLabel(nation) : campId;

  return (
    <ModalShell
      ariaLabel={t("youth.camp.debut.dialogLabel")}
      onClose={onClose}
      panelClassName="camp-debut-modal inbox-modal"
    >
      <div className="camp-debut-modal-inner">
        <p className="camp-debut-eyebrow">{t("youth.camp.debut.eyebrow")}</p>
        <h2 className="camp-debut-title">{t("youth.camp.debut.title", { region })}</h2>
        <div className="camp-debut-hero">
          <PlayerPortrait
            seed={player.portrait_seed}
            size="lg"
            variant="known"
            className="camp-debut-portrait"
          />
          <div className="camp-debut-hero-copy">
            <p className="camp-debut-name">{formatPlayerName(player)}</p>
            <p className="camp-debut-meta">
              {t("youth.camp.debut.lead", {
                position: player.position,
                ca,
              })}
            </p>
            <p className="camp-debut-hook">{t(hookKey)}</p>
            <p className="camp-debut-footnote">{t("youth.camp.debut.footnote")}</p>
          </div>
        </div>
        <div className="camp-debut-actions">
          {onViewPlayer ? (
            <button type="button" className="camp-debut-secondary" onClick={onViewPlayer}>
              {t("youth.camp.debut.viewProfile")}
            </button>
          ) : null}
          <button type="button" className="camp-debut-primary" onClick={onClose}>
            {t("youth.camp.debut.continue")}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
