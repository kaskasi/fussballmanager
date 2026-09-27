import { useEffect, useMemo, useState } from "react";
import type { Player } from "../../types/player.ts";
import { formatPlayerName, roundStat } from "../../types/player-display.ts";
import { defaultYouthContract } from "../../player/youth-contract.ts";
import { estimateCa } from "../../transfers/market-value.ts";
import type { CoachIcon } from "../../youth/academy.ts";
import {
  actionIcon,
  actionLabel,
  allowedActions,
  inboxItemLabel,
  pendingInboxItems,
  type DecisionAction,
  type DecisionInboxItem,
  type YouthInboxState,
} from "../../youth/decision-inbox.ts";

/**
 * WIREFRAME: PRD 09.2 Screen 2b — Decision Inbox
 *
 * Queue (max 4) · player card · icon actions per PRD 03.4.
 */

export function DecisionInboxModal({
  inbox,
  players,
  onDecision,
  onClose,
  initialItemId = null,
}: {
  inbox: YouthInboxState;
  players: Player[];
  onDecision: (itemId: string, action: DecisionAction) => void;
  onClose: () => void;
  initialItemId?: string | null;
}) {
  const pending = useMemo(() => pendingInboxItems(inbox), [inbox]);
  const [activeId, setActiveId] = useState<string | null>(initialItemId ?? pending[0]?.id ?? null);

  useEffect(() => {
    if (initialItemId && pending.some((item) => item.id === initialItemId)) {
      setActiveId(initialItemId);
    }
  }, [initialItemId, pending]);

  useEffect(() => {
    if (!pending.some((item) => item.id === activeId)) {
      setActiveId(pending[0]?.id ?? null);
    }
  }, [pending, activeId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const active = pending.find((item) => item.id === activeId) ?? pending[0] ?? null;
  const player = active ? players.find((entry) => entry.id === active.playerId) : null;
  const coachIcon = active ? inbox.coachIcons[active.playerId] : undefined;

  return (
    <div className="inbox-backdrop" onClick={onClose} role="presentation">
      <div
        className="inbox-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Entscheidungs-Inbox"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="inbox-head">
          <div>
            <p className="eyebrow">Jugend · Woche {inbox.week}</p>
            <h2>Entscheidungs-Inbox</h2>
          </div>
          <button type="button" className="inbox-close" onClick={onClose} aria-label="Schließen">
            ✕
          </button>
        </header>

        {inbox.queue.length > 0 ? (
          <p className="inbox-queue-note">
            📥 {inbox.queue.length} weitere Hinweise in der Warteschlange · 1 pro Tag
          </p>
        ) : null}

        {pending.length === 0 ? (
          <p className="inbox-empty">Keine offenen Entscheidungen diese Woche.</p>
        ) : (
          <>
            <nav className="inbox-queue" aria-label="Warteschlange">
              {pending.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === active?.id ? "inbox-queue-item is-active" : "inbox-queue-item"}
                  onClick={() => setActiveId(item.id)}
                >
                  <span className="inbox-queue-index">{index + 1}</span>
                  <span>{item.kind === "departure_risk" ? "🚩" : "⚠️"}</span>
                </button>
              ))}
            </nav>

            {active && player ? (
              <section className="inbox-card">
                <div className="inbox-player">
                  <span className="inbox-portrait" aria-hidden="true">{positionGlyph(player.position)}</span>
                  <div>
                    <strong>{formatPlayerName(player)}</strong>
                    <p>
                      {player.position} · {player.age} J. · CA {roundStat(estimateCa(player.attributes, player.position))}
                    </p>
                    <p className="inbox-reason">
                      {itemKindIcon(active.kind)} {inboxItemLabel(active)}
                      {coachIcon ? <span className="inbox-coach"> · Coach {coachIcon}</span> : null}
                    </p>
                  </div>
                </div>

                {active.kind === "contract_offer" || active.reason === "no_contract" ? (
                  <p className="inbox-contract-hint">
                    ✍️ Angebot: € {defaultYouthContract(player.age, 1).wage_weekly}/Woche · Moral + bei Unterschrift
                  </p>
                ) : null}

                <div className="inbox-actions" aria-label="Aktionen">
                  {allowedActions(active).map((action) => (
                    <button
                      key={action}
                      type="button"
                      className="inbox-action"
                      onClick={() => onDecision(active.id, action)}
                    >
                      <span aria-hidden="true">{actionIcon(action)}</span>
                      <span>{actionLabel(action)}</span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function itemKindIcon(kind: DecisionInboxItem["kind"]): string {
  if (kind === "departure_risk") return "🚩";
  if (kind === "promotion") return "⬆️";
  if (kind === "contract_offer") return "✍️";
  return "💪";
}

function positionGlyph(position: Player["position"]): string {
  if (position === "GK") return "🧤";
  if (position === "CB" || position === "LB" || position === "RB") return "🛡️";
  if (position === "CF") return "⚽";
  return "👟";
}

export function coachIconForPlayer(inbox: YouthInboxState, playerId: string): CoachIcon {
  return inbox.coachIcons[playerId] ?? "➡️";
}

export function hasDepartureRisk(inbox: YouthInboxState, playerId: string): boolean {
  return pendingInboxItems(inbox).some(
    (item) => item.playerId === playerId && item.kind === "departure_risk",
  );
}
