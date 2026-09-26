import type { Player } from "../../types/player.ts";
import { formatPlayerName } from "../../types/player-display.ts";
import { scoutReportsForWeek, type ScoutBoard } from "../../scouting/scout-board.ts";
import {
  inboxItemLabel,
  pendingInboxItems,
  type YouthInboxState,
} from "../../youth/decision-inbox.ts";

/**
 * WIREFRAME: PRD 09.2 — Hub Inbox (decisions + scout reports)
 * ┌────────────────────────────────────────────────────────┐
 * │ 📥 Inbox · KW 12                                       │
 * ├──────────────────────┬─────────────────────────────────┤
 * │ 🚩 Entscheidungen    │ 👁️ Scout-Berichte               │
 * │ K. Müller · Vertrag  │ L. Santos · CA ~74 · ✅         │
 * └──────────────────────┴─────────────────────────────────┘
 */

export function HubInboxPanel({
  week,
  players,
  youthInbox,
  scoutBoard,
  onOpenDecision,
  onSelectScoutTarget,
}: {
  week: number;
  players: readonly Player[];
  youthInbox: YouthInboxState;
  scoutBoard: ScoutBoard;
  onOpenDecision: (itemId: string) => void;
  onSelectScoutTarget: (playerId: string) => void;
}) {
  const decisions = pendingInboxItems(youthInbox);
  const reports = scoutReportsForWeek(scoutBoard, week);

  return (
    <section className="hub-inbox" aria-label="Inbox">
      <header className="hub-inbox-head">
        <h3>📥 Inbox</h3>
        <p className="hub-inbox-meta">
          {decisions.length} Entscheidung{decisions.length === 1 ? "" : "en"}
          {" · "}
          {reports.length} Scout-Bericht{reports.length === 1 ? "" : "e"}
        </p>
      </header>

      <div className="hub-inbox-columns">
        <div className="hub-inbox-column">
          <p className="hub-inbox-column-title">Entscheidungen</p>
          {decisions.length === 0 ? (
            <p className="hub-inbox-empty">Keine offenen Jugend-Entscheidungen.</p>
          ) : (
            <ul className="hub-inbox-list">
              {decisions.map((item) => {
                const player = players.find((entry) => entry.id === item.playerId);
                if (!player) return null;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="hub-inbox-row"
                      onClick={() => onOpenDecision(item.id)}
                    >
                      <span className="hub-inbox-icon" aria-hidden="true">
                        {item.kind === "departure_risk" ? "🚩" : item.kind === "contract_offer" ? "✍️" : "⚠️"}
                      </span>
                      <span className="hub-inbox-row-body">
                        <strong>{formatPlayerName(player)}</strong>
                        <span>{inboxItemLabel(item)}</span>
                      </span>
                      <span className="hub-inbox-row-cta">→</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="hub-inbox-column">
          <p className="hub-inbox-column-title">Scout-Berichte</p>
          {reports.length === 0 ? (
            <p className="hub-inbox-empty">
              Noch keine Berichte diese Woche — Scout im Markt zuweisen und Woche simulieren.
            </p>
          ) : (
            <ul className="hub-inbox-list">
              {reports.map((report) => (
                <li key={report.id}>
                  <button
                    type="button"
                    className="hub-inbox-row"
                    onClick={() => onSelectScoutTarget(report.playerId)}
                  >
                    <span className="hub-inbox-icon" aria-hidden="true">👁️</span>
                    <span className="hub-inbox-row-body">
                      <strong>{report.playerName}</strong>
                      <span>
                        {report.position} · CA ~{report.estimatedCa} · {report.confidence}
                        {report.uncertaintyDelta < 0 ? " · schärfer" : ""}
                      </span>
                    </span>
                    <span className="hub-inbox-row-cta">→</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {youthInbox.overflowDropped > 0 ? (
        <p className="hub-inbox-overflow">
          ⚠️ {youthInbox.overflowDropped} weitere Jugend-Hinweise warten auf eine spätere Woche.
        </p>
      ) : null}
    </section>
  );
}
