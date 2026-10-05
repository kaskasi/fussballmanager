import { useEffect } from "react";
import type { Player } from "../../types/player.ts";
import { coachIconLabel, type CoachIcon } from "../../youth/academy.ts";
import {
  pendingInboxItems,
  type DecisionAction,
  type YouthInboxState,
} from "../../youth/decision-inbox.ts";
import { t } from "../../i18n/index.ts";
import { useT } from "../../i18n/react.ts";
import type { StoryCast } from "../../narrative/story-state.ts";
import { DecisionInboxPanel } from "./DecisionInboxPanel.tsx";

/**
 * WIREFRAME: docs/prd/design.md §9.4 — Postfach (Hub / Modal)
 */
export function DecisionInboxModal({
  inbox,
  players,
  clubId,
  season,
  week,
  onDecision,
  onClose,
  initialItemId = null,
  storyCast,
}: {
  inbox: YouthInboxState;
  players: Player[];
  clubId: string;
  season: number;
  week: number;
  onDecision: (itemId: string, action: DecisionAction) => void;
  onClose: () => void;
  initialItemId?: string | null;
  storyCast: StoryCast;
}) {
  useT();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="inbox-backdrop" onClick={onClose} role="presentation">
      <div
        className="inbox-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("inbox.modal.aria")}
        onClick={(event) => event.stopPropagation()}
      >
        <DecisionInboxPanel
          inbox={inbox}
          players={players}
          clubId={clubId}
          season={season}
          week={week}
          onDecision={onDecision}
          storyCast={storyCast}
          initialItemId={initialItemId}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

export function coachIconForPlayer(inbox: YouthInboxState, playerId: string): CoachIcon {
  return inbox.coachIcons[playerId] ?? "➡️";
}

export function hasDepartureRisk(
  inbox: YouthInboxState,
  playerId: string,
  players?: readonly Player[],
): boolean {
  return pendingInboxItems(inbox, players).some(
    (item) => item.playerId === playerId && item.kind === "departure_risk",
  );
}

// Re-export for callers that used coachIconLabel via this module
export { coachIconLabel };
